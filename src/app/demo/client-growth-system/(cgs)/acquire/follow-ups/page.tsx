"use client";

/**
 * ACQUIRE · Follow-up.
 *
 * The attention queue. Every open follow-up is bucketed overdue / today /
 * upcoming; completed ones move to history. Tasks linked to outreach records
 * show who they concern and why; the next action is always obvious.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, Check, Inbox, Plus, RotateCcw } from "lucide-react";
import { useStore } from "@/cgs-demo/lib/store";
import {
  FollowUpTask,
  OUTREACH_STATUS_LABEL,
  OutreachRecord,
  countFollowUps,
  filterFollowUps,
  followUpBucket,
  followUpSubject,
  formatCalendarDate,
  newFollowUp,
  nextFollowUp,
  relativeDue,
  todayISO,
} from "@/cgs-demo/lib/workflow";
import { Button } from "@/cgs-demo/components/ui";
import {
  DateField,
  EmptyState,
  Pill,
  SearchInput,
  TextFieldLite,
  thCls,
  tdCls,
} from "@/cgs-demo/components/data";

type Bucket = "overdue" | "today" | "upcoming" | "completed" | "all";

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Due today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
];

export default function FollowUpsPage() {
  const { s2, addFollowUp, updateOutreach } = useStore();
  const [bucket, setBucket] = useState<Bucket>("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newDate, setNewDate] = useState<string | null>(todayISO());
  const [newLink, setNewLink] = useState<string>("");

  const counts = useMemo(() => countFollowUps(s2.followUps), [s2.followUps]);
  const nextUp = useMemo(() => nextFollowUp(s2.followUps), [s2.followUps]);

  const outreachById = useMemo(() => {
    const m = new Map<string, OutreachRecord>();
    for (const r of s2.outreach) m.set(r.id, r);
    return m;
  }, [s2.outreach]);

  const visible = useMemo(() => {
    const tasks = filterFollowUps(
      s2.followUps,
      s2.outreach,
      {
        status: bucket === "completed" ? "completed" : bucket === "all" ? "all" : "active",
        bucket: bucket === "completed" || bucket === "all" ? "all" : bucket,
        query,
      },
    );
    return tasks.sort((a, b) =>
      bucket === "completed"
        ? (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
        : a.dueDate.localeCompare(b.dueDate),
    );
  }, [s2.followUps, s2.outreach, bucket, query]);

  const linkedRecords = useMemo(
    () => s2.outreach.filter((r) => !["won", "lost", "not-interested"].includes(r.status) && !r.nextFollowUpDate),
    [s2.outreach],
  );

  const saveNew = () => {
    if (!newNote.trim() || !newDate) return;
    addFollowUp(
      newFollowUp({
        note: newNote.trim(),
        dueDate: newDate,
        outreachId: newLink || null,
      }),
    );
    if (newLink) {
      // Reflect on the outreach record so both views agree.
      const rec = outreachById.get(newLink);
      if (rec && rec.nextFollowUpDate !== newDate) updateOutreach(newLink, { nextFollowUpDate: newDate });
    }
    setNewNote("");
    setNewLink("");
    setAdding(false);
  };

  const attentionLine =
    counts.overdue > 0
      ? `${counts.overdue} overdue`
      : counts.dueToday > 0
        ? `${counts.dueToday} due today`
        : nextUp
          ? `Next follow-up ${relativeDue(nextUp.dueDate)} (${formatCalendarDate(nextUp.dueDate)})`
          : "Nothing pending";

  return (
    <div className="mx-auto max-w-[980px] px-6 py-7 md:px-9">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
            <span>Acquire</span>
            <span aria-hidden>·</span>
            <span>Follow-ups</span>
          </div>
          <h2 className="mt-1 flex items-center gap-2 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">
            <CalendarClock size={20} className="text-cgs-accent" aria-hidden />
            Follow-ups
          </h2>
          <p className="mt-1 text-[13px] text-cgs-muted" aria-live="polite">
            {counts.dueToday > 0 ? `${counts.dueToday} due today` : "None due today"}
            {" · "}
            {counts.overdue > 0 ? <span className="font-medium text-cgs-danger">{counts.overdue} overdue</span> : "nothing overdue"}
            {" · "}
            {attentionLine !== "Nothing pending" && nextUp && (
              <>next {relativeDue(nextUp.dueDate)}</>
            )}
            {attentionLine === "Nothing pending" && "Nothing pending — the queue is clear."}
          </p>
        </div>
        <Button variant="primary" onClick={() => setAdding((v) => !v)}>
          <Plus size={14} aria-hidden />
          Manual follow-up
        </Button>
      </div>

      {/* Quick add */}
      {adding && (
        <div className="mt-4 rounded-xl border border-cgs-accent/35 bg-cgs-accent-faint/60 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_220px_auto] sm:items-end">
            <TextFieldLite label="What needs doing" value={newNote} onChange={setNewNote} placeholder="e.g. Send the case study they asked for" />
            <DateField label="Due" value={newDate} onChange={setNewDate} allowClear={false} />
            <label className="space-y-1">
              <span className="block text-[12px] font-medium text-cgs-ink">Outreach record <span className="text-cgs-faint">(optional)</span></span>
              <select
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                aria-label="Link to outreach record"
                className="w-full cursor-pointer rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink focus:border-cgs-accent"
              >
                <option value="">Not linked</option>
                {linkedRecords.map((r) => (
                  <option key={r.id} value={r.id}>{r.person} · {r.company}</option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button variant="primary" onClick={saveNew} disabled={!newNote.trim() || !newDate}>Add</Button>
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
          {linkedRecords.length === 0 && !newLink && (
            <p className="mt-2 text-[11.5px] text-cgs-muted">No open outreach records to link yet — manual follow-ups stand alone.</p>
          )}
        </div>
      )}

      {/* Bucket tabs */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Follow-up buckets" className="flex items-center gap-1 rounded-lg border border-cgs-line bg-cgs-surface p-1 shadow-cgs-card">
          {BUCKETS.map((b) => {
            const n =
              b.id === "overdue" ? counts.overdue
              : b.id === "today" ? counts.dueToday
              : b.id === "upcoming" ? counts.upcoming
              : b.id === "completed" ? counts.completed
              : counts.overdue + counts.dueToday + counts.upcoming + counts.completed;
            const activeTab = bucket === b.id;
            return (
              <button
                key={b.id}
                role="tab"
                aria-selected={activeTab}
                type="button"
                onClick={() => setBucket(b.id)}
                className={`rounded-md px-2.5 py-1 text-[12.5px] transition-colors ${
                  activeTab ? "bg-cgs-accent-faint font-medium text-cgs-accent-deep" : "text-cgs-muted hover:bg-cgs-inset hover:text-cgs-ink"
                }`}
              >
                {b.label}
                <span className={`ml-1.5 tabular-nums ${b.id === "overdue" && counts.overdue > 0 ? "font-semibold text-cgs-danger" : "text-cgs-faint"}`}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search follow-ups…" className="sm:max-w-56" />
      </div>

      {/* List */}
      <div className="mt-4">
        {s2.followUps.length === 0 ? (
          <EmptyState
            icon={<Inbox size={26} aria-hidden />}
            title="No follow-ups yet"
            body="Set a next-follow-up date on an outreach record and it appears here automatically, or add a manual one above."
            action={
              <Link href={dHref("/acquire/outreach")}>
                <Button variant="secondary">Go to Outreach</Button>
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Check size={26} aria-hidden />}
            title={
              bucket === "overdue" ? "Nothing overdue"
              : bucket === "today" ? "Nothing due today"
              : bucket === "completed" ? "No completed follow-ups yet"
              : bucket === "upcoming" ? "Nothing scheduled ahead"
              : "Queue is clear"
            }
            body={
              query
                ? "No follow-ups match this search."
                : bucket === "today"
                  ? `${counts.upcoming} upcoming. Good time to push outreach forward.`
                  : "Follow-ups appear here when you schedule them on outreach records."
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cgs-line">
                  <th scope="col" className={thCls}>Action</th>
                  <th scope="col" className={thCls}>Who</th>
                  <th scope="col" className={thCls}>Due</th>
                  <th scope="col" className={`${thCls} w-32 text-right`}>Done</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <FollowUpRow
                    key={t.id}
                    task={t}
                    record={t.outreachId ? outreachById.get(t.outreachId) ?? null : null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FollowUpRow({ task, record }: { task: FollowUpTask; record: OutreachRecord | null }) {
  const { completeFollowUp, reopenFollowUp } = useStore();
  const b = followUpBucket(task);
  const done = !!task.completedAt;
  const subject = record ? `${record.person} · ${record.company}` : followUpSubject(task, []);

  return (
    <tr className={`border-b border-cgs-line/60 last:border-0 ${b === "overdue" && !done ? "bg-cgs-danger-soft/40" : ""}`}>
      <td className={`${tdCls} max-w-[340px]`}>
        <span className="block font-medium text-cgs-ink">{task.note || "Follow-up"}</span>
        {record && (
          <Link href={dHref(`/acquire/outreach?id=${record.id}`)} className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-cgs-accent hover:text-cgs-accent-deep">
            open record <ArrowRight size={10} aria-hidden />
          </Link>
        )}
      </td>
      <td className={tdCls}>
        <span className="block truncate text-cgs-ink-soft" title={subject}>{subject}</span>
        <span className="mt-0.5 block">
          {record ? <Pill tone="neutral">{OUTREACH_STATUS_LABEL[record.status]}</Pill> : <Pill tone="neutral">manual</Pill>}
        </span>
      </td>
      <td className={`${tdCls} whitespace-nowrap`}>
        <span className={done ? "text-cgs-faint" : b === "overdue" ? "font-medium text-cgs-danger" : b === "today" ? "font-medium text-cgs-accent-deep" : "text-cgs-ink-soft"}>
          {formatCalendarDate(task.dueDate)}
          <span className="ml-1.5 text-[11px] text-cgs-faint">{done ? "completed" : relativeDue(task.dueDate)}</span>
        </span>
      </td>
      <td className={`${tdCls} text-right`}>
        {done ? (
          <button
            type="button"
            onClick={() => reopenFollowUp(task.id)}
            className="inline-flex items-center gap-1 rounded-md border border-cgs-line-strong bg-cgs-raised px-2 py-0.5 text-[11.5px] text-cgs-muted hover:text-cgs-ink"
            aria-label={`Reopen follow-up ${task.note}`}
          >
            <RotateCcw size={10} aria-hidden /> Reopen
          </button>
        ) : (
          <button
            type="button"
            onClick={() => completeFollowUp(task.id)}
            className="inline-flex items-center gap-1 rounded-md border border-[#cfdcc8] bg-cgs-complete-soft px-2 py-0.5 text-[11.5px] font-medium text-cgs-complete hover:bg-[#d8e4d1]"
            aria-label={`Mark done: ${task.note}`}
          >
            <Check size={10} aria-hidden /> Done
          </button>
        )}
      </td>
    </tr>
  );
}
