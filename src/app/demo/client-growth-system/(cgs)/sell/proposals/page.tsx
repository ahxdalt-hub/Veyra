"use client";

/**
 * SELL · Proposals.
 *
 * A structured builder — client, problem, outcome, solution, deliverables,
 * scope, timeline, investment, terms, next steps. Drafts save as you type,
 * a print-ready preview exports real text, and proposals attach to their
 * sales opportunity. No e-signature, no payments: that is not this product.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, FileText, Plus, Printer, Send, Trash2 } from "lucide-react";
import { useStore } from "@/cgs-demo/lib/store";
import { wasJustBlocked } from "@/cgs-demo/lib/demo-guard";
import {
  OPPORTUNITY_STAGE_LABEL,
  Opportunity,
  Proposal,
  buildContext,
  exportProposalText,
  newProposal,
  proposalFromOpportunity,
  validateProposal,
  type FieldErrors,
} from "@/cgs-demo/lib/workflow";
import { Button, formatWhen } from "@/cgs-demo/components/ui";
import {
  Drawer,
  EmptyState,
  Pill,
  SearchInput,
  Select,
  TextAreaLite,
  TextFieldLite,
  thCls,
  tdCls,
} from "@/cgs-demo/components/data";

/* ------------------------------ list + edit ------------------------------- */

export default function ProposalsPage() {
  return (
    <Suspense fallback={null}>
      <ProposalsInner />
    </Suspense>
  );
}

function ProposalsInner() {
  const { s2, data, addProposal, updateProposal, removeProposal, logOpportunity } = useStore();
  const ctx = useMemo(() => buildContext(data), [data]);
  const searchParams = useSearchParams();
  const deepId = searchParams.get("id");
  const fromOppId = searchParams.get("opportunity");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "sent">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const say = (m: string) => {
    if (wasJustBlocked()) return;
    setFlash(m);
    setTimeout(() => setFlash(null), 2800);
  };

  // Deep link from an opportunity ("Draft proposal" button) creates one
  // prefilled draft once. The ref guard only runs inside the effect; render
  // derives the auto-opened id from the store, so it needs no ref reads.
  const createdForOppRef = useRef<string | null>(null);
  useEffect(() => {
    if (!fromOppId || createdForOppRef.current === fromOppId) return;
    const opp = s2.opportunities.find((o) => o.id === fromOppId);
    if (!opp) return;
    createdForOppRef.current = fromOppId;
    const p = proposalFromOpportunity(opp, ctx);
    addProposal(p);
    logOpportunity(opp.id, "Proposal draft created.");
    // The drawer opening on the new draft is the confirmation itself; no
    // setState-in-effect flash here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromOppId]);

  const autoOpenedId = useMemo(() => {
    if (!fromOppId || dismissed) return null;
    const linked = s2.proposals.filter((p) => p.opportunityId === fromOppId);
    if (linked.length === 0) return null;
    return linked.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].id;
  }, [fromOppId, dismissed, s2.proposals]);

  // Deep links (?id=) open the proposal without an effect — the param folds
  // into the open id, and closing the drawer dismisses it.
  const effectiveOpenId =
    openId ??
    autoOpenedId ??
    (deepId && !dismissed && s2.proposals.some((p) => p.id === deepId) ? deepId : null);
  const closeDrawer = () => {
    setOpenId(null);
    setDismissed(true);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return s2.proposals
      .filter((p) => {
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (q && !`${p.client} ${p.company} ${p.solution}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [s2.proposals, query, statusFilter]);

  const active = effectiveOpenId ? s2.proposals.find((p) => p.id === effectiveOpenId) ?? null : null;

  const startCreate = () => {
    const p = newProposal({
      problem: ctx.offerProblem,
      desiredOutcome: ctx.offerOutcome,
      solution: ctx.offerName,
      deliverables: ctx.offerDeliverables,
      timeline: ctx.offerTimeline,
      investment: ctx.offerPrice,
    });
    addProposal(p);
    setOpenId(p.id);
  };

  return (
    <div className="flex h-full flex-col px-6 py-6 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
            <span>Sell</span>
            <span aria-hidden>·</span>
            <span>Proposals</span>
          </div>
          <h2 className="mt-1 flex items-center gap-2 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">
            <FileText size={20} className="text-cgs-accent" aria-hidden />
            Proposals
          </h2>
          <p className="mt-1 text-[13px] text-cgs-muted">
            {s2.proposals.length === 0
              ? "Structure the yes — problem, solution, scope and investment in one document."
              : `${s2.proposals.filter((p) => p.status === "draft").length} draft · ${s2.proposals.filter((p) => p.status === "sent").length} sent`}
          </p>
        </div>
        <Button variant="primary" onClick={startCreate}>
          <Plus size={14} aria-hidden /> New proposal
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search client or company…" />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: "all", label: "All" },
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
          ]}
        />
        <span className="ml-auto text-[12px] tabular-nums text-cgs-muted">{filtered.length.toLocaleString()} shown</span>
      </div>

      <div className="mt-4 min-h-0 flex-1">
        {s2.proposals.length === 0 ? (
          <EmptyState
            icon={<FileText size={26} aria-hidden />}
            title="No proposals yet"
            body={
              ctx.hasOffer
                ? `Open a sales opportunity and draft from it — the builder pre-fills problem, solution, deliverables, timeline and investment from “${ctx.offerName}”.`
                : "Define your offer in BUILD first: the proposal builder pre-fills itself from it, so every proposal starts consistent."
            }
            action={
              <div className="flex items-center gap-2">
                <Link href={dHref("/sell/opportunities")}><Button variant="secondary">Sales opportunities</Button></Link>
                <Button variant="primary" onClick={startCreate}>Start blank</Button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No proposals match" body="Clear the search or status filter to see everything." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cgs-line">
                  <th scope="col" className={thCls}>Client</th>
                  <th scope="col" className={thCls}>Solution</th>
                  <th scope="col" className={thCls}>Investment</th>
                  <th scope="col" className={thCls}>Status</th>
                  <th scope="col" className={thCls}>Linked deal</th>
                  <th scope="col" className={thCls}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const opp = p.opportunityId ? s2.opportunities.find((o) => o.id === p.opportunityId) : null;
                  const complete = proposalComplete(p);
                  return (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      onClick={() => setOpenId(p.id)}
                      onKeyDown={(e) => e.key === "Enter" && setOpenId(p.id)}
                      aria-label={`Open proposal for ${p.company || p.client}`}
                      className="cursor-pointer border-b border-cgs-line/60 transition-colors last:border-0 hover:bg-cgs-inset/50 focus-visible:bg-cgs-inset/50"
                    >
                      <td className={tdCls}>
                        <span className="block truncate font-medium text-cgs-ink">{p.company || "—"}</span>
                        <span className="block truncate text-[11.5px] text-cgs-faint">{p.client}</span>
                      </td>
                      <td className={`${tdCls} max-w-[220px]`}><span className="block truncate">{p.solution || <span className="text-cgs-faint">not defined</span>}</span></td>
                      <td className={`${tdCls} whitespace-nowrap`}>{p.investment || "—"}</td>
                      <td className={tdCls}>
                        <span className="flex items-center gap-1.5">
                          <Pill tone={p.status === "sent" ? "accent" : "neutral"}>{p.status === "sent" ? "Sent" : "Draft"}</Pill>
                          {!complete && <span title="Sections still empty" className="text-[10.5px] text-cgs-refine">{emptySectionCount(p)} left</span>}
                        </span>
                      </td>
                      <td className={`${tdCls} max-w-[160px]`}>
                        {opp ? (
                          <span className="block truncate text-cgs-ink-soft">{opp.company} <span className="text-[11px] text-cgs-faint">· {OPPORTUNITY_STAGE_LABEL[opp.stage]}</span></span>
                        ) : (
                          <span className="text-cgs-faint">—</span>
                        )}
                      </td>
                      <td className={`${tdCls} whitespace-nowrap text-[12px] text-cgs-muted`}>{formatWhen(p.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {flash && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-cgs-ink px-3.5 py-1.5 text-[12.5px] font-medium text-cgs-canvas shadow-cgs-pop" role="status">
          {flash}
        </div>
      )}

      {active && (
        <ProposalEditor
          key={active.id}
          proposal={active}
          opportunities={s2.opportunities}
          onClose={closeDrawer}
          onSave={(patch) => updateProposal(active.id, patch)}
          onDelete={() => {
            removeProposal(active.id);
            setOpenId(null);
            say("Proposal deleted.");
          }}
          onDiscardBlank={() => {
            // A blank draft that was never filled in should not survive
            // closing — otherwise the list fills with nameless proposals.
            if (!active.client.trim() && !active.company.trim()) {
              removeProposal(active.id);
              setOpenId(null);
            }
          }}
          say={say}
          buildContext={ctx}
        />
      )}
    </div>
  );
}

/* ------------------------------- completeness ------------------------------ */

const CORE_SECTIONS: (keyof Proposal)[] = ["problem", "desiredOutcome", "solution", "deliverables", "scope", "timeline", "investment", "terms", "nextSteps"];

function proposalComplete(p: Proposal): boolean {
  return emptySectionCount(p) === 0;
}
function emptySectionCount(p: Proposal): number {
  return CORE_SECTIONS.filter((k) => {
    const v = p[k];
    if (Array.isArray(v)) return v.filter((x) => x.trim()).length === 0;
    return !String(v ?? "").trim();
  }).length;
}

/* -------------------------------- editor ---------------------------------- */

function ProposalEditor({
  proposal,
  opportunities,
  onClose,
  onSave,
  onDelete,
  onDiscardBlank,
  say,
  buildContext: ctx,
}: {
  proposal: Proposal;
  opportunities: Opportunity[];
  onClose: () => void;
  onSave: (patch: Partial<Proposal>) => void;
  onDelete: () => void;
  onDiscardBlank: () => void;
  say: (m: string) => void;
  buildContext: ReturnType<typeof buildContext>;
}) {
  // The parent keys this editor by proposal id, so local state is seeded
  // directly from props — no sync effect needed.
  const [draft, setDraft] = useState<Proposal>(proposal);
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (patch: Partial<Proposal>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };

  const requestClose = () => {
    // A never-touched empty draft should not litter the list.
    if (!dirty && !proposal.client.trim() && !proposal.company.trim()) {
      onDiscardBlank();
      onClose();
      return;
    }
    if (dirty) onSave(draft); // never lose edits silently
    onClose();
  };

  const save = () => {
    const e = validateProposal(draft);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      say("Add a client and company first.");
      return;
    }
    onSave(draft);
    setDirty(false);
    say("Draft saved.");
  };

  const markSent = () => {
    const e = validateProposal(draft);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      say("A proposal needs client, company and an investment before it goes out.");
      return;
    }
    if (!draft.investment.trim()) {
      setErrors({ investment: "Set the investment before marking it sent." });
      return;
    }
    onSave({ ...draft, status: "sent" });
    setDirty(false);
    say("Marked sent.");
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(exportProposalText(draft, ctx));
      say("Proposal text copied to clipboard.");
    } catch {
      say("Clipboard unavailable — use Print instead.");
    }
  };

  const printView = () => {
    const text = exportProposalText(draft, ctx);
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) {
      say("Pop-up blocked — allow it to print or export.");
      return;
    }
    w.document.write(
      `<!doctype html><html><head><title>${escapeHtml(draft.company || draft.client || "Proposal")}</title>` +
        `<style>body{font-family:Georgia,serif;max-width:680px;margin:48px auto;padding:0 24px;color:#23201a;line-height:1.6}pre{white-space:pre-wrap;font:inherit}</style>` +
        `</head><body><pre>${escapeHtml(text)}</pre></body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const linkedOpp = draft.opportunityId ? opportunities.find((o) => o.id === draft.opportunityId) : null;

  return (
    <Drawer
      open
      onClose={requestClose}
      title={
        <span className="flex items-center gap-2">
          Proposal — {draft.company || draft.client || "Untitled"}
          <Pill tone={draft.status === "sent" ? "accent" : "neutral"}>{draft.status === "sent" ? "Sent" : "Draft"}</Pill>
        </span>
      }
      subtitle={linkedOpp ? `Linked to opportunity: ${linkedOpp.prospect} · ${linkedOpp.company}` : "Not linked to an opportunity"}
      width="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <span className="flex items-center gap-2 text-[12.5px] text-cgs-danger">
                Delete this proposal?
                <Button size="sm" variant="danger" onClick={onDelete}>Yes, delete</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] text-cgs-faint transition-colors hover:bg-cgs-danger-soft hover:text-cgs-danger"
              >
                <Trash2 size={12} aria-hidden /> Delete
              </button>
            )}
            {linkedOpp && (
              <Link href={dHref(`/sell/opportunities?id=${linkedOpp.id}`)} className="text-[12.5px] text-cgs-accent hover:text-cgs-accent-deep">
                open deal →
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={copyText}>
              <Copy size={13} aria-hidden /> Copy text
            </Button>
            <Button size="sm" variant="secondary" onClick={printView}>
              <Printer size={13} aria-hidden /> Print / PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setPreview((v) => !v)}>
              {preview ? "Edit" : "Preview"}
            </Button>
            <Button size="sm" variant="secondary" onClick={save}>
              Save draft {dirty && <span className="text-cgs-refine">•</span>}
            </Button>
            {draft.status !== "sent" && (
              <Button size="sm" variant="primary" onClick={markSent}>
                <Send size={13} aria-hidden /> Mark sent
              </Button>
            )}
          </div>
        </div>
      }
    >
      {preview ? (
        <ProposalPreview proposal={draft} ctx={ctx} />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextFieldLite label="Client contact" required value={draft.client} onChange={(v) => set({ client: v })} placeholder="e.g. Marta Lindqvist — Head of Ops" error={errors.client} />
            <TextFieldLite label="Company" required value={draft.company} onChange={(v) => set({ company: v })} placeholder="e.g. Nordwell Retail" error={errors.company} />
          </div>
          <label className="block space-y-1">
            <span className="block text-[12px] font-medium text-cgs-ink">Link to opportunity</span>
            <select
              value={draft.opportunityId ?? ""}
              onChange={(e) => set({ opportunityId: e.target.value || null })}
              className="w-full cursor-pointer rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink focus:border-cgs-accent"
            >
              <option value="">Not linked</option>
              {opportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.prospect} · {o.company} — {OPPORTUNITY_STAGE_LABEL[o.stage]}
                </option>
              ))}
            </select>
          </label>

          <Divider>The deal</Divider>
          <TextAreaLite label="Problem" value={draft.problem} onChange={(v) => set({ problem: v })} rows={2} placeholder="The situation they are in — in their words where possible." />
          <TextAreaLite label="Desired outcome" value={draft.desiredOutcome} onChange={(v) => set({ desiredOutcome: v })} rows={2} placeholder="What is true when this is done." />
          <TextAreaLite label="Solution" value={draft.solution} onChange={(v) => set({ solution: v })} rows={2} placeholder="What you will do, and how it answers the problem." />

          <div className="space-y-1.5">
            <span className="block text-[12px] font-medium text-cgs-ink">Deliverables</span>
            <DeliverableList value={draft.deliverables} onChange={(v) => set({ deliverables: v })} />
          </div>

          <TextAreaLite label="Scope" value={draft.scope} onChange={(v) => set({ scope: v })} rows={2} placeholder="What is included — and what is deliberately outside." />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextFieldLite label="Timeline" value={draft.timeline} onChange={(v) => set({ timeline: v })} placeholder="e.g. 3 weeks from kickoff" />
            <TextFieldLite label="Investment" value={draft.investment} onChange={(v) => set({ investment: v })} placeholder="e.g. €4,500 fixed" error={errors.investment} />
          </div>
          <TextAreaLite label="Terms" value={draft.terms} onChange={(v) => set({ terms: v })} rows={2} placeholder="Payment schedule, validity of the offer, assumptions." />
          <TextAreaLite label="Next steps" value={draft.nextSteps} onChange={(v) => set({ nextSteps: v })} rows={2} placeholder="The exact action that turns this yes into a start date." />
        </div>
      )}
    </Drawer>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1" role="separator">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-cgs-faint">{children}</span>
      <span className="h-px flex-1 bg-cgs-line" aria-hidden />
    </div>
  );
}

/* ----------------------------- deliverables ------------------------------- */

function DeliverableList({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      {value.map((d, i) => (
        <div key={`${d}-${i}`} className="group flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cgs-accent/50" aria-hidden />
          <input
            type="text"
            value={d}
            aria-label={`Deliverable ${i + 1}`}
            onChange={(e) => {
              const next = [...value];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="flex-1 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1 text-[13px] text-cgs-ink focus:border-cgs-accent"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            aria-label={`Remove deliverable ${d}`}
            className="rounded-md p-1 text-transparent transition group-hover:text-cgs-faint hover:!text-cgs-danger hover:bg-cgs-danger-soft focus-visible:text-cgs-faint"
          >
            <X10 size={10} />
          </button>
        </div>
      ))}
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-cgs-line-strong bg-cgs-surface/60 px-3 py-2 text-[12.5px] text-cgs-faint">
          List what the client actually receives — named items, not vibes.
        </p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add a deliverable…"
          aria-label="New deliverable"
          className="flex-1 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
        />
        <Button size="sm" variant="secondary" onClick={add} disabled={!draft.trim()}>Add</Button>
      </div>
    </div>
  );
}

function X10({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden>
      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------- preview --------------------------------- */

function ProposalPreview({ proposal: p, ctx }: { proposal: Proposal; ctx: ReturnType<typeof buildContext> }) {
  const rows: { label: string; value: string | string[] }[] = [
    { label: "Client", value: `${p.client}${p.company ? ` · ${p.company}` : ""}` },
    { label: "Problem", value: p.problem },
    { label: "Desired outcome", value: p.desiredOutcome },
    { label: "Solution", value: p.solution },
    { label: "Deliverables", value: p.deliverables.filter(Boolean) },
    { label: "Scope", value: p.scope },
    { label: "Timeline", value: p.timeline },
    { label: "Investment", value: p.investment },
    { label: "Terms", value: p.terms },
    { label: "Next steps", value: p.nextSteps },
  ];
  const empty = rows.filter((r) => !r.value || (Array.isArray(r.value) && r.value.length === 0));
  return (
    <article className="rounded-xl border border-cgs-line bg-cgs-raised px-7 py-6 shadow-cgs-card">
      <header className="border-b border-cgs-line pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cgs-faint">{ctx.businessName || "Proposal"}</p>
        <h3 className="mt-1 font-cgs-display text-[22px] font-semibold text-cgs-ink">{p.solution || "Proposal"}</h3>
        <p className="mt-0.5 text-[13px] text-cgs-muted">{p.client}{p.company ? ` · ${p.company}` : ""}</p>
      </header>
      <dl className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">{r.label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-cgs-ink">
              {Array.isArray(r.value)
                ? r.value.length
                  ? <ul className="space-y-1">{r.value.map((v) => <li key={v} className="flex gap-2"><span aria-hidden className="text-cgs-accent">•</span>{v}</li>)}</ul>
                  : <Missing />
                : r.value.trim() || <Missing />
              }
            </dd>
          </div>
        ))}
      </dl>
      {empty.length > 0 && (
        <p className="mt-5 rounded-lg bg-cgs-refine-soft px-3 py-2 text-[12px] text-cgs-refine" role="status">
          {empty.length} section{empty.length === 1 ? "" : "s"} still empty: {empty.map((e) => e.label).join(", ")}. Switch back to Edit to fill them.
        </p>
      )}
    </article>
  );
}

function Missing() {
  return <span className="italic text-cgs-faint">Not filled in</span>;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
