"use client";

/**
 * DELIVER · Client Onboarding.
 *
 * The bridge between a won deal and an active client. Onboarding starts from
 * a won opportunity (contact, company and offer carry over — nothing is
 * re-typed), runs on a reusable template, and tracks tasks across five
 * phases: Welcome → Information → Kickoff → Setup → First milestone.
 * Completing onboarding promotes the record to an Active Client in RETAIN.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Plus,
  Rocket,
  Settings2,
  Trash2,
} from "lucide-react";
import { uid } from "@/cgs-demo/lib/stages";
import { useStore } from "@/cgs-demo/lib/store";
import { wasJustBlocked } from "@/cgs-demo/lib/demo-guard";
import {
  BuildContext,
  Opportunity,
  buildContext,
  daysFromToday,
  formatCalendarDate,
  isCalendarDate,
  relativeDue,
  todayISO,
} from "@/cgs-demo/lib/workflow";
import {
  ONBOARDING_PHASES,
  ONBOARDING_PHASE_LABEL,
  Onboarding,
  OnboardingPhase,
  OnboardingTask,
  OnboardingTemplate,
  TemplateTask,
  deliveryOfferLine,
  newOnboarding,
  newOnboardingTask,
  onboardingFromOpportunity,
  onboardingProgress,
  tasksFromTemplate,
  validateOnboardingTemplate,
} from "@/cgs-demo/lib/delivery";
import { Button, formatWhen } from "@/cgs-demo/components/ui";
import {
  DateField,
  Drawer,
  EmptyState,
  Pill,
  SearchInput,
  Select,
  TableShell,
  TextAreaLite,
  TextFieldLite,
  tdCls,
  thCls,
} from "@/cgs-demo/components/data";

/* --------------------------------- pills ---------------------------------- */

function PhasePill({ phase }: { phase: OnboardingPhase }) {
  return <Pill tone="accent">{ONBOARDING_PHASE_LABEL[phase]}</Pill>;
}

function ProgressLine({ ob }: { ob: Onboarding }) {
  const p = onboardingProgress(ob);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full border border-cgs-line bg-cgs-inset" aria-hidden>
        <div className={`h-full rounded-full ${p.percent === 100 ? "bg-cgs-complete" : "bg-cgs-accent"}`} style={{ width: `${p.percent}%` }} />
      </div>
      <span className="text-[11.5px] tabular-nums text-cgs-muted">
        {p.done}/{p.total}
      </span>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const { s3, s2, data, addOnboarding, completeOnboarding } = useStore();
  const ctx = useMemo(() => buildContext(data), [data]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepId = searchParams.get("id");
  const fromOppId = searchParams.get("opportunity");

  const [openId, setOpenId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "archived">("active");
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const say = (m: string) => {
    if (wasJustBlocked()) return;
    setFlash(m);
    setTimeout(() => setFlash(null), 3000);
  };

  /* Won deals from SELL that have not been picked up yet — the handoff queue. */
  const wonWaiting = useMemo(
    () =>
      s2.opportunities.filter(
        (o) =>
          o.outcome === "won" &&
          !s3.onboardings.some((ob) => ob.opportunityId === o.id),
      ),
    [s2.opportunities, s3.onboardings],
  );

  const effectiveOpenId =
    openId ?? (deepId && !dismissed && s3.onboardings.some((o) => o.id === deepId) ? deepId : null);
  const closeDrawer = () => {
    setOpenId(null);
    setDismissed(true);
    if (fromOppId) router.replace(dHref("/deliver/onboarding"));
  };
  const active = effectiveOpenId ? s3.onboardings.find((o) => o.id === effectiveOpenId) ?? null : null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return s3.onboardings
      .filter((o) => {
        if (statusFilter !== "all" && o.status !== statusFilter) return false;
        if (q && !`${o.company} ${o.contact} ${o.templateName}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, [s3.onboardings, statusFilter, query]);

  const startFromWon = (o: Opportunity) => {
    const tpl = s3.templates[0];
    if (!tpl) return;
    const ob = onboardingFromOpportunity(o, ctx, tpl);
    addOnboarding(ob, `Onboarding started from won deal: ${o.company || o.prospect}.`);
    setCreating(false);
    setOpenId(ob.id);
    say(`Welcome — onboarding for ${o.company || o.prospect} created from the won opportunity.`);
  };

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-7 md:px-9">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
            <span>Deliver</span>
            <span aria-hidden>·</span>
            <span>Onboarding</span>
          </div>
          <h2 className="mt-1 flex items-center gap-2 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">
            <ClipboardList size={20} className="text-cgs-accent" aria-hidden />
            Client Onboarding
          </h2>
          <p className="mt-1 text-[13px] text-cgs-muted">
            {`${s3.onboardings.filter((o) => o.status === "active").length} in progress · ${s3.onboardings.filter((o) => o.status === "completed").length} completed to clients`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setTemplatesOpen(true)}>
            <Settings2 size={14} aria-hidden /> Templates
          </Button>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={14} aria-hidden /> New onboarding
          </Button>
        </div>
      </div>

      {/* Won deals waiting for the handoff */}
      {wonWaiting.length > 0 && statusFilter === "active" && (
        <section aria-label="Won opportunities ready for onboarding" className="mt-5 rounded-xl border border-cgs-accent/35 bg-cgs-accent-faint/70 p-4">
          <h3 className="flex items-center gap-2 text-[13px] font-semibold text-cgs-ink">
            <Rocket size={14} className="text-cgs-accent" aria-hidden />
            Won in SELL, not yet started
          </h3>
          <p className="mt-0.5 text-[12.5px] text-cgs-ink-soft">
            These closed as won. Starting from one carries the contact, company and offer across — no re-entry.
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {wonWaiting.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-cgs-line bg-cgs-surface px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-cgs-ink">{o.company || o.prospect}</span>
                  <span className="block truncate text-[12px] text-cgs-muted">
                    {o.prospect} · won {o.closedAt ? formatWhen(o.closedAt) : "recently"}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={dHref(`/sell/opportunities?id=${o.id}`)} className="text-[12px] text-cgs-muted underline-offset-2 hover:text-cgs-ink hover:underline">
                    deal
                  </Link>
                  <Button size="sm" variant="primary" onClick={() => startFromWon(o)}>
                    Start onboarding
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search client…" className="sm:max-w-56" />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: "active", label: "In progress" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All" },
          ]}
        />
        <span className="ml-auto text-[12px] tabular-nums text-cgs-muted">{visible.length} shown</span>
      </div>

      {/* List */}
      <div className="mt-4">
        {s3.onboardings.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={26} aria-hidden />}
            title="No onboarding yet"
            body={
              wonWaiting.length > 0
                ? "A won opportunity is above, ready to start. Onboarding runs the Welcome → Information → Kickoff → Setup → First milestone path before a client goes active."
                : "When a deal closes as won in SELL, start its onboarding here. You can also onboard a client you acquired outside the system."
            }
            action={
              <div className="flex items-center gap-2">
                {wonWaiting.length > 0 ? (
                  <Button variant="primary" onClick={() => startFromWon(wonWaiting[0]!)}>
                    Start onboarding for {wonWaiting[0]!.company || wonWaiting[0]!.prospect}
                  </Button>
                ) : (
                  <>
                    <Link href={dHref("/sell/opportunities")}><Button variant="secondary">Sales opportunities</Button></Link>
                    <Button variant="primary" onClick={() => setCreating(true)}>New onboarding</Button>
                  </>
                )}
              </div>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Check size={26} aria-hidden />}
            title={statusFilter === "active" ? "Nothing in progress" : "No records in this view"}
            body={query ? "No onboarding matches this search." : "Completed onboardings become active clients in RETAIN."}
          />
        ) : (
          <TableShell>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cgs-line">
                  <th scope="col" className={thCls}>Client</th>
                  <th scope="col" className={thCls}>Template</th>
                  <th scope="col" className={thCls}>Current phase</th>
                  <th scope="col" className={thCls}>Progress</th>
                  <th scope="col" className={thCls}>Started</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((ob) => {
                  const p = onboardingProgress(ob);
                  const overdue =
                    ob.status === "active" &&
                    ob.tasks.some(
                      (t) =>
                        t.status === "pending" &&
                        isCalendarDate(t.dueDate) &&
                        daysFromToday(t.dueDate!, new Date()) < 0,
                    );
                  return (
                    <tr
                      key={ob.id}
                      tabIndex={0}
                      onClick={() => setOpenId(ob.id)}
                      onKeyDown={(e) => e.key === "Enter" && setOpenId(ob.id)}
                      aria-label={`Open onboarding for ${ob.company}`}
                      className="cursor-pointer border-b border-cgs-line/60 transition-colors last:border-0 hover:bg-cgs-inset/50 focus-visible:bg-cgs-inset/50"
                    >
                      <td className={tdCls}>
                        <span className="block truncate font-medium text-cgs-ink">{ob.company || ob.contact}</span>
                        <span className="block truncate text-[11.5px] text-cgs-faint">{ob.contact}</span>
                      </td>
                      <td className={`${tdCls} max-w-[160px]`}><span className="block truncate text-[12.5px]">{ob.templateName}</span></td>
                      <td className={tdCls}>
                        {ob.status === "completed" ? (
                          <Pill tone="complete">Completed</Pill>
                        ) : ob.status === "archived" ? (
                          <Pill>Archived</Pill>
                        ) : p.currentPhase ? (
                          <span className="flex items-center gap-1.5">
                            <PhasePill phase={p.currentPhase} />
                            {overdue && <Pill tone="danger">overdue</Pill>}
                          </span>
                        ) : (
                          <Pill tone="refine">no tasks</Pill>
                        )}
                      </td>
                      <td className={tdCls}><ProgressLine ob={ob} /></td>
                      <td className={`${tdCls} whitespace-nowrap text-[12px] text-cgs-muted`}>{formatCalendarDate(ob.startedAt.slice(0, 10))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        )}
      </div>

      {flash && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-cgs-ink px-3.5 py-1.5 text-[12.5px] font-medium text-cgs-canvas shadow-cgs-pop" role="status">
          {flash}
        </div>
      )}

      {/* Clients already active, for orientation */}
      {s3.clients.length > 0 && (
        <p className="mt-4 text-[12.5px] text-cgs-muted">
          {s3.clients.filter((c) => c.status === "active").length} active clients run delivery work in the{" "}
          <Link href={dHref("/retain/clients")} className="font-medium text-cgs-accent underline-offset-2 hover:underline">
            Active Clients workspace →
          </Link>
        </p>
      )}

      <NewOnboardingDrawer
        open={creating || (!!fromOppId && wonWaiting.some((o) => o.id === fromOppId))}
        wonDeals={wonWaiting}
        initialOppId={fromOppId}
        onClose={() => {
          setCreating(false);
          if (fromOppId) router.replace(dHref("/deliver/onboarding"));
        }}
        onStart={(ob) => {
          addOnboarding(ob);
          setCreating(false);
          setOpenId(ob.id);
          say("Onboarding started.");
        }}
      />

      {active && (
        <OnboardingWorkspace
          ob={active}
          ctx={ctx}
          onClose={closeDrawer}
          onComplete={() => {
            const client = completeOnboarding(active.id);
            if (client) {
              closeDrawer();
              say(`${client.company || client.contact} is now an active client.`);
              router.push(dHref(`/retain/clients?id=${client.id}`));
            }
          }}
        />
      )}

      <TemplatesDrawer open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </div>
  );
}

/* ---------------------------- new onboarding ------------------------------ */

function NewOnboardingDrawer({
  open,
  wonDeals,
  initialOppId,
  onClose,
  onStart,
}: {
  open: boolean;
  wonDeals: Opportunity[];
  initialOppId: string | null;
  onClose: () => void;
  onStart: (ob: Onboarding) => void;
}) {
  const { s3, data } = useStore();
  const ctx = useMemo(() => buildContext(data), [data]);
  const seed = initialOppId && wonDeals.some((o) => o.id === initialOppId) ? wonDeals.find((o) => o.id === initialOppId) : null;
  const [oppId, setOppId] = useState<string>(seed ? initialOppId! : "");
  const [contact, setContact] = useState(seed?.prospect ?? "");
  const [company, setCompany] = useState(seed?.company ?? "");
  const [templateId, setTemplateId] = useState(s3.templates[0]?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;
  const tpl = s3.templates.find((t) => t.id === templateId) ?? null;

  const submit = () => {
    const e: Record<string, string> = {};
    if (!contact.trim() && !company.trim()) e.company = "Enter the client’s company or contact.";
    if (!tpl) e.template = "Pick an onboarding template.";
    setErrors(e);
    if (Object.keys(e).length || !tpl) return;
    const source = oppId ? wonDeals.find((o) => o.id === oppId) : null;
    if (source) {
      onStart(onboardingFromOpportunity({ ...source, prospect: contact.trim() || source.prospect, company: company.trim() || source.company }, ctx, tpl));
      return;
    }
    const ob = newOnboarding({
      contact: contact.trim(),
      company: company.trim(),
      templateId: tpl.id,
      templateName: tpl.name,
      tasks: tasksFromTemplate(tpl),
      useCurrentOffer: ctx.hasOffer,
    });
    onStart(ob);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New client onboarding"
      subtitle="Start from a won deal so nothing is re-entered, or onboard a client directly."
      width="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={submit}>Start onboarding</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {wonDeals.length > 0 && (
          <div>
            <label htmlFor="ob-from-opp" className="mb-1 block text-[12px] font-medium text-cgs-ink">
              From won opportunity <span className="text-cgs-faint">(recommended — carries deal context)</span>
            </label>
            <select
              id="ob-from-opp"
              value={oppId}
              onChange={(e) => {
                const id = e.target.value;
                setOppId(id);
                const o = wonDeals.find((x) => x.id === id);
                if (o) {
                  setContact(o.prospect);
                  setCompany(o.company);
                }
              }}
              className="w-full cursor-pointer rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink focus:border-cgs-accent"
            >
              <option value="">Not from a deal</option>
              {wonDeals.map((o) => (
                <option key={o.id} value={o.id}>{o.company || o.prospect} — {o.prospect}</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextFieldLite label="Client contact" value={contact} onChange={setContact} placeholder="e.g. Marta Lindqvist" />
          <TextFieldLite label="Company" required value={company} onChange={setCompany} placeholder="e.g. Nordwell Retail" error={errors.company} />
        </div>
        <div>
          <span className="mb-1 block text-[12px] font-medium text-cgs-ink">Template</span>
          <div className="space-y-1.5" role="radiogroup" aria-label="Onboarding template">
            {s3.templates.map((t) => (
              <label
                key={t.id}
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                  templateId === t.id ? "border-cgs-accent bg-cgs-accent-faint" : "border-cgs-line-strong bg-cgs-raised hover:border-cgs-faint"
                }`}
              >
                <input
                  type="radio"
                  name="ob-template"
                  checked={templateId === t.id}
                  onChange={() => setTemplateId(t.id)}
                  className="mt-1 accent-[#a5522a]"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-cgs-ink">{t.name}</span>
                  <span className="block text-[12px] text-cgs-muted">{t.description} · {t.tasks.length} tasks</span>
                </span>
              </label>
            ))}
            {s3.templates.length === 0 && (
              <p className="text-[12.5px] text-cgs-refine">No templates exist — create one under Templates first.</p>
            )}
          </div>
          {errors.template && <p className="mt-1 text-[11.5px] text-cgs-danger" role="alert">{errors.template}</p>}
        </div>
        {tpl && (
          <p className="rounded-lg bg-cgs-inset/60 px-3 py-2 text-[12px] leading-relaxed text-cgs-muted">
            Tasks start with due dates counted from today. You can re-date, add, or skip any of them.
          </p>
        )}
      </div>
    </Drawer>
  );
}

/* --------------------------- workspace drawer ------------------------------ */

function OnboardingWorkspace({
  ob,
  ctx,
  onClose,
  onComplete,
}: {
  ob: Onboarding;
  ctx: BuildContext;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { s3, updateOnboarding, setOnboardingTaskStatus, updateOnboardingTask, addOnboardingTask, removeOnboardingTask, archiveOnboarding } = useStore();
  const p = onboardingProgress(ob);
  const [notesDraft, setNotesDraft] = useState(ob.notes);
  const [adding, setAdding] = useState(false);
  const client = ob.clientId ? s3.clients.find((c) => c.id === ob.clientId) ?? null : null;

  // Notes persist automatically on close — an accidental dismissal should
  // never lose typed context.
  const closeAndSave = () => {
    if (notesDraft !== ob.notes && ob.status === "active") updateOnboarding(ob.id, { notes: notesDraft });
    onClose();
  };

  return (
    <Drawer
      open
      onClose={closeAndSave}
      width="max-w-2xl"
      title={
        <span className="flex items-center gap-2">
          {ob.company || ob.contact}
          {ob.status === "active" ? <PhasePill phase={p.currentPhase ?? "welcome"} /> : ob.status === "completed" ? <Pill tone="complete">Completed</Pill> : <Pill>Archived</Pill>}
        </span>
      }
      subtitle={`${ob.contact}${ob.contact ? " · " : ""}${deliveryOfferLine(ob, ctx)} · ${ob.templateName}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={() => { archiveOnboarding(ob.id); onClose(); }} className="text-cgs-muted">
            Archive
          </Button>
          <div className="flex items-center gap-2">
            {ob.status === "completed" && client && (
              <Link href={dHref(`/retain/clients?id=${client.id}`)}>
                <Button size="sm" variant="secondary">
                  Open client workspace <ArrowRight size={12} aria-hidden />
                </Button>
              </Link>
            )}
            {(p.canComplete || (ob.status === "completed" && !client)) && (
              <Button size="sm" variant="primary" onClick={onComplete}>
                <Check size={13} aria-hidden />
                {ob.status === "completed" && !client ? "Reactivate client" : "Complete & activate client"}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Progress header */}
        <section aria-label="Onboarding progress" className="rounded-xl border border-cgs-line bg-cgs-inset/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ProgressLine ob={ob} />
            <span className="text-[12px] text-cgs-muted">
              {ob.status === "active"
                ? p.remaining === 0 && p.total > 0
                  ? "All tasks settled — complete to activate the client."
                  : p.currentPhase
                    ? `Current phase: ${ONBOARDING_PHASE_LABEL[p.currentPhase]}`
                    : "No open tasks — add or complete the remaining work."
                : ob.status === "completed"
                  ? `Completed ${ob.completedAt ? formatWhen(ob.completedAt) : ""} · client is active in RETAIN`
                  : "Archived"}
            </span>
          </div>
          {/* Phase rail */}
          <ol className="mt-3 flex items-center gap-1" aria-label="Onboarding phases">
            {ONBOARDING_PHASES.map((ph, i) => {
              const open = ob.tasks.filter((t) => t.phase === ph && t.status === "pending").length;
              const total = ob.tasks.filter((t) => t.phase === ph).length;
              const done = total > 0 && open === 0;
              const current = ob.status === "active" && p.currentPhase === ph;
              return (
                <li key={ph} className="flex flex-1 flex-col items-center gap-1" aria-current={current ? "step" : undefined}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
                    done && ob.status !== "archived"
                      ? "border-[#cfdcc8] bg-cgs-complete-soft text-cgs-complete"
                      : current
                        ? "border-cgs-accent bg-cgs-accent text-[#fdf9f4]"
                        : "border-cgs-line-strong bg-cgs-raised text-cgs-faint"
                  }`}>
                    {done && ob.status !== "archived" ? "✓" : i + 1}
                  </span>
                  <span className={`text-center text-[10px] leading-tight ${current ? "font-medium text-cgs-accent-deep" : "text-cgs-faint"}`}>
                    {ONBOARDING_PHASE_LABEL[ph]}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Tasks by phase */}
        {ONBOARDING_PHASES.map((ph) => {
          const tasks = ob.tasks.filter((t) => t.phase === ph);
          if (tasks.length === 0) return null;
          return (
            <section key={ph} aria-label={`${ONBOARDING_PHASE_LABEL[ph]} tasks`}>
              <h3 className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">
                {ONBOARDING_PHASE_LABEL[ph]}
                <span className="tabular-nums text-cgs-muted">{tasks.filter((t) => t.status !== "pending").length}/{tasks.length}</span>
              </h3>
              <ul className="mt-2 space-y-1.5">
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} ob={ob} readOnly={ob.status !== "active"}
                    onStatus={(s) => setOnboardingTaskStatus(ob.id, t.id, s)}
                    onPatch={(patch) => updateOnboardingTask(ob.id, t.id, patch)}
                    onRemove={() => removeOnboardingTask(ob.id, t.id)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
        {ob.tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-cgs-line-strong px-3 py-3 text-[12.5px] text-cgs-faint">
            This onboarding has no tasks yet — add the first step below.
          </p>
        )}

        {ob.status === "active" && (
          <AddTaskInline
            adding={adding}
            setAdding={setAdding}
            onAdd={(t) => { addOnboardingTask(ob.id, t); setAdding(false); }}
          />
        )}

        {/* Notes */}
        <section aria-label="Client workspace notes">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Client workspace notes</h3>
          <div className="mt-1.5">
            <TextAreaLite label="" value={notesDraft} onChange={setNotesDraft} rows={3} placeholder="Access details, contacts, decisions made during onboarding — anything the next session needs." />
          </div>
          {notesDraft !== ob.notes && (
            <div className="mt-1 flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => { updateOnboarding(ob.id, { notes: notesDraft }); }}>Save notes</Button>
              <button type="button" onClick={() => setNotesDraft(ob.notes)} className="text-[11.5px] text-cgs-faint hover:text-cgs-ink">discard</button>
            </div>
          )}
        </section>
      </div>
    </Drawer>
  );
}

function TaskRow({
  task,
  ob,
  readOnly,
  onStatus,
  onPatch,
  onRemove,
}: {
  task: OnboardingTask;
  ob: Onboarding;
  readOnly: boolean;
  onStatus: (s: OnboardingTask["status"]) => void;
  onPatch: (patch: Partial<OnboardingTask>) => void;
  onRemove: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const overdue = task.status === "pending" && isCalendarDate(task.dueDate) && daysFromToday(task.dueDate!, new Date()) < 0;
  void ob;
  return (
    <li className={`group flex items-start gap-2.5 rounded-lg border px-3 py-2 ${
      task.status === "done" ? "border-[#cfdcc8] bg-cgs-complete-soft/40" : overdue ? "border-cgs-danger/30 bg-cgs-danger-soft/40" : "border-cgs-line bg-cgs-surface"
    }`}>
      <button
        type="button"
        onClick={() => onStatus(task.status === "done" ? "pending" : "done")}
        disabled={readOnly}
        aria-label={task.status === "done" ? `Mark pending: ${task.title}` : `Mark done: ${task.title}`}
        className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
          task.status === "done" ? "border-cgs-complete bg-cgs-complete text-[#f5f8f3]" : "border-cgs-line-strong bg-cgs-raised text-transparent hover:border-cgs-accent"
        } disabled:opacity-50`}
      >
        <Check size={11} aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        {editingTitle ? (
          <input
            autoFocus
            defaultValue={task.title}
            aria-label="Task title"
            onBlur={(e) => { onPatch({ title: e.target.value.trim() || task.title }); setEditingTitle(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingTitle(false); }}
            className="w-full rounded border border-cgs-accent bg-cgs-raised px-1.5 py-0.5 text-[13px] text-cgs-ink"
          />
        ) : (
          <button
            type="button"
            onClick={() => !readOnly && setEditingTitle(true)}
            className={`block w-full text-left text-[13px] font-medium ${task.status === "done" ? "text-cgs-muted line-through" : "text-cgs-ink"}`}
            aria-label={`Edit task ${task.title}`}
          >
            {task.title || "Untitled task"}
          </button>
        )}
        {task.detail && <p className="mt-0.5 text-[12px] leading-snug text-cgs-muted">{task.detail}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={task.dueDate ?? ""}
            disabled={readOnly}
            onChange={(e) => onPatch({ dueDate: e.target.value || null })}
            aria-label={`Due date for ${task.title}`}
            className={`h-6.5 rounded border bg-cgs-raised px-1.5 text-[11.5px] ${overdue ? "border-cgs-danger/50 text-cgs-danger font-medium" : "border-cgs-line-strong text-cgs-muted"} focus:border-cgs-accent disabled:opacity-50`}
          />
          {task.dueDate && (
            <span className={`text-[11px] ${overdue ? "font-medium text-cgs-danger" : "text-cgs-faint"}`}>{relativeDue(task.dueDate)}</span>
          )}
          {task.status === "pending" && !readOnly && (
            <button
              type="button"
              onClick={() => onStatus("skipped")}
              className="text-[11px] text-cgs-faint underline-offset-2 hover:text-cgs-ink hover:underline"
            >
              skip
            </button>
          )}
          {task.status === "skipped" && !readOnly && (
            <button
              type="button"
              onClick={() => onStatus("pending")}
              className="text-[11px] text-cgs-accent underline-offset-2 hover:underline"
            >
              un-skip
            </button>
          )}
          {task.status === "skipped" && <Pill tone="neutral">skipped</Pill>}
        </div>
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove task ${task.title}`}
          className="shrink-0 rounded-md p-1 text-transparent transition group-hover:text-cgs-faint hover:!text-cgs-danger hover:bg-cgs-danger-soft focus-visible:text-cgs-faint"
        >
          <Trash2 size={11} aria-hidden />
        </button>
      )}
    </li>
  );
}

function AddTaskInline({
  adding,
  setAdding,
  onAdd,
}: {
  adding: boolean;
  setAdding: (v: boolean) => void;
  onAdd: (t: OnboardingTask) => void;
}) {
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<OnboardingPhase>("setup");
  const [due, setDue] = useState<string | null>(todayISO());
  const save = () => {
    if (!title.trim()) return;
    onAdd(newOnboardingTask({ title: title.trim(), phase, dueDate: due }));
    setTitle("");
  };
  if (!adding)
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-cgs-accent transition-colors hover:bg-cgs-accent-faint hover:text-cgs-accent-deep"
      >
        <Plus size={11} aria-hidden /> Add a task
      </button>
    );
  return (
    <div className="rounded-xl border border-cgs-accent/35 bg-cgs-accent-faint/60 p-3">
      <div className="grid gap-2.5 sm:grid-cols-[1fr_150px_150px_auto] sm:items-end">
        <TextFieldLite label="Task" value={title} onChange={setTitle} placeholder="e.g. Get access to their analytics" />
        <label className="space-y-1">
          <span className="block text-[12px] font-medium text-cgs-ink">Phase</span>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value as OnboardingPhase)}
            aria-label="Task phase"
            className="h-8 w-full cursor-pointer rounded-lg border border-cgs-line-strong bg-cgs-raised px-2 text-[13px] text-cgs-ink focus:border-cgs-accent"
          >
            {ONBOARDING_PHASES.map((ph) => (
              <option key={ph} value={ph}>{ONBOARDING_PHASE_LABEL[ph]}</option>
            ))}
          </select>
        </label>
        <DateField label="Due" value={due} onChange={setDue} allowClear />
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={save} disabled={!title.trim()}>Add</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- templates drawer ----------------------------- */

function TemplatesDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s3, saveTemplate, removeTemplate } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  // The draft lives here so the footer can validate and commit it directly.
  const [draft, setDraft] = useState<OnboardingTemplate | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!open) return null;

  const startEdit = (t: OnboardingTemplate) => {
    setDraft(structuredClone(t));
    setErrors({});
    setEditingId(t.id);
  };
  const stopEdit = () => {
    setEditingId(null);
    setDraft(null);
    setErrors({});
  };

  return (
    <Drawer
      open={open}
      onClose={editingId ? stopEdit : onClose}
      title={draft ? `Template — ${draft.name || "Untitled"}` : "Onboarding templates"}
      subtitle={draft ? "Tasks, phases and default offsets. Instances already started are not affected." : "Reusable task lists counted from the onboarding start date."}
      width="max-w-2xl"
      footer={
        draft ? (
          <div className="flex items-center justify-between gap-3">
            {errors.name || errors.tasks ? (
              <p className="text-[12px] text-cgs-danger" role="alert">{errors.name ?? errors.tasks}</p>
            ) : (
              <p className="text-[12px] text-cgs-faint">Saving updates the template only — running onboardings keep their own task list.</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={stopEdit}>Cancel</Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const e = validateOnboardingTemplate(draft);
                  setErrors(e);
                  if (Object.keys(e).length) return;
                  saveTemplate(draft);
                  stopEdit();
                }}
              >
                Save template
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                const t: OnboardingTemplate = {
                  id: `tpl-${uid()}`,
                  name: "Untitled template",
                  description: "",
                  builtIn: false,
                  tasks: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                saveTemplate(t);
                startEdit(t);
              }}
            >
              <Plus size={13} aria-hidden /> New template
            </Button>
          </div>
        )
      }
    >
      {draft ? (
        <TemplateEditor draft={draft} onChange={setDraft} />
      ) : (
        <ul className="space-y-2.5">
          {s3.templates.map((t) => (
            <li key={t.id} className="rounded-xl border border-cgs-line bg-cgs-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-semibold text-cgs-ink">
                    {t.name} {t.builtIn && <Pill tone="neutral">built-in</Pill>}
                  </h3>
                  {t.description && <p className="mt-0.5 text-[12px] text-cgs-muted">{t.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>Edit</Button>
                  {!t.builtIn && (
                    <button
                      type="button"
                      onClick={() => removeTemplate(t.id)}
                      aria-label={`Delete template ${t.name}`}
                      className="rounded-md p-1.5 text-cgs-faint hover:bg-cgs-danger-soft hover:text-cgs-danger"
                    >
                      <Trash2 size={12} aria-hidden />
                    </button>
                  )}
                </div>
              </div>
              <ol className="mt-2 space-y-1">
                {t.tasks.map((tt, i) => (
                  <li key={tt.id} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="min-w-0 truncate text-cgs-ink-soft">
                      <span className="mr-1.5 text-[10.5px] tabular-nums text-cgs-faint">{i + 1}</span>
                      <span className="mr-1.5 rounded bg-cgs-inset px-1 py-px text-[10px] text-cgs-muted">{ONBOARDING_PHASE_LABEL[tt.phase]}</span>
                      {tt.title}
                    </span>
                    <span className="shrink-0 tabular-nums text-cgs-faint">{tt.defaultOffsetDays != null ? `day ${tt.defaultOffsetDays}` : "no date"}</span>
                  </li>
                ))}
                {t.tasks.length === 0 && <li className="text-[12.5px] text-cgs-faint">No tasks — edit to add the first one.</li>}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

function TemplateEditor({ draft, onChange }: { draft: OnboardingTemplate; onChange: (t: OnboardingTemplate) => void }) {
  const patch = (p: Partial<OnboardingTemplate>) => onChange({ ...draft, ...p });
  const patchTask = (id: string, p: Partial<TemplateTask>) =>
    patch({ tasks: draft.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextFieldLite label="Name" required value={draft.name} onChange={(v) => patch({ name: v })} />
        <TextFieldLite label="Description" value={draft.description} onChange={(v) => patch({ description: v })} placeholder="One line — what kind of engagement this fits" />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[12px] font-medium text-cgs-ink">Tasks</span>
          <button
            type="button"
            onClick={() =>
              patch({
                tasks: [
                  ...draft.tasks,
                  { id: uid(), title: "", detail: "", phase: "welcome", defaultOffsetDays: draft.tasks.length + 1 },
                ],
              })
            }
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-cgs-accent hover:text-cgs-accent-deep"
          >
            <Plus size={11} aria-hidden /> Add task
          </button>
        </div>
        <ul className="space-y-2">
          {draft.tasks.map((t, i) => (
            <li key={t.id} className="rounded-lg border border-cgs-line bg-cgs-surface p-2.5">
              <div className="grid gap-2 sm:grid-cols-[24px_1fr_150px_110px_auto] sm:items-center">
                <span className="text-center text-[11px] tabular-nums text-cgs-faint">{i + 1}</span>
                <input
                  value={t.title}
                  onChange={(e) => patchTask(t.id, { title: e.target.value })}
                  placeholder="Task title"
                  aria-label={`Template task ${i + 1} title`}
                  className="w-full rounded border border-cgs-line-strong bg-cgs-raised px-2 py-1 text-[13px] text-cgs-ink focus:border-cgs-accent"
                />
                <select
                  value={t.phase}
                  onChange={(e) => patchTask(t.id, { phase: e.target.value as OnboardingPhase })}
                  aria-label={`Phase for task ${i + 1}`}
                  className="h-7.5 cursor-pointer rounded border border-cgs-line-strong bg-cgs-raised px-1.5 text-[12px] text-cgs-ink focus:border-cgs-accent"
                >
                  {ONBOARDING_PHASES.map((ph) => (
                    <option key={ph} value={ph}>{ONBOARDING_PHASE_LABEL[ph]}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-[11.5px] text-cgs-muted">
                  day
                  <input
                    type="number"
                    min={0}
                    value={t.defaultOffsetDays ?? ""}
                    onChange={(e) => patchTask(t.id, { defaultOffsetDays: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                    placeholder="—"
                    aria-label={`Due-day offset for task ${i + 1}`}
                    className="w-12 rounded border border-cgs-line-strong bg-cgs-raised px-1.5 py-0.5 text-[12px] tabular-nums text-cgs-ink focus:border-cgs-accent"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => patch({ tasks: draft.tasks.filter((x) => x.id !== t.id) })}
                  aria-label={`Remove template task ${t.title || i + 1}`}
                  className="justify-self-end rounded-md p-1 text-cgs-faint hover:bg-cgs-danger-soft hover:text-cgs-danger"
                >
                  <Trash2 size={11} aria-hidden />
                </button>
              </div>
            </li>
          ))}
          {draft.tasks.length === 0 && (
            <li className="rounded-lg border border-dashed border-cgs-line-strong px-3 py-2.5 text-[12.5px] text-cgs-faint">
              No tasks yet — a template needs at least one.
            </li>
          )}
        </ul>
      </div>
      <p className="text-[11.5px] text-cgs-faint">Changes stay local until “Save template”. “day” = days after the onboarding starts.</p>
    </div>
  );
}
