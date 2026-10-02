"use client";

/**
 * ACQUIRE · Outreach.
 *
 * The daily workspace for prospect contact records: dense table with search,
 * filters, sorting, pagination, bulk status changes, and a detail drawer that
 * answers — who, where they are, what happened, what happens next.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Plus, Send, UserPlus } from "lucide-react";
import { useStore } from "@/cgs-demo/lib/store";
import { wasJustBlocked } from "@/cgs-demo/lib/demo-guard";
import {
  OUTREACH_STAGE_LABEL,
  OUTREACH_STAGES,
  OUTREACH_STATUS_LABEL,
  OUTREACH_STATUSES,
  OutreachRecord,
  OutreachStatus,
  applyStatusChange,
  buildContext,
  formatCalendarDate,
  newOutreach,
  opportunityFromOutreach,
  relativeDue,
  strategyChannels,
  todayISO,
  validateOutreach,
  type FieldErrors,
  type OutreachStage,
} from "@/cgs-demo/lib/workflow";
import { Button } from "@/cgs-demo/components/ui";
import {
  ComboInput,
  DateField,
  Drawer,
  EmptyState,
  Pagination,
  Pill,
  SearchInput,
  Select,
  SortHeader,
  TableShell,
  TextAreaLite,
  TextFieldLite,
  tdCls,
} from "@/cgs-demo/components/data";

/* ------------------------------ status pill ------------------------------- */

const STATUS_TONE: Record<OutreachStatus, "neutral" | "accent" | "complete" | "refine" | "danger"> = {
  draft: "neutral",
  contacted: "accent",
  "follow-up": "accent",
  replied: "accent",
  qualified: "complete",
  won: "complete",
  lost: "danger",
  "not-interested": "danger",
};

export function StatusPill({ status }: { status: OutreachStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{OUTREACH_STATUS_LABEL[status]}</Pill>;
}

/* -------------------------------- editing --------------------------------- */

const inputCls =
  "w-full rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent";

function OutreachForm({
  draft,
  setDraft,
  errors,
  channelSuggestions,
  offerName,
}: {
  draft: OutreachRecord;
  setDraft: (patch: Partial<OutreachRecord>) => void;
  errors: FieldErrors;
  channelSuggestions: string[];
  offerName: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextFieldLite
          label="Person"
          required
          value={draft.person}
          onChange={(v) => setDraft({ person: v })}
          placeholder="e.g. Marta Lindqvist"
          error={errors.person}
        />
        <TextFieldLite
          label="Company"
          required
          value={draft.company}
          onChange={(v) => setDraft({ company: v })}
          placeholder="e.g. Nordwell Retail"
          error={errors.company}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextFieldLite
          label="Contact information"
          value={draft.contact}
          onChange={(v) => setDraft({ contact: v })}
          placeholder="Email, phone, or profile link"
        />
        <ComboInput
          label="Channel"
          value={draft.channel}
          onChange={(v) => setDraft({ channel: v })}
          suggestions={channelSuggestions}
          placeholder="e.g. LinkedIn"
          error={errors.channel}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <DateField
          label="Date contacted"
          value={draft.dateContacted}
          onChange={(v) => setDraft({ dateContacted: v })}
          error={errors.dateContacted}
        />
        <DateField
          label="Next follow-up"
          value={draft.nextFollowUpDate}
          onChange={(v) => setDraft({ nextFollowUpDate: v })}
        />
        <div className="space-y-1">
          <label htmlFor="out-status" className="block text-[12px] font-medium text-cgs-ink">
            Status
          </label>
          <select
            id="out-status"
            value={draft.status}
            onChange={(e) => {
              // Same rule as the quick actions: stage follows the new status,
              // and leaving draft stamps today's contact date.
              const moved = applyStatusChange(draft, e.target.value as OutreachStatus);
              setDraft({ status: moved.status, stage: moved.stage, dateContacted: moved.dateContacted });
            }}
            className={`${inputCls} cursor-pointer`}
          >
            {OUTREACH_STATUSES.map((s) => (
              <option key={s} value={s}>{OUTREACH_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="out-stage" className="block text-[12px] font-medium text-cgs-ink">
            Stage
          </label>
          <select
            id="out-stage"
            value={draft.stage}
            onChange={(e) => setDraft({ stage: e.target.value as OutreachStage })}
            className={`${inputCls} cursor-pointer`}
          >
            {OUTREACH_STAGES.map((s) => (
              <option key={s} value={s}>{OUTREACH_STAGE_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="out-offer" className="block text-[12px] font-medium text-cgs-ink">
            Related offer
          </label>
          <select
            id="out-offer"
            value={draft.useCurrentOffer ? "__current" : "__custom"}
            onChange={(e) =>
              setDraft(e.target.value === "__current" ? { useCurrentOffer: true, offerRef: "" } : { useCurrentOffer: false })
            }
            className={`${inputCls} cursor-pointer`}
            disabled={!offerName}
          >
            <option value="__current">{offerName ? `Current BUILD offer — ${offerName}` : "No offer defined in BUILD"}</option>
            <option value="__custom">Something else…</option>
          </select>
          {!draft.useCurrentOffer && (
            <input
              type="text"
              value={draft.offerRef}
              onChange={(e) => setDraft({ offerRef: e.target.value })}
              placeholder="Name the offer being promoted"
              aria-label="Custom offer reference"
              className={`${inputCls} mt-1.5`}
              autoFocus
            />
          )}
        </div>
      </div>
      <TextAreaLite
        label="Message"
        value={draft.message}
        onChange={(v) => setDraft({ message: v })}
        placeholder="What you sent — or plan to send. Keeping it here makes follow-ups far easier."
        rows={3}
      />
      <TextAreaLite
        label="Notes"
        value={draft.notes}
        onChange={(v) => setDraft({ notes: v })}
        placeholder="Context, triggers you spotted, who else is involved…"
        rows={2}
      />
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

type SortKey = "updatedAt" | "person" | "company" | "dateContacted" | "nextFollowUpDate" | "status" | "stage";
type SortDir = "asc" | "desc";

const STATUS_FILTERS: (OutreachStatus | "all")[] = ["all", ...OUTREACH_STATUSES];

export default function OutreachPage() {
  return (
    <Suspense fallback={null}>
      <OutreachInner />
    </Suspense>
  );
}

function OutreachInner() {
  const { s2, data, addOutreach, updateOutreach, setOutreachStatus, removeOutreach } = useStore();
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get("id");
  const ctx = useMemo(() => buildContext(data), [data]);
  const channelSuggestions = useMemo(() => {
    const used = s2.outreach.map((r) => r.channel).filter(Boolean);
    return Array.from(new Set([...strategyChannels(s2.strategy), ...used]));
  }, [s2.strategy, s2.outreach]);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OutreachStatus | "all">("all");
  const [stageFilter, setStageFilter] = useState<OutreachStage | "all">("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "updatedAt", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraftState] = useState<OutreachRecord | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deepDismissed, setDeepDismissed] = useState(false);

  // Deep links from follow-ups / opportunity lineage open the record without
  // an effect: the param is folded into the open id, and closing dismisses it.
  const resolvedOpenId =
    openId ?? (deepLinkId && !deepDismissed && s2.outreach.some((r) => r.id === deepLinkId) ? deepLinkId : null);

  const setDraft = useCallback((patch: Partial<OutreachRecord>) => {
    setDraftState((d) => (d ? { ...d, ...patch } : d));
  }, []);

  const say = (msg: string) => {
    if (wasJustBlocked()) return;
    setFlash(msg);
    setTimeout(() => setFlash(null), 2800);
  };

  /* ------------------------------- derive rows ------------------------------ */

  const channels = useMemo(
    () => Array.from(new Set(s2.outreach.map((r) => r.channel).filter(Boolean))).sort(),
    [s2.outreach],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = s2.outreach;
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (stageFilter !== "all") rows = rows.filter((r) => r.stage === stageFilter);
    if (channelFilter !== "all") rows = rows.filter((r) => r.channel === channelFilter);
    if (q)
      rows = rows.filter((r) =>
        `${r.person} ${r.company} ${r.contact} ${r.channel} ${r.message} ${r.notes}`.toLowerCase().includes(q),
      );
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const pick = (r: OutreachRecord) => {
        switch (sort.key) {
          case "person": return r.person.toLowerCase();
          case "company": return r.company.toLowerCase();
          case "dateContacted": return r.dateContacted ?? "";
          case "nextFollowUpDate": return r.nextFollowUpDate ?? "9999";
          case "status": return OUTREACH_STATUSES.indexOf(r.status);
          case "stage": return OUTREACH_STAGES.indexOf(r.stage);
          default: return r.updatedAt;
        }
      };
      const av = pick(a);
      const bv = pick(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [s2.outreach, query, statusFilter, stageFilter, channelFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openCount = s2.outreach.filter((r) => !["won", "lost", "not-interested"].includes(r.status)).length;

  /* -------------------------------- actions -------------------------------- */

  const startCreate = () => {
    setDraftState(newOutreach({ channel: s2.strategy.primaryChannel || "" }));
    setEditing(true);
    setErrors({});
    setOpenId("__new__");
  };

  const openRecord = (id: string) => {
    setOpenId(id);
    setEditing(false);
    setErrors({});
    setConfirmDelete(false);
  };

  const startEdit = (rec: OutreachRecord) => {
    setDraftState({ ...rec });
    setEditing(true);
    setErrors({});
  };

  const saveDraft = () => {
    if (!draft) return;
    const e = validateOutreach(draft);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (effectiveId === "__new__") {
      addOutreach(draft);
      setOpenId(draft.id);
      say("Outreach record created.");
    } else {
      updateOutreach(draft.id, draft);
      say("Saved.");
    }
    setEditing(false);
  };

  const quickStatus = (id: string, status: OutreachStatus) => {
    const rec = s2.outreach.find((r) => r.id === id);
    if (!rec) return;
    if (status !== "draft" && !rec.channel.trim()) {
      // A non-draft record without a channel is dishonest data — take the
      // user to the form instead of quietly applying it.
      openRecord(id);
      setDraftState({ ...rec });
      setEditing(true);
      setErrors({ channel: "Pick the channel used before contacting them." });
      return;
    }
    setOutreachStatus([id], status);
    say(`Status → ${OUTREACH_STATUS_LABEL[status]}.`);
  };

  const bulkStatus = (status: OutreachStatus) => {
    setOutreachStatus([...selected], status);
    say(`${selected.size} record${selected.size === 1 ? "" : "s"} → ${OUTREACH_STATUS_LABEL[status]}.`);
    setSelected(new Set());
  };

  const bulkDelete = () => {
    removeOutreach([...selected]);
    say(`${selected.size} record${selected.size === 1 ? "" : "s"} deleted.`);
    setSelected(new Set());
    setConfirmDelete(false);
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === rows.length && rows.length > 0 ? new Set() : new Set(rows.map((r) => r.id)),
    );

  const effectiveId = resolvedOpenId;
  const active = effectiveId === "__new__" ? draft : s2.outreach.find((r) => r.id === effectiveId) ?? null;
  const drawerOpen = effectiveId !== null && (active !== null || effectiveId === "__new__");
  const closeDrawer = () => {
    setOpenId(null);
    setEditing(false);
    setDeepDismissed(true);
  };

  return (
    <div className="flex h-full flex-col px-6 py-6 md:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
            <span>Acquire</span>
            <span aria-hidden>·</span>
            <span>Outreach</span>
          </div>
          <h2 className="mt-1 flex items-center gap-2 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">
            <Send size={20} className="text-cgs-accent" aria-hidden />
            Outreach
          </h2>
          <p className="mt-1 text-[13px] text-cgs-muted">
            {openCount > 0
              ? `${openCount} active contact${openCount === 1 ? "" : "s"} of ${s2.outreach.length} total.`
              : s2.outreach.length > 0
                ? `${s2.outreach.length} records — every one closed out.`
                : "Turn your ideal clients into conversations, one record at a time."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!s2.strategy.primaryChannel && (
            <Link href={dHref("/acquire/strategy")} className="text-[12.5px] text-cgs-accent underline-offset-2 hover:underline">
              Set your channels first →
            </Link>
          )}
          <Button variant="primary" onClick={startCreate}>
            <Plus size={14} aria-hidden />
            New outreach
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={(v) => { setQuery(v); setPage(1); }} placeholder="Search person, company, message…" />
        <Select
          label="Status"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v as OutreachStatus | "all"); setPage(1); }}
          options={STATUS_FILTERS.map((s) => ({ value: s, label: s === "all" ? "All" : OUTREACH_STATUS_LABEL[s as OutreachStatus] }))}
        />
        <Select
          label="Stage"
          value={stageFilter}
          onChange={(v) => { setStageFilter(v as OutreachStage | "all"); setPage(1); }}
          options={[
            { value: "all", label: "All" },
            ...OUTREACH_STAGES.map((s) => ({ value: s, label: OUTREACH_STAGE_LABEL[s] })),
          ]}
        />
        <Select
          label="Channel"
          value={channelFilter}
          onChange={(v) => { setChannelFilter(v); setPage(1); }}
          options={[{ value: "all", label: "All" }, ...channels.map((c) => ({ value: c, label: c }))]}
        />
        {(query || statusFilter !== "all" || stageFilter !== "all" || channelFilter !== "all") && (
          <button
            type="button"
            onClick={() => { setQuery(""); setStatusFilter("all"); setStageFilter("all"); setChannelFilter("all"); setPage(1); }}
            className="text-[12px] text-cgs-faint underline-offset-2 hover:text-cgs-ink hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[12px] tabular-nums text-cgs-muted" aria-live="polite">
          {filtered.length.toLocaleString()} result{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg border border-cgs-accent/30 bg-cgs-accent-faint px-3 py-2 text-[12.5px]">
          <span className="font-medium text-cgs-accent-deep">
            {selected.size} selected
          </span>
          <label className="ml-2 flex items-center gap-1.5 text-cgs-muted">
            Set status
            <select
              value=""
              onChange={(e) => e.target.value && bulkStatus(e.target.value as OutreachStatus)}
              aria-label="Bulk status change"
              className="h-7 cursor-pointer rounded-md border border-cgs-line-strong bg-cgs-raised px-1.5 text-[12px]"
            >
              <option value="">Choose…</option>
              {OUTREACH_STATUSES.map((s) => (
                <option key={s} value={s}>{OUTREACH_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </label>
          {confirmDelete ? (
            <span className="flex items-center gap-1.5">
              <span className="text-cgs-danger">Delete {selected.size} record{selected.size === 1 ? "" : "s"}?</span>
              <Button size="sm" variant="danger" onClick={bulkDelete}>Confirm</Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </span>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-cgs-danger hover:bg-cgs-danger-soft">
              Delete
            </Button>
          )}
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-cgs-faint hover:text-cgs-ink">
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-3 min-h-0 flex-1">
        {s2.outreach.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={26} aria-hidden />}
            title="No outreach yet"
            body={
              s2.strategy.primaryChannel
                ? `Your strategy points at ${s2.strategy.primaryChannel}. Add the first prospect you want to reach.`
                : "Define your acquisition channels in Strategy first, then start adding prospects here."
            }
            action={
              <div className="flex items-center gap-2">
                <Link href={dHref("/acquire/strategy")}>
                  <Button variant="secondary">Open Strategy</Button>
                </Link>
                <Button variant="primary" onClick={startCreate}>
                  <Plus size={14} aria-hidden /> Add first record
                </Button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No records match"
            body="Loosen the filters or clear the search to see the rest of your outreach."
            action={
              <Button variant="secondary" size="sm" onClick={() => { setQuery(""); setStatusFilter("all"); setStageFilter("all"); setChannelFilter("all"); }}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <TableShell className="h-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cgs-line">
                  <th scope="col" className="sticky top-0 z-10 w-9 bg-cgs-inset/95 px-3 py-2 backdrop-blur-sm">
                    <input
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={toggleAll}
                      className="accent-[#a5522a]"
                    />
                  </th>
                  <SortHeader label="Person" active={sort.key === "person"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "person", dir: s.key === "person" && s.dir === "asc" ? "desc" : "asc" }))} />
                  <SortHeader label="Company" active={sort.key === "company"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "company", dir: s.key === "company" && s.dir === "asc" ? "desc" : "asc" }))} />
                  <th scope="col" className="sticky top-0 z-10 bg-cgs-inset/95 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-cgs-muted backdrop-blur-sm">Channel</th>
                  <SortHeader label="Status" active={sort.key === "status"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "status", dir: s.key === "status" && s.dir === "asc" ? "desc" : "asc" }))} />
                  <SortHeader label="Contacted" active={sort.key === "dateContacted"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "dateContacted", dir: s.key === "dateContacted" && s.dir === "asc" ? "desc" : "asc" }))} />
                  <SortHeader label="Next follow-up" active={sort.key === "nextFollowUpDate"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "nextFollowUpDate", dir: s.key === "nextFollowUpDate" && s.dir === "asc" ? "desc" : "asc" }))} />
                  <th scope="col" className="sticky top-0 z-10 w-24 bg-cgs-inset/95 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-cgs-muted backdrop-blur-sm">Quick</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => openRecord(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openRecord(r.id);
                    }}
                    tabIndex={0}
                    aria-label={`Open outreach for ${r.person || r.company}`}
                    className={`cursor-pointer border-b border-cgs-line/60 transition-colors last:border-0 hover:bg-cgs-inset/50 focus-visible:bg-cgs-inset/50 ${
                      selected.has(r.id) ? "bg-cgs-accent-faint/60" : ""
                    }`}
                  >
                    <td className={tdCls} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.person || r.company}`}
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="accent-[#a5522a]"
                      />
                    </td>
                    <td className={`${tdCls} max-w-[180px]`}>
                      <span className="block truncate font-medium text-cgs-ink">{r.person || "—"}</span>
                      {r.contact && <span className="block truncate text-[11.5px] text-cgs-faint">{r.contact}</span>}
                    </td>
                    <td className={`${tdCls} max-w-[180px]`}><span className="block truncate">{r.company}</span></td>
                    <td className={tdCls}>{r.channel ? <Pill>{r.channel}</Pill> : <span className="text-cgs-faint">—</span>}</td>
                    <td className={tdCls}><StatusPill status={r.status} /></td>
                    <td className={`${tdCls} whitespace-nowrap tabular-nums`}>{formatCalendarDate(r.dateContacted) || <span className="text-cgs-faint">—</span>}</td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      {r.nextFollowUpDate ? (
                        <span
                          className={
                            relativeDue(r.nextFollowUpDate).includes("overdue")
                              ? "font-medium text-cgs-danger"
                              : "text-cgs-ink-soft"
                          }
                        >
                          {formatCalendarDate(r.nextFollowUpDate)}
                          <span className="ml-1.5 text-[11px] text-cgs-faint">{relativeDue(r.nextFollowUpDate)}</span>
                        </span>
                      ) : (
                        <span className="text-cgs-faint">—</span>
                      )}
                    </td>
                    <td className={`${tdCls} text-right`} onClick={(e) => e.stopPropagation()}>
                      {r.status === "contacted" || r.status === "follow-up" ? (
                        <button
                          type="button"
                          onClick={() => quickStatus(r.id, "replied")}
                          className="rounded-md border border-cgs-line-strong bg-cgs-raised px-2 py-0.5 text-[11.5px] text-cgs-ink-soft hover:border-cgs-accent hover:text-cgs-accent-deep"
                        >
                          Mark replied
                        </button>
                      ) : r.status === "draft" ? (
                        <button
                          type="button"
                          onClick={() => quickStatus(r.id, "contacted")}
                          className="rounded-md border border-cgs-line-strong bg-cgs-raised px-2 py-0.5 text-[11.5px] text-cgs-ink-soft hover:border-cgs-accent hover:text-cgs-accent-deep"
                        >
                          Mark sent
                        </button>
                      ) : r.status === "replied" ? (
                        <button
                          type="button"
                          onClick={() => quickStatus(r.id, "qualified")}
                          className="rounded-md border border-cgs-line-strong bg-cgs-raised px-2 py-0.5 text-[11.5px] text-cgs-ink-soft hover:border-cgs-accent hover:text-cgs-accent-deep"
                        >
                          Qualify
                        </button>
                      ) : (
                        <span aria-hidden className="text-cgs-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={safePage}
              pageSize={pageSize}
              total={filtered.length}
              onPage={setPage}
              onPageSize={(n) => { setPageSize(n); setPage(1); }}
            />
          </TableShell>
        )}
      </div>

      {/* Flash */}
      {flash && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-cgs-ink px-3.5 py-1.5 text-[12.5px] font-medium text-cgs-canvas shadow-cgs-pop" role="status">
          {flash}
        </div>
      )}

      {/* Detail drawer */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={active ? (editing ? (effectiveId === "__new__" ? "New outreach" : "Edit outreach") : active.person || "Outreach record") : "Outreach record"}
        subtitle={
          active && !editing
            ? [active.company, active.channel].filter(Boolean).join(" · ")
            : "Fill in who you are reaching and how."
        }
        width="max-w-2xl"
        footer={
          !editing && active ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="mr-1 text-[11.5px] text-cgs-muted">Status:</span>
                {nextQuickActions(active).map((a) => (
                  <button
                    key={a.status}
                    type="button"
                    onClick={() => quickStatus(active.id, a.status)}
                    className={`rounded-md border px-2 py-1 text-[12px] transition-colors ${
                      a.primary
                        ? "border-cgs-accent bg-cgs-accent text-[#fdf9f4] hover:bg-cgs-accent-deep"
                        : "border-cgs-line-strong bg-cgs-raised text-cgs-ink-soft hover:border-cgs-accent hover:text-cgs-accent-deep"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {active.status === "qualified" && (
                  <CreateOppButton record={active} onDone={say} />
                )}
                <Button size="sm" variant="secondary" onClick={() => startEdit(active)}>
                  Edit
                </Button>
              </div>
            </div>
          ) : draft ? (
            <div className="flex items-center justify-end gap-2">
              {effectiveId !== "__new__" && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              )}
              <Button size="sm" variant="primary" onClick={saveDraft}>
                {effectiveId === "__new__" ? "Create record" : "Save changes"}
              </Button>
            </div>
          ) : undefined
        }
      >
        {active && !editing && <OutreachDetail record={active} />}
        {editing && draft && (
          <OutreachForm
            draft={draft}
            setDraft={setDraft}
            errors={errors}
            channelSuggestions={channelSuggestions}
            offerName={ctx.hasOffer ? ctx.offerName : null}
          />
        )}
      </Drawer>
    </div>
  );
}

/* --------------------------- contextual actions --------------------------- */

function nextQuickActions(r: OutreachRecord): { status: OutreachStatus; label: string; primary: boolean }[] {
  switch (r.status) {
    case "draft":
      return [{ status: "contacted", label: "Mark contacted", primary: true }];
    case "contacted":
    case "follow-up":
      return [
        { status: "replied", label: "They replied", primary: true },
        { status: "not-interested", label: "Not interested", primary: false },
      ];
    case "replied":
      return [
        { status: "qualified", label: "Mark qualified", primary: true },
        { status: "lost", label: "Lost", primary: false },
      ];
    case "qualified":
      return [{ status: "won", label: "Mark converted", primary: false }];
    case "won":
      return [];
    default:
      return [{ status: "contacted", label: "Re-open", primary: false }];
  }
}

function CreateOppButton({ record, onDone }: { record: OutreachRecord; onDone: (msg: string) => void }) {
  const { addOpportunity, setOutreachStatus, data } = useStore();
  const ctx = useMemo(() => buildContext(data), [data]);
  return (
    <Button
      size="sm"
      variant="primary"
      onClick={() => {
        const opp = opportunityFromOutreach(record, ctx);
        addOpportunity(opp);
        setOutreachStatus([record.id], "won");
        onDone("Sales opportunity created from this contact.");
      }}
    >
      <CalendarClock size={13} aria-hidden />
      Create opportunity
    </Button>
  );
}

/* ------------------------------- detail view ------------------------------ */

function OutreachDetail({ record }: { record: OutreachRecord }) {
  const { s2, updateOutreach } = useStore();
  const linkedFollowUps = useMemo(
    () => s2.followUps.filter((t) => t.outreachId === record.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
    [s2.followUps, record.id],
  );
  const openFollowUp = linkedFollowUps.find((t) => !t.completedAt);
  const opp = useMemo(
    () => s2.opportunities.find((o) => o.outreachId === record.id) ?? null,
    [s2.opportunities, record.id],
  );
  const isClosed = ["won", "lost", "not-interested"].includes(record.status);
  const openOpp = opp && opp.outcome === "open";

  return (
    <div className="space-y-5">
      {/* What happens next — always the first thing you see */}
      <section aria-label="Next action" className="rounded-xl border border-cgs-line bg-cgs-inset/50 p-4">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">What happens next</h3>
        {isClosed ? (
          <p className="mt-1.5 text-[13.5px] font-medium text-cgs-ink">
            {record.status === "won"
              ? "Converted." + (openOpp ? " A sales opportunity is active — continue in Sell." : "")
              : record.status === "lost"
                ? "Lost. This record is archived."
                : "Not interested. No further action."}
          </p>
        ) : record.status === "qualified" ? (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-cgs-ink">
            Qualified. Use <em>Create opportunity</em> below to hand this contact to SELL.{" "}
            <Link href={dHref("/sell/opportunities")} className="text-cgs-accent underline-offset-2 hover:underline">
              go to opportunities →
            </Link>
          </p>
        ) : openFollowUp ? (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-cgs-ink">
            <span className="font-medium">Follow up {relativeDue(openFollowUp.dueDate)}</span>{" "}
            <span className="text-cgs-muted">({formatCalendarDate(openFollowUp.dueDate)})</span>
            {" — "}
            {openFollowUp.note}
            {" "}
            <Link href={dHref("/acquire/follow-ups")} className="text-cgs-accent underline-offset-2 hover:underline">
              go to follow-ups →
            </Link>
          </p>
        ) : record.status === "draft" ? (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-cgs-ink">
            Nothing sent yet. Write the message below, then <em>Mark contacted</em> when it goes out.
          </p>
        ) : record.status === "replied" ? (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-cgs-ink">
            They replied. Decide: qualify them against your BUILD criteria, or close the record honestly.
          </p>
        ) : (
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-cgs-ink">
            No follow-up scheduled.{" "}
            <label className="inline-flex items-center gap-1.5 text-cgs-accent">
              <input
                type="date"
                value=""
                aria-label="Schedule next follow-up"
                onChange={(e) => e.target.value && updateOutreach(record.id, { nextFollowUpDate: e.target.value })}
                className="rounded-md border border-cgs-line-strong bg-cgs-raised px-1.5 py-0.5 text-[12.5px]"
              />
              set a date
            </label>
          </p>
        )}
      </section>

      {/* Where they are */}
      <section aria-label="Position" className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-cgs-line bg-cgs-surface p-4">
        <DetailItem label="Status"><StatusPill status={record.status} /></DetailItem>
        <DetailItem label="Stage">{OUTREACH_STAGE_LABEL[record.stage]}</DetailItem>
        <DetailItem label="Channel">{record.channel || "—"}</DetailItem>
        <DetailItem label="Contacted">{formatCalendarDate(record.dateContacted) || "—"}</DetailItem>
        <DetailItem label="Contact info" >{record.contact || "—"}</DetailItem>
        <DetailItem label="Offer">{record.useCurrentOffer ? "Current BUILD offer" : record.offerRef || "Not named"}</DetailItem>
      </section>

      {/* What happened */}
      {record.message && (
        <DetailBlock title="Message sent">{record.message}</DetailBlock>
      )}
      {record.notes && <DetailBlock title="Notes">{record.notes}</DetailBlock>}

      {/* Follow-up history */}
      {linkedFollowUps.length > 0 && (
        <section aria-label="Follow-up history">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Follow-ups on this record</h3>
          <ul className="mt-2 space-y-1.5">
            {linkedFollowUps.slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-cgs-line bg-cgs-surface px-3 py-1.5 text-[12.5px]">
                <span className="min-w-0 truncate text-cgs-ink-soft">
                  {t.completedAt ? "✓ " : "→ "}{t.note || "Follow-up"}
                </span>
                <span className={`shrink-0 tabular-nums ${t.completedAt ? "text-cgs-faint" : t.dueDate < todayISO() ? "font-medium text-cgs-danger" : "text-cgs-muted"}`}>
                  {formatCalendarDate(t.dueDate)}{t.completedAt ? " · done" : ` · ${relativeDue(t.dueDate)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sales handoff */}
      {opp && (
        <section aria-label="Linked sales opportunity" className="rounded-xl border border-[#cfdcc8] bg-cgs-complete-soft/50 p-4">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-complete">Sales handoff</h3>
          <p className="mt-1 text-[13px] text-cgs-ink">
            This contact has a sales opportunity: <span className="font-medium">{opp.prospect} · {opp.company}</span>{" "}
            — stage {opp.stage === "closed" ? `closed (${opp.outcome})` : opp.stage}.
          </p>
          <Link href={dHref(`/sell/opportunities?id=${opp.id}`)} className="mt-2 inline-block text-[12.5px] font-medium text-cgs-accent-deep underline-offset-2 hover:underline">
            Open opportunity →
          </Link>
        </section>
      )}
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">{label}</div>
      <div className="mt-0.5 text-[13px] text-cgs-ink">{children}</div>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap rounded-lg border border-cgs-line bg-cgs-surface px-3.5 py-2.5 text-[13px] leading-relaxed text-cgs-ink-soft">
        {children}
      </p>
    </section>
  );
}
