"use client";

/**
 * SELL · Sales Opportunities.
 *
 * Pipeline: Qualification → Discovery → Solution → Objections → Decision → Closed.
 * Board and list views over the same records; the drawer shows what is being
 * sold, stage, value, next action, linked outreach, proposals, and history.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Check,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Trash2,
} from "lucide-react";
import { useStore } from "@/cgs-demo/lib/store";
import { wasJustBlocked } from "@/cgs-demo/lib/demo-guard";
import {
  OPEN_OPPORTUNITY_STAGES,
  OPPORTUNITY_STAGE_LABEL,
  Opportunity,
  OpportunityStage,
  buildContext,
  dueSalesActions,
  formatCalendarDate,
  formatValue,
  isCalendarDate,
  newOpportunity,
  opportunityFromOutreach,
  openOpportunities,
  openPipelineValue,
  relativeDue,
  todayISO,
  validateOpportunity,
  type FieldErrors,
} from "@/cgs-demo/lib/workflow";
import { uid } from "@/cgs-demo/lib/stages";
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
  thCls,
  tdCls,
} from "@/cgs-demo/components/data";

/* -------------------------------- helpers --------------------------------- */

const STAGE_TONE: Record<OpportunityStage, "neutral" | "accent" | "complete" | "refine" | "danger"> = {
  qualification: "neutral",
  discovery: "accent",
  solution: "accent",
  objections: "refine",
  decision: "refine",
  closed: "complete",
};

function StagePill({ stage, outcome }: { stage: OpportunityStage; outcome: Opportunity["outcome"] }) {
  if (stage === "closed") {
    return outcome === "won" ? <Pill tone="complete">Won</Pill> : outcome === "lost" ? <Pill tone="danger">Lost</Pill> : <Pill>Closed</Pill>;
  }
  return <Pill tone={STAGE_TONE[stage]}>{OPPORTUNITY_STAGE_LABEL[stage]}</Pill>;
}

function offerLine(o: Opportunity, offerName: string | null): string {
  if (o.useCurrentOffer) return offerName ?? "No offer defined";
  return o.offerRef || "Offer not named";
}

/* ---------------------------------- page ---------------------------------- */

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={null}>
      <OpportunitiesInner />
    </Suspense>
  );
}

function OpportunitiesInner() {
  const { s2, data, addOpportunity, updateOpportunity, logOpportunity, removeOpportunity } = useStore();
  const ctx = useMemo(() => buildContext(data), [data]);
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get("id");

  const [view, setView] = useState<"board" | "list">(() =>
    typeof window !== "undefined" && window.localStorage.getItem("veyra-view-opps") === "list" ? "list" : "board",
  );
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<OpportunityStage | "all">("all");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | "open" | "won" | "lost">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem("veyra-view-opps", view);
  }, [view]);

  // Deep links (?id=) fold into the open id instead of setting state in an effect.
  const effectiveOpenId =
    openId ?? (deepLinkId && !dismissed && s2.opportunities.some((o) => o.id === deepLinkId) ? deepLinkId : null);
  const closeDrawer = () => {
    setOpenId(null);
    setCreating(false);
    setDismissed(true);
  };

  const say = useCallback((m: string) => {
    if (wasJustBlocked()) return;
    setFlash(m);
    setTimeout(() => setFlash(null), 2800);
  }, []);

  const opps = s2.opportunities;
  const open = useMemo(() => openOpportunities(data), [data]);
  const pipelineValue = useMemo(() => openPipelineValue(data), [data]);
  const dueActions = useMemo(() => dueSalesActions(data), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opps
      .filter((o) => {
        if (stageFilter !== "all" && o.stage !== stageFilter) return false;
        if (outcomeFilter === "open" && (o.outcome !== "open" || o.stage === "closed")) return false;
        if ((outcomeFilter === "won" || outcomeFilter === "lost") && o.outcome !== outcomeFilter) return false;
        if (q && !`${o.prospect} ${o.company} ${o.nextAction} ${o.offerRef}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  }, [opps, query, stageFilter, outcomeFilter]);

  const active = effectiveOpenId ? opps.find((o) => o.id === effectiveOpenId) ?? null : null;

  const moveStage = (o: Opportunity, stage: OpportunityStage) => {
    updateOpportunity(o.id, { stage, outcome: stage === "closed" ? o.outcome : "open" });
    logOpportunity(o.id, `Stage → ${OPPORTUNITY_STAGE_LABEL[stage]}.`);
    if (stage === "closed") say("Opportunity closed — set an outcome.");
  };

  const closeOpp = (o: Opportunity, outcome: "won" | "lost", reason?: string) => {
    updateOpportunity(o.id, {
      stage: "closed",
      outcome,
      lostReason: outcome === "lost" ? reason ?? "" : "",
      closedAt: new Date().toISOString(),
      nextActionDate: outcome === "won" ? o.nextActionDate : null,
    });
    logOpportunity(o.id, outcome === "won" ? "Marked won — ready for onboarding (DELIVER, next stage)." : `Marked lost${reason ? `: ${reason}` : ""}.`);
    say(outcome === "won" ? "Won. This opportunity is structured for delivery handoff." : "Marked lost.");
  };

  const startCreate = () => {
    setCreating(true);
    setOpenId(null);
  };

  const createFromQualified = useCallback(() => {
    const candidates = s2.outreach.filter((r) => r.status === "qualified" && !opps.some((o) => o.outreachId === r.id));
    if (candidates.length === 0) return null;
    const opp = opportunityFromOutreach(candidates[0], ctx);
    addOpportunity(opp);
    say(`Opportunity created from ${candidates[0].person || candidates[0].company}.`);
    setOpenId(opp.id);
    return opp.id;
  }, [s2.outreach, opps, ctx, addOpportunity, say]);

  const qualifiedCount = s2.outreach.filter(
    (r) => r.status === "qualified" && !opps.some((o) => o.outreachId === r.id),
  ).length;

  return (
    <div className="flex h-full flex-col px-6 py-6 md:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
            <span>Sell</span>
            <span aria-hidden>·</span>
            <span>Opportunities</span>
          </div>
          <h2 className="mt-1 flex items-center gap-2 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">
            <Briefcase size={20} className="text-cgs-accent" aria-hidden />
            Sales Opportunities
          </h2>
          <p className="mt-1 text-[13px] text-cgs-muted">
            {open.length === 0
              ? "No open opportunities yet."
              : `${open.length} open${pipelineValue > 0 ? ` · pipeline value ${formatValue(pipelineValue)}` : ""}${dueActions.length > 0 ? ` · ${dueActions.length} action${dueActions.length === 1 ? "" : "s"} due` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {qualifiedCount > 0 && (
            <Button variant="secondary" onClick={createFromQualified}>
              From qualified outreach ({qualifiedCount})
            </Button>
          )}
          <Button variant="primary" onClick={startCreate}>
            <Plus size={14} aria-hidden /> New opportunity
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-cgs-line bg-cgs-surface p-0.5 shadow-cgs-card" role="group" aria-label="View">
          <button
            type="button"
            onClick={() => setView("board")}
            aria-pressed={view === "board"}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] transition-colors ${
              view === "board" ? "bg-cgs-accent-faint font-medium text-cgs-accent-deep" : "text-cgs-muted hover:text-cgs-ink"
            }`}
          >
            <LayoutGrid size={12} aria-hidden /> Board
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] transition-colors ${
              view === "list" ? "bg-cgs-accent-faint font-medium text-cgs-accent-deep" : "text-cgs-muted hover:text-cgs-ink"
            }`}
          >
            <List size={12} aria-hidden /> List
          </button>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search prospect, company…" />
        <Select
          label="Stage"
          value={stageFilter}
          onChange={(v) => setStageFilter(v as OpportunityStage | "all")}
          options={[
            { value: "all", label: "All" },
            ...(Object.keys(OPPORTUNITY_STAGE_LABEL) as OpportunityStage[]).map((s) => ({ value: s, label: OPPORTUNITY_STAGE_LABEL[s] })),
          ]}
        />
        <Select
          label="Result"
          value={outcomeFilter}
          onChange={(v) => setOutcomeFilter(v as typeof outcomeFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "open", label: "Open" },
            { value: "won", label: "Won" },
            { value: "lost", label: "Lost" },
          ]}
        />
        {(query || stageFilter !== "all" || outcomeFilter !== "all") && (
          <button
            type="button"
            onClick={() => { setQuery(""); setStageFilter("all"); setOutcomeFilter("all"); }}
            className="text-[12px] text-cgs-faint underline-offset-2 hover:text-cgs-ink hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[12px] tabular-nums text-cgs-muted">{filtered.length.toLocaleString()} shown</span>
      </div>

      {/* Body */}
      <div className="mt-4 min-h-0 flex-1">
        {opps.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={26} aria-hidden />}
            title="No opportunities yet"
            body={
              qualifiedCount > 0
                ? `${qualifiedCount} qualified outreach record${qualifiedCount === 1 ? " is" : "s are"} ready to move into sales — start from there.`
                : "Opportunities grow out of outreach: when a contact qualifies, open one here. You can also start directly."
            }
            action={
              <div className="flex items-center gap-2">
                {qualifiedCount > 0 ? (
                  <Button variant="primary" onClick={createFromQualified}>
                    Convert qualified outreach
                  </Button>
                ) : (
                  <>
                    <Link href={dHref("/acquire/outreach")}><Button variant="secondary">Outreach workspace</Button></Link>
                    <Button variant="primary" onClick={startCreate}>New opportunity</Button>
                  </>
                )}
              </div>
            }
          />
        ) : view === "board" ? (
          <BoardView opps={filtered} onOpen={setOpenId} offerName={ctx.hasOffer ? ctx.offerName : null} />
        ) : (
          <ListView opps={filtered} onOpen={setOpenId} offerName={ctx.hasOffer ? ctx.offerName : null} />
        )}
      </div>

      {flash && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-cgs-ink px-3.5 py-1.5 text-[12.5px] font-medium text-cgs-canvas shadow-cgs-pop" role="status">
          {flash}
        </div>
      )}

      <OpportunityDrawer
        open={creating || !!active}
        opp={active}
        offerName={ctx.hasOffer ? ctx.offerName : null}
        onClose={closeDrawer}
        onCreate={(o) => {
          addOpportunity(o);
          setCreating(false);
          setOpenId(o.id);
          say("Opportunity created.");
        }}
        onUpdate={(o, patch, log) => {
          updateOpportunity(o.id, patch);
          if (log) logOpportunity(o.id, log);
        }}
        onMoveStage={moveStage}
        onClose_={closeOpp}
        onDelete={(id) => {
          removeOpportunity(id);
          say("Opportunity deleted.");
        }}
        say={say}
      />
    </div>
  );
}

/* -------------------------------- board ----------------------------------- */

function BoardView({ opps, onOpen, offerName }: { opps: Opportunity[]; onOpen: (id: string) => void; offerName: string | null }) {
  const columns = [...OPEN_OPPORTUNITY_STAGES, "closed"] as OpportunityStage[];
  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto pb-2">
      {columns.map((stage) => {
        const col = opps.filter((o) => o.stage === stage);
        const value = col.reduce((sum, o) => sum + (o.estimatedValue ?? 0), 0);
        return (
          <section
            key={stage}
            aria-label={`${OPPORTUNITY_STAGE_LABEL[stage]} column`}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-cgs-line bg-cgs-inset/40"
          >
            <header className="flex items-baseline justify-between border-b border-cgs-line px-3 py-2">
              <h3 className="text-[12px] font-semibold text-cgs-ink">{OPPORTUNITY_STAGE_LABEL[stage]}</h3>
              <span className="text-[11px] tabular-nums text-cgs-muted" title={stage === "closed" ? undefined : "Sum of estimated values in this stage"}>
                {col.length}
                {stage !== "closed" && value > 0 && <span className="ml-1.5 text-cgs-faint">{formatValue(value)}</span>}
              </span>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {col.length === 0 ? (
                <p className="px-1 py-4 text-center text-[11.5px] text-cgs-faint">Empty</p>
              ) : (
                col.map((o) => <BoardCard key={o.id} opp={o} onOpen={onOpen} offerName={offerName} />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BoardCard({ opp, onOpen, offerName }: { opp: Opportunity; onOpen: (id: string) => void; offerName: string | null }) {
  const actionOverdue = isCalendarDate(opp.nextActionDate) && opp.nextActionDate < todayISO();
  return (
    <button
      type="button"
      onClick={() => onOpen(opp.id)}
      className="w-full rounded-lg border border-cgs-line bg-cgs-raised p-2.5 text-left shadow-cgs-card transition-colors hover:border-cgs-accent/50 focus-visible:border-cgs-accent"
      aria-label={`Open opportunity for ${opp.company}`}
    >
      <span className="block truncate text-[13px] font-medium text-cgs-ink">{opp.company || opp.prospect}</span>
      <span className="block truncate text-[11.5px] text-cgs-muted">{opp.prospect} · {offerLine(opp, offerName)}</span>
      {opp.estimatedValue != null && (
        <span className="mt-1 block text-[12px] font-medium tabular-nums text-cgs-ink-soft">{formatValue(opp.estimatedValue)}</span>
      )}
      {opp.nextAction && (
        <span className={`mt-1.5 block truncate text-[11.5px] ${actionOverdue ? "font-medium text-cgs-danger" : "text-cgs-faint"}`}>
          → {opp.nextAction}
          {opp.nextActionDate && ` (${relativeDue(opp.nextActionDate)})`}
        </span>
      )}
      {opp.outcome === "won" && <span className="mt-1.5 inline-block"><Pill tone="complete">Won</Pill></span>}
      {opp.outcome === "lost" && <span className="mt-1.5 inline-block"><Pill tone="danger">Lost</Pill></span>}
    </button>
  );
}

/* -------------------------------- list ------------------------------------ */

function ListView({ opps, onOpen, offerName }: { opps: Opportunity[]; onOpen: (id: string) => void; offerName: string | null }) {
  return (
    <TableShell>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-cgs-line">
            <th scope="col" className={thCls}>Prospect</th>
            <th scope="col" className={thCls}>Offer</th>
            <th scope="col" className={thCls}>Stage</th>
            <th scope="col" className={`${thCls} text-right`}>Value</th>
            <th scope="col" className={thCls}>Next action</th>
            <th scope="col" className={thCls}>Last activity</th>
          </tr>
        </thead>
        <tbody>
          {opps.map((o) => {
            const overdue = isCalendarDate(o.nextActionDate) && o.nextActionDate < todayISO() && o.stage !== "closed";
            return (
              <tr
                key={o.id}
                tabIndex={0}
                onClick={() => onOpen(o.id)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(o.id)}
                aria-label={`Open opportunity ${o.company}`}
                className="cursor-pointer border-b border-cgs-line/60 transition-colors last:border-0 hover:bg-cgs-inset/50 focus-visible:bg-cgs-inset/50"
              >
                <td className={tdCls}>
                  <span className="block truncate font-medium text-cgs-ink">{o.company || "—"}</span>
                  <span className="block truncate text-[11.5px] text-cgs-faint">{o.prospect}</span>
                </td>
                <td className={`${tdCls} max-w-[170px]`}><span className="block truncate">{offerLine(o, offerName)}</span></td>
                <td className={tdCls}><StagePill stage={o.stage} outcome={o.outcome} /></td>
                <td className={`${tdCls} text-right tabular-nums`}>{formatValue(o.estimatedValue)}</td>
                <td className={`${tdCls} max-w-[220px]`}>
                  {o.nextAction ? (
                    <span className="block truncate">
                      <span className={overdue ? "font-medium text-cgs-danger" : ""}>{o.nextAction}</span>
                      {o.nextActionDate && <span className="ml-1.5 text-[11px] text-cgs-faint">{relativeDue(o.nextActionDate)}</span>}
                    </span>
                  ) : (
                    <span className="text-cgs-faint">—</span>
                  )}
                </td>
                <td className={`${tdCls} whitespace-nowrap text-[12px] text-cgs-muted`}>{formatWhen(o.lastActivityAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

/* -------------------------------- drawer ---------------------------------- */

function OpportunityDrawer({
  open,
  opp,
  offerName,
  onClose,
  onCreate,
  onUpdate,
  onMoveStage,
  onClose_,
  onDelete,
  say,
}: {
  open: boolean;
  opp: Opportunity | null;
  offerName: string | null;
  onClose: () => void;
  onCreate: (o: Opportunity) => void;
  onUpdate: (o: Opportunity, patch: Partial<Opportunity>, log?: string) => void;
  onMoveStage: (o: Opportunity, stage: OpportunityStage) => void;
  onClose_: (o: Opportunity, outcome: "won" | "lost", reason?: string) => void;
  onDelete: (id: string) => void;
  say: (m: string) => void;
}) {
  if (!opp) return open ? <NewOpportunityForm open={open} offerName={offerName} onCancel={onClose} onCreate={onCreate} /> : null;
  return <OpportunityDetail opp={opp} offerName={offerName} onClose={onClose} onUpdate={onUpdate} onMoveStage={onMoveStage} onCloseOpp={onClose_} onDelete={onDelete} say={say} />;
}

function NewOpportunityForm({
  open,
  offerName,
  onCancel,
  onCreate,
}: {
  open: boolean;
  offerName: string | null;
  onCancel: () => void;
  onCreate: (o: Opportunity) => void;
}) {
  const { s2 } = useStore();
  const [prospect, setProspect] = useState("");
  const [company, setCompany] = useState("");
  const [fromOutreachId, setFromOutreachId] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [nextAction, setNextAction] = useState("");
  const [nextDate, setNextDate] = useState<string | null>(null);
  const [useCurrent, setUseCurrent] = useState(true);
  const [customOffer, setCustomOffer] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = () => {
    const e = validateOpportunity({ prospect, company, estimatedValue: value === "" ? null : Number(value) });
    setErrors(e);
    if (Object.keys(e).length) return;
    const source = fromOutreachId ? s2.outreach.find((r) => r.id === fromOutreachId) : null;
    onCreate(
      newOpportunity({
        prospect: prospect.trim(),
        company: company.trim(),
        estimatedValue: value === "" ? null : Number(value),
        nextAction: nextAction.trim(),
        nextActionDate: nextDate,
        useCurrentOffer: useCurrent,
        offerRef: useCurrent ? "" : customOffer.trim(),
        outreachId: fromOutreachId || null,
        activities: source
          ? [{ id: uid(), at: new Date().toISOString(), text: `Opened from outreach to ${source.person} · ${source.company}.` }]
          : [{ id: uid(), at: new Date().toISOString(), text: "Opportunity opened." }],
      }),
    );
  };

  return (
    <Drawer
      open={open}
      onClose={onCancel}
      title="New sales opportunity"
      subtitle="What is being sold, to whom, and what happens next."
      width="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={submit}>Create opportunity</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextFieldLite label="Prospect" required value={prospect} onChange={setProspect} placeholder="e.g. Marta Lindqvist" error={errors.prospect} />
          <TextFieldLite label="Company" required value={company} onChange={setCompany} placeholder="e.g. Nordwell Retail" error={errors.company} />
        </div>
        <div>
          <label htmlFor="opp-link" className="mb-1 block text-[12px] font-medium text-cgs-ink">
            From outreach <span className="text-cgs-faint">(optional — links the acquisition history)</span>
          </label>
          <select
            id="opp-link"
            value={fromOutreachId}
            onChange={(e) => {
              const id = e.target.value;
              setFromOutreachId(id);
              const r = s2.outreach.find((x) => x.id === id);
              if (r) {
                setProspect(r.person);
                setCompany(r.company);
              }
            }}
            className="w-full cursor-pointer rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink focus:border-cgs-accent"
          >
            <option value="">Not linked</option>
            {s2.outreach
              .filter((r) => ["replied", "qualified", "follow-up"].includes(r.status))
              .map((r) => (
                <option key={r.id} value={r.id}>{r.person} · {r.company} — {r.status}</option>
              ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <div className="space-y-1.5">
            <span className="block text-[12px] font-medium text-cgs-ink">Offer being sold</span>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px]">
              <input
                type="radio"
                name="offer-choice"
                checked={useCurrent}
                onChange={() => setUseCurrent(true)}
                className="accent-[#a5522a]"
                disabled={!offerName}
              />
              <span className={offerName ? "text-cgs-ink" : "text-cgs-faint"}>
                {offerName ? `Current BUILD offer — ${offerName}` : "No offer defined in BUILD"}
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px]">
              <input type="radio" name="offer-choice" checked={!useCurrent} onChange={() => setUseCurrent(false)} className="accent-[#a5522a]" />
              <span className="text-cgs-ink">Something else</span>
            </label>
            {!useCurrent && (
              <input
                type="text"
                value={customOffer}
                onChange={(e) => setCustomOffer(e.target.value)}
                placeholder="Name the offer"
                aria-label="Custom offer name"
                className="w-full rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink focus:border-cgs-accent"
                autoFocus
              />
            )}
          </div>
          <TextFieldLite
            label="Estimated value"
            type="number"
            value={value}
            onChange={setValue}
            placeholder="e.g. 4500"
            error={errors.estimatedValue}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px] sm:items-end">
          <TextFieldLite label="Next action" value={nextAction} onChange={setNextAction} placeholder="e.g. Send discovery-call invite" />
          <DateField label="Next action date" value={nextDate} onChange={setNextDate} />
        </div>
      </div>
    </Drawer>
  );
}

function OpportunityDetail({
  opp,
  offerName,
  onClose,
  onUpdate,
  onMoveStage,
  onCloseOpp,
  onDelete,
  say,
}: {
  opp: Opportunity;
  offerName: string | null;
  onClose: () => void;
  onUpdate: (o: Opportunity, patch: Partial<Opportunity>, log?: string) => void;
  onMoveStage: (o: Opportunity, stage: OpportunityStage) => void;
  onCloseOpp: (o: Opportunity, outcome: "won" | "lost", reason?: string) => void;
  onDelete: (id: string) => void;
  say: (m: string) => void;
}) {
  const { s2, logOpportunity, updateOpportunity } = useStore();
  const [activityDraft, setActivityDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState(opp.notes);
  const [nextDraft, setNextDraft] = useState(opp.nextAction);
  const [closing, setClosing] = useState<null | "won" | "lost">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lostReason, setLostReason] = useState(opp.lostReason);

  const linked = useMemo(() => {
    const outreach = opp.outreachId ? s2.outreach.find((r) => r.id === opp.outreachId) ?? null : null;
    const proposals = s2.proposals.filter((p) => p.opportunityId === opp.id);
    return { outreach, proposals };
  }, [s2, opp]);

  const stageIdx = opp.stage === "closed" ? -1 : (Object.keys(OPPORTUNITY_STAGE_LABEL) as OpportunityStage[]).indexOf(opp.stage);
  const prevStage = stageIdx > 0 ? (Object.keys(OPPORTUNITY_STAGE_LABEL) as OpportunityStage[])[stageIdx - 1] : null;
  const nextStage = stageIdx >= 0 && stageIdx < 4 ? (Object.keys(OPPORTUNITY_STAGE_LABEL) as OpportunityStage[])[stageIdx + 1] : null;
  const actionOverdue = isCalendarDate(opp.nextActionDate) && opp.nextActionDate < todayISO() && opp.stage !== "closed";

  const saveNext = () => {
    if (nextDraft === opp.nextAction) return;
    onUpdate(opp, { nextAction: nextDraft.trim() }, `Next action set: ${nextDraft.trim() || "cleared"}.`);
  };
  const saveNotes = () => {
    if (notesDraft === opp.notes) return;
    onUpdate(opp, { notes: notesDraft });
    say("Notes saved.");
  };
  const addActivity = () => {
    const t = activityDraft.trim();
    if (!t) return;
    logOpportunity(opp.id, t);
    setActivityDraft("");
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={<span className="flex items-center gap-2">{opp.company || opp.prospect} <StagePill stage={opp.stage} outcome={opp.outcome} /></span>}
      subtitle={`${opp.prospect} · ${offerLine(opp, offerName)}`}
      width="max-w-2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {prevStage && <Button size="sm" variant="secondary" onClick={() => onMoveStage(opp, prevStage)}>← {OPPORTUNITY_STAGE_LABEL[prevStage]}</Button>}
            {nextStage && <Button size="sm" variant={nextStage === "decision" ? "primary" : "secondary"} onClick={() => onMoveStage(opp, nextStage)}>{OPPORTUNITY_STAGE_LABEL[nextStage]} →</Button>}
            {confirmDelete ? (
              <span className="flex items-center gap-2 text-[12.5px] text-cgs-danger">
                Delete this opportunity?
                <Button size="sm" variant="danger" onClick={() => { onDelete(opp.id); onClose(); }}>Yes, delete</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>No</Button>
              </span>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete opportunity" className="text-cgs-faint hover:text-cgs-danger">
                <Trash2 size={12} aria-hidden />
              </Button>
            )}
          </div>
          {opp.outcome === "open" ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setClosing("lost")} className="text-cgs-danger hover:bg-cgs-danger-soft">Lost</Button>
              <Button size="sm" variant="primary" onClick={() => setClosing("won")}>
                <Check size={13} aria-hidden /> Mark won
              </Button>
            </div>
          ) : opp.outcome === "won" ? (
            <StartOnboardingCta opp={opp} />
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                // Reopen returns the deal to the last live stage; leaving it
                // in "closed" would hide it from the pipeline while it reads open.
                updateOpportunity(opp.id, { stage: "decision", outcome: "open", closedAt: null, lostReason: "" });
                logOpportunity(opp.id, "Reopened — back in the Decision stage.");
              }}
            >
              Reopen opportunity
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Win/lose confirmation */}
        {closing && (
          <section className="rounded-xl border border-cgs-accent/40 bg-cgs-accent-faint p-4" role="dialog" aria-label="Close opportunity">
            <h3 className="text-[13px] font-semibold text-cgs-ink">
              {closing === "won" ? "Mark this opportunity as won?" : "Mark this opportunity as lost?"}
            </h3>
            {closing === "won" ? (
              <>
                <p className="mt-1 text-[12.5px] leading-relaxed text-cgs-ink-soft">
                  The record closes as <strong>Won</strong> with today&apos;s date and estimated value ({formatValue(opp.estimatedValue)}) —
                  DELIVER will pick it up for onboarding from there.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setClosing(null)}>Cancel</Button>
                  <Button size="sm" variant="primary" onClick={() => { onCloseOpp(opp, "won"); setClosing(null); }}>Confirm won</Button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-2">
                  <TextFieldLite label="Why was it lost? (honest reasons sharpen qualification later)" value={lostReason} onChange={setLostReason} placeholder="e.g. Went with an in-house hire" />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setClosing(null)}>Cancel</Button>
                  <Button size="sm" variant="danger" onClick={() => { onCloseOpp(opp, "lost", lostReason.trim()); setClosing(null); }}>Confirm lost</Button>
                </div>
              </>
            )}
          </section>
        )}

        {/* What needs attention next */}
        <section aria-label="Next action" className="rounded-xl border border-cgs-line bg-cgs-inset/50 p-4">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Next action</h3>
          {opp.stage === "closed" ? (
            <p className="mt-1.5 text-[13.5px] text-cgs-ink">
              {opp.outcome === "won"
                ? "Won — no further sales action. Start the client onboarding below to hand it to DELIVER."
                : opp.outcome === "lost"
                  ? `Lost${opp.lostReason ? `: ${opp.lostReason}` : "."}`
                  : "Closed without an outcome — set won or lost so the numbers stay honest."}
            </p>
          ) : (
            <>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="text"
                  value={nextDraft}
                  onChange={(e) => setNextDraft(e.target.value)}
                  onBlur={saveNext}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  placeholder="e.g. Walk through pricing on Thursday call"
                  aria-label="Next action"
                  className="flex-1 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] font-medium text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
                />
                {nextDraft !== opp.nextAction && <span className="text-[11px] text-cgs-faint">↵ to save</span>}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <DateField label="Due" value={opp.nextActionDate} onChange={(v) => onUpdate(opp, { nextActionDate: v })} />
                {opp.nextActionDate && (
                  <span className={`mt-4 text-[12px] ${actionOverdue ? "font-medium text-cgs-danger" : "text-cgs-muted"}`}>
                    {relativeDue(opp.nextActionDate)}
                  </span>
                )}
              </div>
            </>
          )}
        </section>

        {/* Facts */}
        <section aria-label="Deal facts" className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-cgs-line bg-cgs-surface p-4 sm:grid-cols-4">
          <Fact label="Stage">
            <select
              value={opp.stage}
              onChange={(e) => onMoveStage(opp, e.target.value as OpportunityStage)}
              aria-label="Change stage"
              className="w-full cursor-pointer rounded-md border border-cgs-line-strong bg-cgs-raised px-1.5 py-1 text-[12.5px] text-cgs-ink focus:border-cgs-accent"
            >
              {(Object.keys(OPPORTUNITY_STAGE_LABEL) as OpportunityStage[]).map((s) => (
                <option key={s} value={s}>{OPPORTUNITY_STAGE_LABEL[s]}</option>
              ))}
            </select>
          </Fact>
          <Fact label="Estimated value">
            <input
              type="number"
              min={0}
              value={opp.estimatedValue ?? ""}
              onChange={(e) => updateOpportunity(opp.id, { estimatedValue: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
              placeholder="—"
              aria-label="Estimated value"
              className="w-full rounded-md border border-cgs-line-strong bg-cgs-raised px-1.5 py-1 text-right text-[12.5px] tabular-nums text-cgs-ink focus:border-cgs-accent"
            />
          </Fact>
          <Fact label="Offer">{offerLine(opp, offerName)}</Fact>
          <Fact label="Opened">{formatCalendarDate(opp.createdAt.slice(0, 10)) || formatWhen(opp.createdAt)}</Fact>
        </section>

        {/* Acquisition lineage */}
        {linked.outreach && (
          <section aria-label="Acquisition source" className="rounded-xl border border-cgs-line bg-cgs-surface p-4">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Came from outreach</h3>
            <p className="mt-1 text-[13px] text-cgs-ink-soft">
              {linked.outreach.person} · {linked.outreach.company}
              {linked.outreach.channel && <> via {linked.outreach.channel}</>}
            </p>
            <Link href={dHref(`/acquire/outreach?id=${linked.outreach.id}`)} className="mt-1 inline-block text-[12.5px] font-medium text-cgs-accent underline-offset-2 hover:underline">
              Open outreach record →
            </Link>
          </section>
        )}

        {/* Proposals */}
        <section aria-label="Proposals" className="rounded-xl border border-cgs-line bg-cgs-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Proposals</h3>
            <Link href={dHref(`/sell/proposals?opportunity=${opp.id}`)}>
              <Button size="sm" variant="secondary">
                <FileText size={12} aria-hidden /> {linked.proposals.length ? "New from this deal" : "Draft proposal"}
              </Button>
            </Link>
          </div>
          {linked.proposals.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-cgs-muted">No proposal linked yet. The builder pre-fills problem, solution, deliverables and investment from your BUILD offer.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {linked.proposals.map((p) => (
                <li key={p.id}>
                  <Link href={dHref(`/sell/proposals?id=${p.id}`)} className="flex items-center justify-between gap-3 rounded-lg border border-cgs-line bg-cgs-inset/40 px-3 py-2 text-[13px] hover:border-cgs-accent/40">
                    <span className="truncate font-medium text-cgs-ink">{p.company || p.client}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Pill tone={p.status === "sent" ? "accent" : "neutral"}>{p.status}</Pill>
                      {p.investment.trim() && <span className="text-[12px] text-cgs-muted">{p.investment}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Notes */}
        <section aria-label="Notes">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Notes</h3>
          <div className="mt-1.5">
            <TextAreaLite label="" value={notesDraft} onChange={setNotesDraft} rows={3} placeholder="Deal context, stakeholders, constraints…" />
          </div>
          {notesDraft !== opp.notes && (
            <div className="mt-1 flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={saveNotes}>Save notes</Button>
              <button type="button" onClick={() => setNotesDraft(opp.notes)} className="text-[11.5px] text-cgs-faint hover:text-cgs-ink">discard</button>
            </div>
          )}
        </section>

        {/* Activity history */}
        <section aria-label="Activity history">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Activity</h3>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="text"
              value={activityDraft}
              onChange={(e) => setActivityDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addActivity()}
              placeholder="Log what just happened — a call, an objection, a commitment…"
              aria-label="New activity entry"
              className="flex-1 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
            />
            <Button size="sm" variant="secondary" onClick={addActivity} disabled={!activityDraft.trim()}>
              <Plus size={12} aria-hidden /> Log
            </Button>
          </div>
          <ol className="mt-3 space-y-2.5">
            {opp.activities.map((a) => (
              <li key={a.id} className="flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] leading-snug text-cgs-ink-soft">{a.text}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-cgs-faint">{formatWhen(a.at)}</span>
              </li>
            ))}
            {opp.activities.length === 0 && <li className="text-[12.5px] text-cgs-faint">No activity logged yet.</li>}
          </ol>
        </section>
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

/** The SELL → DELIVER handoff, right where the deal was won. */
function StartOnboardingCta({ opp }: { opp: Opportunity }) {
  const { s3 } = useStore();
  const ob = s3.onboardings.find((o) => o.opportunityId === opp.id) ?? null;
  if (ob)
    return (
      <Link href={dHref(`/deliver/onboarding?id=${ob.id}`)}>
        <Button size="sm" variant="secondary">
          Onboarding in progress <ArrowRight size={12} aria-hidden />
        </Button>
      </Link>
    );
  return (
    <Link href={dHref(`/deliver/onboarding?opportunity=${opp.id}`)}>
      <Button size="sm" variant="primary">
        Start client onboarding <ArrowRight size={12} aria-hidden />
      </Button>
    </Link>
  );
}
