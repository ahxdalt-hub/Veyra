"use client";

/**
 * RETAIN · Reviews & retention work.
 *
 * Two linked things on one page: the retention action queue (check-ins,
 * renewals, feedback, expansion talks) and the structured Retention Review —
 * the six questions that tell you whether a client is safe and what they
 * need next. Completing a review writes back: it updates the client's
 * satisfaction and schedules the follow-up as a queued action.
 *
 * This is deliberate relationship upkeep, not a support-ticket inbox.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ClipboardCheck,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useStore } from "@/cgs-demo/lib/store";
import {
  buildContext,
  formatCalendarDate,
  relativeDue,
  todayISO,
} from "@/cgs-demo/lib/workflow";
import {
  RETENTION_ACTION_LABEL,
  RETENTION_ACTION_TYPES,
  RetentionAction,
  RetentionReview,
  ReviewSatisfaction,
  clientReviewStatus,
  countRetentionActions,
  missingReviewFields,
  newRetentionAction,
  newRetentionReview,
  retentionActionBucket,
} from "@/cgs-demo/lib/delivery";
import { Button, formatWhen } from "@/cgs-demo/components/ui";
import {
  DateField,
  Drawer,
  EmptyState,
  Pill,
  TableShell,
  TextAreaLite,
  TextFieldLite,
  tdCls,
  thCls,
} from "@/cgs-demo/components/data";

const ACTION_TONE: Record<RetentionAction["type"], "neutral" | "accent" | "complete" | "refine" | "danger"> = {
  "check-in": "neutral",
  review: "accent",
  renewal: "refine",
  feedback: "neutral",
  expansion: "accent",
  "follow-up": "neutral",
};

/* ---------------------------------- page ---------------------------------- */

export default function ReviewsPage() {
  return (
    <Suspense fallback={null}>
      <ReviewsInner />
    </Suspense>
  );
}

function ReviewsInner() {
  const { s3 } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectClient = searchParams.get("client");

  const [tab, setTab] = useState<"due" | "actions" | "history">(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("veyra-retain-tab") === "actions") return "actions";
    return "due";
  });
  const [reviewFor, setReviewFor] = useState<string | null>(preselectClient);
  const [actionOpen, setActionOpen] = useState(false);

  const setTabPersist = (t: typeof tab) => {
    setTab(t);
    window.localStorage.setItem("veyra-retain-tab", t);
  };

  const live = s3.clients.filter((c) => c.status === "active" || c.status === "at-risk" || c.status === "paused");
  const dueNow = live.filter((c) => {
    const st = clientReviewStatus(c, s3.reviews);
    return st === "overdue" || st === "due" || st === "unscheduled";
  });
  const counts = useMemo(() => countRetentionActions(s3.actions), [s3.actions]);
  const openActions = useMemo(
    () =>
      s3.actions
        .filter((a) => !a.completedAt)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [s3.actions],
  );
  const completedActions = useMemo(
    () =>
      s3.actions
        .filter((a) => a.completedAt)
        .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? "")),
    [s3.actions],
  );
  const doneReviews = s3.reviews
    .filter((r) => r.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  const openReviews = s3.reviews.filter((r) => !r.completedAt);

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-7 md:px-9">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
            <span>Retain</span>
            <span aria-hidden>·</span>
            <span>Reviews</span>
          </div>
          <h2 className="mt-1 flex items-center gap-2 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">
            <ClipboardCheck size={20} className="text-cgs-accent" aria-hidden />
            Retention Reviews & Actions
          </h2>
          <p className="mt-1 text-[13px] text-cgs-muted" aria-live="polite">
            {dueNow.length > 0
              ? `${dueNow.length} client${dueNow.length === 1 ? "" : "s"} need${dueNow.length === 1 ? "s" : ""} attention`
              : live.length > 0
                ? "Every active client is on schedule."
                : "Reviews start once you have active clients."}
            {counts.overdue > 0 ? ` · ${counts.overdue} action${counts.overdue === 1 ? "" : "s"} overdue` : ""}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setActionOpen(true)}>
          <Plus size={14} aria-hidden /> New action
        </Button>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex items-center gap-1 rounded-lg border border-cgs-line bg-cgs-surface p-1 shadow-cgs-card sm:w-fit" role="tablist" aria-label="Retention work">
        {(
          [
            { id: "due", label: "Reviews due", n: dueNow.length + openReviews.length, urgent: dueNow.some((c) => clientReviewStatus(c, s3.reviews) === "overdue") },
            { id: "actions", label: "Action queue", n: counts.overdue + counts.dueToday + counts.upcoming, urgent: counts.overdue > 0 },
            { id: "history", label: "History", n: doneReviews.length + completedActions.length, urgent: false },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTabPersist(t.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-[12.5px] transition-colors sm:flex-none ${
              tab === t.id ? "bg-cgs-accent-faint font-medium text-cgs-accent-deep" : "text-cgs-muted hover:bg-cgs-inset hover:text-cgs-ink"
            }`}
          >
            {t.label}
            <span className={`ml-1.5 tabular-nums ${t.urgent ? "font-semibold text-cgs-danger" : "text-cgs-faint"}`}>{t.n}</span>
          </button>
        ))}
      </div>

      {/* Reviews due */}
      {tab === "due" && (
        <div className="mt-4 space-y-5">
          {openReviews.length > 0 && (
            <section aria-label="Reviews in progress" className="rounded-xl border border-cgs-accent/35 bg-cgs-accent-faint/50 p-4">
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-accent-deep">Started, not finished</h3>
              <ul className="mt-2 space-y-1.5">
                {openReviews.map((r) => {
                  const c = s3.clients.find((x) => x.id === r.clientId);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setReviewFor(r.clientId)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-cgs-line bg-cgs-surface px-3 py-2 text-left text-[13px] hover:border-cgs-accent/50"
                      >
                        <span className="truncate font-medium text-cgs-ink">{c?.company || c?.contact || "Removed client"}</span>
                        <span className="flex shrink-0 items-center gap-2 text-[12px] text-cgs-muted">
                          {missingReviewFields(r).length} answers left · {relativeDue(r.date)} <ArrowRight size={11} aria-hidden />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {live.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck size={26} aria-hidden />}
              title="No active clients yet"
              body="Retention work begins when an onboarding completes in DELIVER. Clients land in RETAIN with the first review scheduled thirty days out."
              action={<Link href={dHref("/deliver/onboarding")}><Button variant="secondary">Client onboarding</Button></Link>}
            />
          ) : dueNow.length === 0 ? (
            <EmptyState
              icon={<Check size={26} aria-hidden />}
              title="Nothing due"
              body="Every active client has a review date ahead of today. Keep the rhythm — the work is the relationship."
            />
          ) : (
            <TableShell>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-cgs-line">
                    <th scope="col" className={thCls}>Client</th>
                    <th scope="col" className={thCls}>Situation</th>
                    <th scope="col" className={thCls}>Review date</th>
                    <th scope="col" className={`${thCls} text-right`}>Act</th>
                  </tr>
                </thead>
                <tbody>
                  {dueNow.map((c) => {
                    const st = clientReviewStatus(c, s3.reviews);
                    return (
                      <tr key={c.id} className="border-b border-cgs-line/60 last:border-0">
                        <td className={tdCls}>
                          <Link href={dHref(`/retain/clients?id=${c.id}`)} className="block truncate font-medium text-cgs-ink hover:text-cgs-accent-deep">
                            {c.company || c.contact}
                          </Link>
                          <span className="block truncate text-[11.5px] text-cgs-faint">{c.contact}</span>
                        </td>
                        <td className={tdCls}>
                          {st === "unscheduled" ? (
                            <Pill tone="refine">Never reviewed</Pill>
                          ) : c.status === "at-risk" ? (
                            <Pill tone="danger">At risk</Pill>
                          ) : (
                            <Pill tone="accent">Scheduled review</Pill>
                          )}
                        </td>
                        <td className={`${tdCls} whitespace-nowrap`}>
                          {c.nextReviewDate ? (
                            <span className={st === "overdue" ? "font-medium text-cgs-danger" : "text-cgs-ink-soft"}>
                              {formatCalendarDate(c.nextReviewDate)} <span className="text-[11px] text-cgs-faint">{relativeDue(c.nextReviewDate)}</span>
                            </span>
                          ) : (
                            <span className="text-cgs-faint">not set</span>
                          )}
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <Button size="sm" variant={st === "overdue" ? "primary" : "secondary"} onClick={() => setReviewFor(c.id)}>
                            Start review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableShell>
          )}
        </div>
      )}

      {/* Action queue */}
      {tab === "actions" && (
        <div className="mt-4">
          {openActions.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck size={26} aria-hidden />}
              title="Queue is clear"
              body="Check-ins, renewals, feedback asks and expansion conversations live here. A completed review queues its follow-up automatically, or add one manually."
              action={<Button variant="secondary" onClick={() => setActionOpen(true)}><Plus size={13} aria-hidden /> New action</Button>}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-cgs-line">
                    <th scope="col" className={thCls}>Action</th>
                    <th scope="col" className={thCls}>Client</th>
                    <th scope="col" className={thCls}>Due</th>
                    <th scope="col" className={`${thCls} w-28 text-right`}>Done</th>
                  </tr>
                </thead>
                <tbody>
                  {openActions.map((a) => {
                    const c = s3.clients.find((x) => x.id === a.clientId);
                    const b = retentionActionBucket(a);
                    return (
                      <tr key={a.id} className={`border-b border-cgs-line/60 last:border-0 ${b === "overdue" ? "bg-cgs-danger-soft/40" : ""}`}>
                        <td className={`${tdCls} max-w-[320px]`}>
                          <span className="flex items-center gap-2">
                            <Pill tone={ACTION_TONE[a.type]}>{RETENTION_ACTION_LABEL[a.type]}</Pill>
                            {a.origin === "review" && <span className="text-[10.5px] text-cgs-faint">from review</span>}
                          </span>
                          {a.note && <span className="mt-1 block truncate text-[12.5px] text-cgs-ink-soft">{a.note}</span>}
                        </td>
                        <td className={tdCls}>
                          {c ? (
                            <Link href={dHref(`/retain/clients?id=${c.id}`)} className="truncate text-cgs-ink hover:text-cgs-accent-deep">{c.company || c.contact}</Link>
                          ) : (
                            <span className="text-cgs-faint">removed</span>
                          )}
                        </td>
                        <td className={`${tdCls} whitespace-nowrap`}>
                          <span className={b === "overdue" ? "font-medium text-cgs-danger" : b === "today" ? "font-medium text-cgs-accent-deep" : "text-cgs-ink-soft"}>
                            {formatCalendarDate(a.dueDate)} <span className="text-[11px] text-cgs-faint">{relativeDue(a.dueDate)}</span>
                          </span>
                        </td>
                        <td className={`${tdCls} text-right`}>
                          <ActionRowButtons action={a} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {tab === "history" && (
        <div className="mt-4 space-y-5">
          <section aria-label="Completed reviews" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
            <div className="border-b border-cgs-line/70 px-5 py-3">
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Completed reviews ({doneReviews.length})</h3>
            </div>
            {doneReviews.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-cgs-muted">No reviews completed yet.</p>
            ) : (
              <ul className="divide-y divide-cgs-line/60">
                {doneReviews.slice(0, 20).map((r) => {
                  const c = s3.clients.find((x) => x.id === r.clientId);
                  return (
                    <li key={r.id} className="px-5 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13px] font-medium text-cgs-ink">{c?.company || c?.contact || "Removed client"}</span>
                        <span className="shrink-0 text-[11px] tabular-nums text-cgs-faint">{formatCalendarDate(r.date)}</span>
                      </div>
                      {r.valueDelivered && <p className="mt-0.5 line-clamp-2 text-[12.5px] text-cgs-muted">{r.valueDelivered}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px]">
                        <Pill tone={r.satisfaction === "satisfied" ? "complete" : r.satisfaction === "at-risk" ? "danger" : "neutral"}>
                          {r.satisfaction || "not stated"}
                        </Pill>
                        {r.nextStep && <span className="truncate text-cgs-ink-soft">→ {r.nextStep}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {completedActions.length > 0 && (
            <section aria-label="Completed actions" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
              <div className="border-b border-cgs-line/70 px-5 py-3">
                <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Completed actions ({completedActions.length})</h3>
              </div>
              <ul className="divide-y divide-cgs-line/60">
                {completedActions.slice(0, 15).map((a) => {
                  const c = s3.clients.find((x) => x.id === a.clientId);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[13px]">
                      <span className="min-w-0 truncate text-cgs-muted">
                        <span className="line-through">{a.note || RETENTION_ACTION_LABEL[a.type]}</span>
                        <span className="ml-1.5 text-[11.5px] text-cgs-faint">· {c?.company || c?.contact || "removed"}</span>
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-cgs-faint">{a.completedAt ? formatWhen(a.completedAt) : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      {reviewFor && <ReviewDrawer clientId={reviewFor} onClose={() => { setReviewFor(null); if (preselectClient) router.replace(dHref("/retain/reviews")); }} />}
      {actionOpen && <NewActionDrawer onClose={() => setActionOpen(false)} />}
    </div>
  );
}

/* --------------------------------- helpers -------------------------------- */

function ActionRowButtons({ action }: { action: RetentionAction }) {
  const { completeRetentionAction, reopenRetentionAction, removeRetentionAction } = useStore();
  const [confirm, setConfirm] = useState(false);
  if (action.completedAt)
    return (
      <button
        type="button"
        onClick={() => reopenRetentionAction(action.id)}
        className="inline-flex items-center gap-1 rounded-md border border-cgs-line-strong bg-cgs-raised px-2 py-0.5 text-[11.5px] text-cgs-muted hover:text-cgs-ink"
        aria-label={`Reopen action ${action.note}`}
      >
        <RotateCcw size={10} aria-hidden /> Reopen
      </button>
    );
  return (
    <span className="inline-flex items-center gap-1.5">
      {confirm ? (
        <>
          <Button size="sm" variant="danger" onClick={() => removeRetentionAction(action.id)}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>No</Button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            aria-label={`Delete action ${action.note}`}
            className="rounded-md p-1 text-cgs-faint hover:bg-cgs-danger-soft hover:text-cgs-danger"
          >
            <Trash2 size={11} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => completeRetentionAction(action.id)}
            className="inline-flex items-center gap-1 rounded-md border border-[#cfdcc8] bg-cgs-complete-soft px-2 py-0.5 text-[11.5px] font-medium text-cgs-complete hover:bg-[#d8e4d1]"
            aria-label={`Mark done: ${action.note || action.type}`}
          >
            <Check size={10} aria-hidden /> Done
          </button>
        </>
      )}
    </span>
  );
}

/* ------------------------------- review form ------------------------------- */

function ReviewDrawer({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { s3, data, addReview, updateReview, completeReview, updateClient } = useStore();
  const ctx = useMemo(() => buildContext(data), [data]);
  const client = s3.clients.find((c) => c.id === clientId) ?? null;
  // Reuse this client's open review if one exists; otherwise start fresh.
  const open = s3.reviews.find((r) => r.clientId === clientId && !r.completedAt) ?? null;
  const [draft, setDraft] = useState<RetentionReview>(() => open ?? newRetentionReview({ clientId }));
  const [showErrors, setShowErrors] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const clientReviews = s3.reviews
    .filter((r) => r.clientId === clientId && r.completedAt)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  if (!client) return null;
  const missing = missingReviewFields(draft);
  const set = (p: Partial<RetentionReview>) => setDraft((d) => ({ ...d, ...p }));

  const save = () => {
    if (open) updateReview(draft.id, draft);
    else addReview({ ...draft, clientId });
  };
  const complete = () => {
    const e = missingReviewFields(draft);
    setErrors(e);
    setShowErrors(true);
    if (e.length > 0) return;
    save();
    completeReview(draft.id);
    // When the review schedules no follow-up at all, keep the client on the
    // books with a default 30-day rhythm (reviewCompletionEffects handles
    // the dated cases; this is the fallback).
    if (!draft.followUpType && !client.nextReviewDate) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      updateClient(client.id, { nextReviewDate: todayISO(d) });
    }
    onClose();
  };

  const field = (k: keyof RetentionReview) => showErrors && errors.includes(labelFor(k));

  return (
    <Drawer
      open
      onClose={onClose}
      width="max-w-2xl"
      title={
        <span className="flex items-center gap-2">
          Retention review · {client.company || client.contact}
          <Pill tone={client.status === "at-risk" ? "danger" : "neutral"}>{client.status}</Pill>
        </span>
      }
      subtitle={`${client.contact} · ${ctx.hasOffer ? ctx.offerName : client.offerRef || "Offer not named"}${client.startDate ? ` · since ${formatCalendarDate(client.startDate)}` : ""}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-[12px] text-cgs-faint">
            {missing.length > 0 ? `Needed: ${missing.join(", ")}` : "All core answers in — completing writes back to the client."}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button size="sm" variant="secondary" onClick={save}>{open ? "Save draft" : "Save as draft"}</Button>
            <Button size="sm" variant="primary" onClick={complete}>
              <Check size={13} aria-hidden /> Complete review
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {showErrors && errors.length > 0 && (
          <p className="rounded-lg bg-cgs-danger-soft px-3 py-2 text-[12.5px] text-cgs-danger" role="alert">
            Answer these before completing: {errors.join(", ")}.
          </p>
        )}

        {/* Context so the answers are not written from memory */}
        <section aria-label="Client snapshot" className="rounded-xl border border-cgs-line bg-cgs-inset/50 p-4">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">What you both know so far</h3>
          <dl className="mt-2 grid gap-2 text-[13px] sm:grid-cols-2">
            <div><dt className="text-[11px] text-cgs-faint">Recent work</dt><dd className="text-cgs-ink-soft">{client.recentWork || <em className="text-cgs-faint">not noted</em>}</dd></div>
            <div><dt className="text-[11px] text-cgs-faint">Upcoming needs</dt><dd className="text-cgs-ink-soft">{client.upcomingNeeds || <em className="text-cgs-faint">not noted</em>}</dd></div>
            <div><dt className="text-[11px] text-cgs-faint">Renewal</dt><dd className="text-cgs-ink-soft">{client.renewalDate ? formatCalendarDate(client.renewalDate) : "—"}{client.renewalNote ? ` · ${client.renewalNote}` : ""}</dd></div>
            <div><dt className="text-[11px] text-cgs-faint">Expansion ideas</dt><dd className="text-cgs-ink-soft">{client.expansionIdeas.length ? client.expansionIdeas.join("; ") : <em className="text-cgs-faint">none</em>}</dd></div>
          </dl>
        </section>

        {/* The six questions */}
        <Q index="1" label="Is the client satisfied?" error={field("satisfaction")}>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Is the client satisfied?">
            {(["satisfied", "neutral", "at-risk"] as ReviewSatisfaction[]).map((v) => (
              <label key={v} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${draft.satisfaction === v ? "border-cgs-accent bg-cgs-accent-faint font-medium text-cgs-accent-deep" : "border-cgs-line-strong bg-cgs-raised text-cgs-muted hover:text-cgs-ink"}`}>
                <input type="radio" name="satisfaction" value={v} checked={draft.satisfaction === v} onChange={() => set({ satisfaction: v })} className="sr-only" />
                {v === "satisfied" ? "Satisfied" : v === "neutral" ? "Neutral" : "At risk"}
              </label>
            ))}
          </div>
        </Q>

        <Q index="2" label="What value have we delivered?" hint="The concrete outcomes they can point to this period." error={field("valueDelivered")}>
          <TextAreaLite label="" value={draft.valueDelivered} onChange={(v) => set({ valueDelivered: v })} rows={2} placeholder="e.g. Cut reporting time from days to hours; their board praised the dashboard" />
        </Q>

        <Q index="3" label="What does the client need next?" error={field("nextNeeds")}>
          <TextAreaLite label="" value={draft.nextNeeds} onChange={(v) => set({ nextNeeds: v })} rows={2} placeholder="e.g. They are hiring two analysts and need training" />
        </Q>

        <Q index="4" label="Are there risks?" hint="Be honest — silence is not safety. Leave empty if none.">
          <TextAreaLite label="" value={draft.risks} onChange={(v) => set({ risks: v })} rows={2} placeholder="e.g. Budget freeze rumored; champion may move teams" />
        </Q>

        <Q index="5" label="Are there opportunities?" hint="Expansion, referrals, deeper scope — evidence, not hope.">
          <TextAreaLite label="" value={draft.opportunities} onChange={(v) => set({ opportunities: v })} rows={2} placeholder="e.g. Their marketing team asked about landing-page audits" />
        </Q>

        <Q index="6" label="What should we do next?" error={field("nextStep")}>
          <TextFieldLite label="" value={draft.nextStep} onChange={(v) => set({ nextStep: v })} placeholder="One concrete step, e.g. Scope the analyst training in a one-pager" />
        </Q>

        {/* Follow-up — becomes a queued action on completion */}
        <section aria-label="Follow-up" className="rounded-xl border border-cgs-line bg-cgs-surface p-4">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Follow-through</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_170px] sm:items-end">
            <label className="space-y-1">
              <span className="block text-[12px] font-medium text-cgs-ink">Queue which action?</span>
              <select
                value={draft.followUpType}
                onChange={(e) => set({ followUpType: e.target.value as RetentionReview["followUpType"] })}
                aria-label="Follow-up action type"
                className="h-8 w-full cursor-pointer rounded-lg border border-cgs-line-strong bg-cgs-raised px-2 text-[13px] text-cgs-ink focus:border-cgs-accent"
              >
                <option value="">None</option>
                {RETENTION_ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{RETENTION_ACTION_LABEL[t]}</option>
                ))}
              </select>
            </label>
            <DateField label="Due" value={draft.followUpDue} onChange={(v) => set({ followUpDue: v })} />
          </div>
          <p className="mt-1.5 text-[11.5px] text-cgs-muted">
            The due date also sets the client’s next review date — this keeps the schedule honest.
          </p>
        </section>

        {clientReviews.length > 0 && (
          <section aria-label="Previous reviews for this client">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Previous reviews</h3>
            <ol className="mt-2 space-y-1.5">
              {clientReviews.slice(0, 4).map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3 rounded-lg border border-cgs-line bg-cgs-inset/40 px-3 py-1.5 text-[12.5px]">
                  <span className="min-w-0 truncate text-cgs-ink-soft">{r.satisfaction || "—"} · {r.nextStep || r.valueDelivered || "no next step recorded"}</span>
                  <span className="shrink-0 tabular-nums text-cgs-faint">{formatCalendarDate(r.date)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </Drawer>
  );
}

const LABELS: Record<string, string> = {
  satisfaction: "Satisfaction",
  valueDelivered: "Value delivered",
  nextNeeds: "What they need next",
  nextStep: "Next step",
};
function labelFor(k: keyof RetentionReview): string {
  return LABELS[k as string] ?? String(k);
}

function Q({
  index,
  label,
  hint,
  error,
  children,
}: {
  index: string;
  label: string;
  hint?: string;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className={`flex items-center gap-2 text-[13px] font-semibold ${error ? "text-cgs-danger" : "text-cgs-ink"}`}>
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cgs-line-strong bg-cgs-inset text-[10.5px] tabular-nums text-cgs-muted" aria-hidden>{index}</span>
        {label}
        {error && <span className="text-[11.5px] font-normal">— required</span>}
      </h3>
      {hint && <p className="ml-7 mt-0.5 text-[11.5px] text-cgs-muted">{hint}</p>}
      <div className="ml-7 mt-1.5">{children}</div>
    </section>
  );
}

/* ------------------------------- new action -------------------------------- */

function NewActionDrawer({ onClose }: { onClose: () => void }) {
  const { s3, addRetentionAction } = useStore();
  const eligible = s3.clients.filter((c) => c.status !== "churned");
  const [clientId, setClientId] = useState(eligible[0]?.id ?? "");
  const [type, setType] = useState<RetentionAction["type"]>("check-in");
  const [note, setNote] = useState("");
  const [due, setDue] = useState<string | null>(todayISO());
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!clientId) {
      setError("Pick a client.");
      return;
    }
    addRetentionAction(newRetentionAction({ clientId, type, note: note.trim(), dueDate: due ?? todayISO() }));
    onClose();
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title="New retention action"
      subtitle="The scheduled upkeep that keeps relationships alive between reviews."
      width="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" onClick={submit} disabled={eligible.length === 0}>Queue action</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {eligible.length === 0 ? (
          <p className="text-[13px] text-cgs-muted">Add a client first — actions attach to a relationship.</p>
        ) : (
          <>
            <label className="space-y-1">
              <span className="block text-[12px] font-medium text-cgs-ink">Client</span>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                aria-label="Client"
                className="h-9 w-full cursor-pointer rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 text-[13px] text-cgs-ink focus:border-cgs-accent"
              >
                {eligible.map((c) => (
                  <option key={c.id} value={c.id}>{c.company || c.contact}</option>
                ))}
              </select>
              {error && <span className="block text-[11.5px] text-cgs-danger" role="alert">{error}</span>}
            </label>
            <div>
              <span className="mb-1 block text-[12px] font-medium text-cgs-ink">Type</span>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Action type">
                {RETENTION_ACTION_TYPES.map((t) => (
                  <label key={t} className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-[12.5px] transition-colors ${type === t ? "border-cgs-accent bg-cgs-accent-faint font-medium text-cgs-accent-deep" : "border-cgs-line-strong bg-cgs-raised text-cgs-muted hover:text-cgs-ink"}`}>
                    <input type="radio" name="action-type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                    {RETENTION_ACTION_LABEL[t]}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_170px] sm:items-end">
              <TextFieldLite label="Note" value={note} onChange={setNote} placeholder="e.g. Ask how the Q3 report landed; float the training idea" />
              <DateField label="Due" value={due} onChange={setDue} allowClear={false} />
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
