"use client";

/**
 * RETAIN · Active Clients.
 *
 * The relationship workspace: every client that left onboarding, with the
 * facts that matter for keeping them — offer, start date, satisfaction,
 * recent work, upcoming needs, renewal, expansion ideas and the next review
 * date. This is not a support queue; it is the book of relationships you are
 * responsible for.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  HeartHandshake,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useStore } from "@/cgs-demo/lib/store";
import { wasJustBlocked } from "@/cgs-demo/lib/demo-guard";
import {
  buildContext,
  daysFromToday,
  formatCalendarDate,
  isCalendarDate,
  relativeDue,
  todayISO,
} from "@/cgs-demo/lib/workflow";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABEL,
  Client,
  RetentionReview,
  clientReviewStatus,
  deliveryOfferLine,
  newClient,
  validateClient,
} from "@/cgs-demo/lib/delivery";
import { Pill } from "@/cgs-demo/components/data";
import {
  DateField,
  Drawer,
  EmptyState,
  SearchInput,
  Select,
  TableShell,
  TextAreaLite,
  TextFieldLite,
  tdCls,
  thCls,
} from "@/cgs-demo/components/data";
import { Button, formatWhen } from "@/cgs-demo/components/ui";

const STATUS_TONE: Record<Client["status"], "neutral" | "accent" | "complete" | "refine" | "danger"> = {
  active: "complete",
  "at-risk": "danger",
  paused: "refine",
  completed: "neutral",
  churned: "neutral",
};

const SATISFACTION_LABEL: Record<Client["satisfaction"], string> = {
  "": "—",
  great: "Great",
  good: "Good",
  mixed: "Mixed",
  "at-risk": "At risk",
};

function ReviewPill({ client, reviews }: { client: Client; reviews: RetentionReview[] }) {
  const st = clientReviewStatus(client, reviews);
  if (st === "overdue") return <Pill tone="danger" title={client.nextReviewDate ?? undefined}>Review overdue</Pill>;
  if (st === "due") return <Pill tone="refine">Review due today</Pill>;
  if (st === "scheduled") return <Pill tone="neutral">{`Review ${relativeDue(client.nextReviewDate)}`}</Pill>;
  if (st === "unscheduled") return <Pill tone="refine">No review date</Pill>;
  return null;
}

/* ---------------------------------- page ---------------------------------- */

export default function ClientsPage() {
  return (
    <Suspense fallback={null}>
      <ClientsInner />
    </Suspense>
  );
}

function ClientsInner() {
  const { s3, data } = useStore();
  const ctx = useMemo(() => buildContext(data), [data]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepId = searchParams.get("id");
  const fromOnboardingId = searchParams.get("onboarding");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Client["status"] | "all" | "live">("live");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const say = (m: string) => {
    if (wasJustBlocked()) return;
    setFlash(m);
    setTimeout(() => setFlash(null), 3000);
  };

  // Deep link from DELIVER ("?onboarding=") — the client was already created
  // by completing onboarding; this just focuses it. Falls back to list.
  const effectiveOpenId =
    openId ?? (deepId && !dismissed && s3.clients.some((c) => c.id === deepId) ? deepId : null);
  const closeDrawer = () => {
    setOpenId(null);
    setDismissed(true);
    if (fromOnboardingId || deepId) router.replace(dHref("/retain/clients"));
  };
  const active = effectiveOpenId ? s3.clients.find((c) => c.id === effectiveOpenId) ?? null : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return s3.clients
      .filter((c) => {
        if (statusFilter === "live" && !["active", "at-risk", "paused"].includes(c.status)) return false;
        if (statusFilter !== "all" && statusFilter !== "live" && c.status !== statusFilter) return false;
        if (q && !`${c.company} ${c.contact} ${c.offerRef} ${c.upcomingNeeds} ${c.recentWork}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.company.localeCompare(b.company));
  }, [s3.clients, query, statusFilter]);

  const live = s3.clients.filter((c) => c.status === "active" || c.status === "at-risk");
  const overdue = live.filter((c) => clientReviewStatus(c, s3.reviews) === "overdue").length;

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-7 md:px-9">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
            <span>Retain</span>
            <span aria-hidden>·</span>
            <span>Clients</span>
          </div>
          <h2 className="mt-1 flex items-center gap-2 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">
            <Users size={20} className="text-cgs-accent" aria-hidden />
            Active Clients
          </h2>
          <p className="mt-1 text-[13px] text-cgs-muted" aria-live="polite">
            {s3.clients.length === 0
              ? "Completed onboardings land here as active clients."
              : `${live.length} in relationships${overdue > 0 ? ` · ${overdue} review${overdue === 1 ? "" : "s"} overdue` : ""}`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus size={14} aria-hidden /> Add client
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search client, company, needs…" className="sm:max-w-64" />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: "live", label: "In relationships" },
            { value: "all", label: "All" },
            ...CLIENT_STATUSES.map((s) => ({ value: s, label: CLIENT_STATUS_LABEL[s] })),
          ]}
        />
        <span className="ml-auto text-[12px] tabular-nums text-cgs-muted">{filtered.length} shown</span>
      </div>

      <div className="mt-4">
        {s3.clients.length === 0 ? (
          <EmptyState
            icon={<HeartHandshake size={26} aria-hidden />}
            title="No clients yet"
            body="When an onboarding is completed in DELIVER, the client activates here with the review clock already set. If you have clients from before this system, add them directly."
            action={
              <div className="flex items-center gap-2">
                <Link href={dHref("/deliver/onboarding")}><Button variant="secondary">Client onboarding</Button></Link>
                <Button variant="primary" onClick={() => setCreating(true)}>Add client</Button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users size={26} aria-hidden />} title="Nothing in this view" body={query ? "No client matches this search." : "Change the status filter to see other clients."} />
        ) : (
          <TableShell>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cgs-line">
                  <th scope="col" className={thCls}>Client</th>
                  <th scope="col" className={thCls}>Offer</th>
                  <th scope="col" className={thCls}>Status</th>
                  <th scope="col" className={thCls}>Satisfaction</th>
                  <th scope="col" className={thCls}>Review</th>
                  <th scope="col" className={thCls}>Renewal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    onClick={() => setOpenId(c.id)}
                    onKeyDown={(e) => e.key === "Enter" && setOpenId(c.id)}
                    aria-label={`Open client ${c.company || c.contact}`}
                    className={`cursor-pointer border-b border-cgs-line/60 transition-colors last:border-0 hover:bg-cgs-inset/50 focus-visible:bg-cgs-inset/50 ${
                      clientReviewStatus(c, s3.reviews) === "overdue" ? "bg-cgs-danger-soft/30" : ""
                    }`}
                  >
                    <td className={tdCls}>
                      <span className="block truncate font-medium text-cgs-ink">{c.company || c.contact}</span>
                      <span className="block truncate text-[11.5px] text-cgs-faint">
                        {c.contact}{c.startDate ? ` · since ${formatCalendarDate(c.startDate)}` : ""}
                      </span>
                    </td>
                    <td className={`${tdCls} max-w-[170px]`}><span className="block truncate text-[12.5px]">{deliveryOfferLine(c, ctx)}</span></td>
                    <td className={tdCls}><Pill tone={STATUS_TONE[c.status]}>{CLIENT_STATUS_LABEL[c.status]}</Pill></td>
                    <td className={tdCls}>
                      <span className={c.satisfaction === "at-risk" ? "font-medium text-cgs-danger" : "text-cgs-ink-soft"}>
                        {SATISFACTION_LABEL[c.satisfaction]}
                      </span>
                    </td>
                    <td className={tdCls}><ReviewPill client={c} reviews={s3.reviews} /></td>
                    <td className={`${tdCls} whitespace-nowrap text-[12px] ${isCalendarDate(c.renewalDate) && daysFromToday(c.renewalDate!, new Date()) <= 30 ? "font-medium text-cgs-accent-deep" : "text-cgs-muted"}`}>
                      {c.renewalDate ? formatCalendarDate(c.renewalDate) : "—"}
                    </td>
                  </tr>
                ))}
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

      {creating && <NewClientDrawer onClose={() => setCreating(false)} say={say} />}
      {active && <ClientDrawer client={active} onClose={closeDrawer} say={say} />}
    </div>
  );
}

/* ------------------------------ new client -------------------------------- */

function NewClientDrawer({ onClose, say }: { onClose: () => void; say: (m: string) => void }) {
  const { s3, data, addClient } = useStore();
  const ctx = useMemo(() => buildContext(data), [data]);
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState("");
  const [offer, setOffer] = useState(ctx.hasOffer);
  const [customOffer, setCustomOffer] = useState("");
  const [startDate, setStartDate] = useState<string | null>(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Completed onboardings not yet linked to a client — the promotion path.
  const unlinked = s3.onboardings.filter(
    (ob) => ob.status === "completed" && !s3.clients.some((c) => c.onboardingId === ob.id),
  );

  const submit = () => {
    const e = validateClient({ contact, company });
    setErrors(e);
    if (Object.keys(e).length) return;
    const c = newClient({
      contact: contact.trim(),
      company: company.trim(),
      useCurrentOffer: offer && ctx.hasOffer,
      offerRef: offer ? "" : customOffer.trim(),
      startDate,
      nextReviewDate: null,
    });
    addClient(c);
    say(`${c.company || c.contact} added.`);
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="Add a client"
      subtitle="For relationships that exist outside the onboarding flow."
      width="max-w-xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={submit}>Add client</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {unlinked.length > 0 && (
          <section aria-label="Completed onboardings waiting" className="rounded-xl border border-cgs-accent/35 bg-cgs-accent-faint/60 p-3.5">
            <h3 className="text-[12.5px] font-semibold text-cgs-ink">Onboarding is finished for — activate without re-entering:</h3>
            <ul className="mt-2 space-y-1.5">
              {unlinked.map((ob) => (
                <li key={ob.id}>
                  <Link href={dHref(`/deliver/onboarding?id=${ob.id}`)} className="flex items-center justify-between gap-3 rounded-lg border border-cgs-line bg-cgs-surface px-3 py-2 text-[13px] hover:border-cgs-accent/40">
                    <span className="truncate font-medium text-cgs-ink">{ob.company || ob.contact}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-cgs-accent">
                      complete here <ArrowRight size={11} aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextFieldLite label="Contact" value={contact} onChange={setContact} placeholder="e.g. Marta Lindqvist" />
          <TextFieldLite label="Company" value={company} onChange={setCompany} placeholder="e.g. Nordwell Retail" error={errors.company} />
        </div>
        <div>
          <span className="mb-1 block text-[12px] font-medium text-cgs-ink">Offer / engagement</span>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px]">
            <input type="radio" name="client-offer" checked={offer} onChange={() => setOffer(true)} disabled={!ctx.hasOffer} className="accent-[#a5522a]" />
            <span className={ctx.hasOffer ? "text-cgs-ink" : "text-cgs-faint"}>{ctx.hasOffer ? `Current BUILD offer — ${ctx.offerName}` : "No offer defined in BUILD"}</span>
          </label>
          <label className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px]">
            <input type="radio" name="client-offer" checked={!offer} onChange={() => setOffer(false)} className="accent-[#a5522a]" />
            <span className="text-cgs-ink">Something else</span>
          </label>
          {!offer && (
            <input
              type="text"
              value={customOffer}
              onChange={(e) => setCustomOffer(e.target.value)}
              placeholder="Name the engagement"
              aria-label="Custom engagement name"
              autoFocus
              className="mt-1.5 w-full rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink focus:border-cgs-accent"
            />
          )}
        </div>
        <DateField label="Start date" value={startDate} onChange={setStartDate} />
      </div>
    </Drawer>
  );
}

/* ------------------------------ client drawer ------------------------------ */

function ClientDrawer({ client, onClose, say }: { client: Client; onClose: () => void; say: (m: string) => void }) {
  const { s3, s2, data, updateClient, removeClient } = useStore();
  const ctx = useMemo(() => buildContext(data), [data]);
  const [recentDraft, setRecentDraft] = useState(client.recentWork);
  const [needsDraft, setNeedsDraft] = useState(client.upcomingNeeds);
  const [renewalDraft, setRenewalDraft] = useState(client.renewalNote);
  const [relDraft, setRelDraft] = useState(client.relationshipNotes);
  const [satisDraft, setSatisDraft] = useState(client.satisfactionNote);
  const [expansionDraft, setExpansionDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const reviews = s3.reviews.filter((r) => r.clientId === client.id).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const actions = s3.actions.filter((a) => a.clientId === client.id);
  const openActions = actions.filter((a) => !a.completedAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const opp = client.opportunityId ? s2.opportunities.find((o) => o.id === client.opportunityId) ?? null : null;
  const ob = client.onboardingId ? s3.onboardings.find((o) => o.id === client.onboardingId) ?? null : null;
  const dirty =
    recentDraft !== client.recentWork ||
    needsDraft !== client.upcomingNeeds ||
    renewalDraft !== client.renewalNote ||
    relDraft !== client.relationshipNotes ||
    satisDraft !== client.satisfactionNote;

  const saveAll = () => {
    updateClient(client.id, {
      recentWork: recentDraft,
      upcomingNeeds: needsDraft,
      renewalNote: renewalDraft,
      relationshipNotes: relDraft,
      satisfactionNote: satisDraft,
    });
    say("Client updated.");
  };

  const addExpansion = () => {
    const t = expansionDraft.trim();
    if (!t) return;
    updateClient(client.id, { expansionIdeas: [...client.expansionIdeas, t] });
    setExpansionDraft("");
  };

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={
        <span className="flex flex-wrap items-center gap-2">
          {client.company || client.contact}
          <Pill tone={STATUS_TONE[client.status]}>{CLIENT_STATUS_LABEL[client.status]}</Pill>
          <ReviewPill client={client} reviews={s3.reviews} />
        </span>
      }
      subtitle={`${client.contact} · ${deliveryOfferLine(client, ctx)}${client.startDate ? ` · since ${formatCalendarDate(client.startDate)}` : ""}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          {confirmDelete ? (
            <span className="flex items-center gap-2 text-[12.5px] text-cgs-danger">
              Remove this client and their actions/reviews?
              <Button size="sm" variant="danger" onClick={() => { removeClient(client.id); onClose(); }}>Yes, remove</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </span>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-cgs-faint hover:text-cgs-danger">
              <Trash2 size={12} aria-hidden /> Remove client
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Link href={dHref(`/retain/reviews?client=${client.id}`)}>
              <Button size="sm" variant="secondary">
                <CalendarClock size={12} aria-hidden /> Retention review
              </Button>
            </Link>
            {dirty && <Button size="sm" variant="primary" onClick={saveAll}>Save updates</Button>}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Facts */}
        <section aria-label="Client facts" className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-cgs-line bg-cgs-surface p-4 sm:grid-cols-4">
          <Fact label="Status">
            <select
              value={client.status}
              onChange={(e) => updateClient(client.id, { status: e.target.value as Client["status"] })}
              aria-label="Client status"
              className="w-full cursor-pointer rounded-md border border-cgs-line-strong bg-cgs-raised px-1.5 py-1 text-[12.5px] text-cgs-ink focus:border-cgs-accent"
            >
              {CLIENT_STATUSES.map((s) => (
                <option key={s} value={s}>{CLIENT_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </Fact>
          <Fact label="Satisfaction">
            <select
              value={client.satisfaction}
              onChange={(e) => updateClient(client.id, { satisfaction: e.target.value as Client["satisfaction"] })}
              aria-label="Satisfaction"
              className="w-full cursor-pointer rounded-md border border-cgs-line-strong bg-cgs-raised px-1.5 py-1 text-[12.5px] text-cgs-ink focus:border-cgs-accent"
            >
              <option value="">Unknown</option>
              <option value="great">Great</option>
              <option value="good">Good</option>
              <option value="mixed">Mixed</option>
              <option value="at-risk">At risk</option>
            </select>
          </Fact>
          <Fact label="Renewal date">
            <input
              type="date"
              value={client.renewalDate ?? ""}
              onChange={(e) => updateClient(client.id, { renewalDate: e.target.value || null })}
              aria-label="Renewal date"
              className="w-full rounded-md border border-cgs-line-strong bg-cgs-raised px-1.5 py-1 text-[12px] text-cgs-ink focus:border-cgs-accent"
            />
          </Fact>
          <Fact label="Next review">
            <input
              type="date"
              value={client.nextReviewDate ?? ""}
              onChange={(e) => updateClient(client.id, { nextReviewDate: e.target.value || null })}
              aria-label="Next review date"
              className="w-full rounded-md border border-cgs-line-strong bg-cgs-raised px-1.5 py-1 text-[12px] text-cgs-ink focus:border-cgs-accent"
            />
          </Fact>
        </section>

        {/* Recent work */}
        <FieldBlock title="Recent work" hint="What you have actually delivered lately — makes reviews instant.">
          <TextAreaLite label="" value={recentDraft} onChange={setRecentDraft} rows={2} placeholder="e.g. Shipped the Q3 dashboard refresh; trained two analysts" />
        </FieldBlock>

        <FieldBlock title="Upcoming needs" hint="What they will need next, as far as you know it.">
          <TextAreaLite label="" value={needsDraft} onChange={setNeedsDraft} rows={2} placeholder="e.g. Budget round in November; they mentioned a mobile app audit" />
        </FieldBlock>

        <FieldBlock title="Satisfaction note" hint="One honest sentence behind the status.">
          <TextAreaLite label="" value={satisDraft} onChange={setSatisDraft} rows={1} placeholder="e.g. Happy with speed, wants more proactive reporting" />
        </FieldBlock>

        {/* Renewal */}
        <FieldBlock title="Renewal" hint="Terms, pricing, who signs, when it slips.">
          <TextAreaLite label="" value={renewalDraft} onChange={setRenewalDraft} rows={1} placeholder="e.g. Monthly retainer €2.4k, auto-renews, Marta signs" />
        </FieldBlock>

        {/* Expansion */}
        <FieldBlock title="Expansion opportunities" hint="Concrete next-work ideas — not wishlist, evidence.">
          <ul className="space-y-1.5">
            {client.expansionIdeas.map((idea, i) => (
              <li key={`${idea}-${i}`} className="group flex items-center gap-2 rounded-lg border border-cgs-line bg-cgs-inset/40 px-3 py-1.5">
                <Sparkles size={12} className="shrink-0 text-cgs-accent/70" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[13px] text-cgs-ink">{idea}</span>
                <button
                  type="button"
                  onClick={() => updateClient(client.id, { expansionIdeas: client.expansionIdeas.filter((_, j) => j !== i) })}
                  aria-label={`Remove expansion idea ${idea}`}
                  className="rounded p-0.5 text-transparent group-hover:text-cgs-faint hover:!text-cgs-danger"
                >
                  <Trash2 size={11} aria-hidden />
                </button>
              </li>
            ))}
            {client.expansionIdeas.length === 0 && <li className="text-[12.5px] text-cgs-faint">None noted yet.</li>}
          </ul>
          <div className="mt-1.5 flex gap-2">
            <input
              value={expansionDraft}
              onChange={(e) => setExpansionDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExpansion()}
              placeholder="e.g. They need onboarding for their new analysts"
              aria-label="New expansion idea"
              className="flex-1 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
            />
            <Button size="sm" variant="secondary" onClick={addExpansion} disabled={!expansionDraft.trim()}>Add</Button>
          </div>
        </FieldBlock>

        <FieldBlock title="Relationship notes" hint="Names, history, sensitivities — what you would say to a colleague taking over tomorrow.">
          <TextAreaLite label="" value={relDraft} onChange={setRelDraft} rows={2} placeholder="e.g. CFO is the real gatekeeper; avoid mentioning the January delay" />
        </FieldBlock>

        {dirty && (
          <div className="flex items-center justify-end">
            <Button size="sm" variant="primary" onClick={saveAll}>Save updates</Button>
          </div>
        )}

        {/* Open actions */}
        <section aria-label="Open retention actions" className="rounded-xl border border-cgs-line bg-cgs-surface p-4">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Open actions</h3>
          {openActions.length === 0 ? (
            <p className="mt-1.5 text-[12.5px] text-cgs-muted">Nothing scheduled for this client. A completed retention review queues the follow-up automatically.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {openActions.map((a) => {
                const over = daysFromToday(a.dueDate, new Date()) < 0;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-cgs-ink">{a.note || a.type}</span>
                    <span className={`shrink-0 tabular-nums text-[12px] ${over ? "font-medium text-cgs-danger" : "text-cgs-muted"}`}>
                      {formatCalendarDate(a.dueDate)} · {relativeDue(a.dueDate)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href={dHref("/retain/reviews")} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-cgs-accent hover:text-cgs-accent-deep">
            Manage retention work <ArrowRight size={11} aria-hidden />
          </Link>
        </section>

        {/* History */}
        <section aria-label="Review history" className="rounded-xl border border-cgs-line bg-cgs-surface p-4">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Retention reviews</h3>
          {reviews.length === 0 ? (
            <p className="mt-1.5 text-[12.5px] text-cgs-muted">No reviews yet. Complete one before renewal decisions — it takes ten honest minutes.</p>
          ) : (
            <ol className="mt-2 space-y-2">
              {reviews.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate text-cgs-ink-soft">
                    {r.completedAt ? "Completed" : "Open"} — {r.satisfaction || "satisfaction not set"}
                    {r.risks.trim() ? ` · risks noted` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-cgs-faint">{r.date ? formatCalendarDate(r.date) : formatWhen(r.createdAt)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Lineage */}
        {(opp || ob) && (
          <section aria-label="Client origin" className="rounded-xl border border-cgs-line bg-cgs-inset/40 p-4">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Came from</h3>
            <div className="mt-1.5 space-y-1 text-[13px]">
              {ob && (
                <Link href={dHref(`/deliver/onboarding?id=${ob.id}`)} className="block text-cgs-ink-soft hover:text-cgs-accent-deep">
                  Onboarding · {ob.templateName} <span className="text-cgs-faint">→</span>
                </Link>
              )}
              {opp && (
                <Link href={dHref(`/sell/opportunities?id=${opp.id}`)} className="block text-cgs-ink-soft hover:text-cgs-accent-deep">
                  Sales opportunity · {opp.company || opp.prospect} <span className="text-cgs-faint">→</span>
                </Link>
              )}
            </div>
          </section>
        )}
      </div>
    </Drawer>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">{label}</div>
      <div className="mt-1 text-[13px] text-cgs-ink">{children}</div>
    </div>
  );
}

function FieldBlock({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">{title}</h3>
      {hint && <p className="mt-0.5 text-[11.5px] text-cgs-muted">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </section>
  );
}
