"use client";

/**
 * GROW · Growth Reviews.
 *
 * The look-back that closes the loop: once a period ends, you write down
 * what worked, what didn't, and the lessons per stage — with the period's
 * real numbers beside you, pulled from the records themselves. History is
 * kept so improvement is visible, not felt.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  LineChart,
  Plus,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { useStore } from "@/cgs-demo/lib/store";
import { formatValue } from "@/cgs-demo/lib/workflow";
import {
  GROWTH_PERIODS,
  GROWTH_PERIOD_LABEL,
  GrowthReview,
  missingGrowthReviewFields,
  newGrowthReview,
  periodMetrics,
  suggestPeriod,
} from "@/cgs-demo/lib/delivery";
import { Pill } from "@/cgs-demo/components/data";
import { DateField, Drawer, EmptyState, TextAreaLite, TextFieldLite } from "@/cgs-demo/components/data";
import { Button } from "@/cgs-demo/components/ui";

/* ---------------------------------- page ---------------------------------- */

export default function GrowthPage() {
  return (
    <Suspense fallback={null}>
      <GrowthInner />
    </Suspense>
  );
}

function GrowthInner() {
  const { s3, data } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepId = searchParams.get("id");
  const newPeriod = searchParams.get("new") as GrowthReview["period"] | null;

  const [openId, setOpenId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // ?new=weekly (from the dashboard) opens a fresh draft immediately.
  const [draftReview, setDraftReview] = useState<GrowthReview | null>(() => {
    if (newPeriod && (GROWTH_PERIODS as string[]).includes(newPeriod)) {
      const suggested = suggestPeriod(newPeriod);
      return newGrowthReview({ period: newPeriod, ...suggested });
    }
    return null;
  });

  const reviews = useMemo(
    () => [...s3.growthReviews].sort((a, b) => b.endDate.localeCompare(a.endDate)),
    [s3.growthReviews],
  );
  const effectiveOpenId =
    openId ?? (deepId && !dismissed && s3.growthReviews.some((g) => g.id === deepId) ? deepId : null);
  const active = effectiveOpenId ? s3.growthReviews.find((g) => g.id === effectiveOpenId) ?? null : null;

  const closeDrawer = () => {
    setOpenId(null);
    setDismissed(true);
    if (newPeriod) router.replace(dHref("/grow/reviews"));
  };

  const startCreate = (period: GrowthReview["period"]) => {
    const suggested = suggestPeriod(period);
    // addGrowthReview is deferred until first save so cancelled drafts never
    // clutter the history.
    setDraftReview(newGrowthReview({ period, ...suggested }));
  };

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-7 md:px-9">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
            <span>Grow</span>
            <span aria-hidden>·</span>
            <span>Reviews</span>
          </div>
          <h2 className="mt-1 flex items-center gap-2 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">
            <LineChart size={20} className="text-cgs-accent" aria-hidden />
            Growth Reviews
          </h2>
          <p className="mt-1 text-[13px] text-cgs-muted">
            {reviews.length === 0
              ? "The look-back that turns experience into decisions."
              : `${reviews.length} review${reviews.length === 1 ? "" : "s"} stored — your business history`}
          </p>
        </div>
      </div>

      {/* New review — period choice as real buttons, not a form maze */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-medium text-cgs-muted">Open a review:</span>
        {GROWTH_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => startCreate(p)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cgs-line-strong bg-cgs-raised px-3 py-1.5 text-[12.5px] text-cgs-ink transition-colors hover:border-cgs-accent hover:bg-cgs-accent-faint hover:text-cgs-accent-deep"
          >
            <Plus size={11} aria-hidden /> {GROWTH_PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {/* History */}
      <div className="mt-6">
        {reviews.length === 0 ? (
          <EmptyState
            icon={<TrendingUp size={26} aria-hidden />}
            title="No growth reviews yet"
            body="Run one whenever a period ends — a week of outreach, a month of delivery. The numbers for the period are pulled from your real records, so the review stays honest and takes minutes."
          />
        ) : (
          <ol className="space-y-3">
            {reviews.map((g, i) => {
              const filled = countFilled(g);
              const m = periodMetrics(data, g.startDate, g.endDate);
              const next = reviews[i + 1];
              return (
                <li key={g.id}>
                  <ReviewCard g={g} latest={i === 0} filled={filled} metrics={m} onOpen={() => setOpenId(g.id)} prev={next ? periodMetrics(data, next.startDate, next.endDate) : null} />
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {draftReview && (
        <ReviewEditor
          review={draftReview}
          isNew
          onClose={() => {
            setDraftReview(null);
            if (newPeriod) router.replace(dHref("/grow/reviews"));
          }}
        />
      )}
      {active && <ReviewEditor review={active} isNew={false} onClose={closeDrawer} />}
    </div>
  );
}

/* ------------------------------ review card ------------------------------- */

function ReviewCard({
  g,
  latest,
  filled,
  metrics,
  onOpen,
  prev,
}: {
  g: GrowthReview;
  latest: boolean;
  filled: number;
  metrics: ReturnType<typeof periodMetrics>;
  onOpen: () => void;
  prev: ReturnType<typeof periodMetrics> | null;
}) {
  const total = 12;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-cgs-line bg-cgs-surface p-5 text-left shadow-cgs-card transition-colors hover:border-cgs-accent/45 focus-visible:border-cgs-accent"
      aria-label={`Open growth review ${g.label}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-cgs-ink group-hover:text-cgs-accent-deep">
            {g.label || `${GROWTH_PERIOD_LABEL[g.period]} review`}
            {latest && <Pill tone="accent">latest</Pill>}
            {filled < total && <Pill tone="refine">{filled}/{total} answered</Pill>}
          </h3>
          <p className="mt-0.5 text-[12.5px] tabular-nums text-cgs-muted">
            {GROWTH_PERIOD_LABEL[g.period]} · {g.startDate} → {g.endDate}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-cgs-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Open <ArrowRight size={12} aria-hidden />
        </span>
      </div>

      {/* Real period numbers */}
      <dl className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-cgs-line bg-cgs-inset/40 px-4 py-3 text-[12.5px] sm:grid-cols-4">
        <Metric label="Contacted" value={metrics.outreachContacted} prev={prev?.outreachContacted ?? null} />
        <Metric label="Won" value={metrics.opportunitiesWon} prev={prev?.opportunitiesWon ?? null} extra={metrics.wonValue > 0 ? formatValue(metrics.wonValue) : undefined} />
        <Metric label="Onboardings done" value={metrics.onboardingsCompleted} prev={prev?.onboardingsCompleted ?? null} />
        <Metric label="Reviews done" value={metrics.retentionReviewsDone} prev={prev?.retentionReviewsDone ?? null} />
      </dl>

      {g.priorities.trim() && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-cgs-ink-soft">
          <span className="font-medium text-cgs-ink">Priorities: </span>
          {g.priorities}
        </p>
      )}
    </button>
  );
}

function Metric({ label, value, prev, extra }: { label: string; value: number; prev: number | null; extra?: string }) {
  const delta = prev == null ? null : value - prev;
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-[0.08em] text-cgs-faint">{label}</dt>
      <dd className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-cgs-display text-[17px] font-semibold tabular-nums text-cgs-ink">{value}</span>
        {extra && <span className="text-[11.5px] text-cgs-muted">{extra}</span>}
        {delta != null && delta !== 0 && (
          <span className={`text-[11px] tabular-nums ${delta > 0 ? "text-cgs-complete" : "text-cgs-danger"}`} title="vs previous review">
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </dd>
    </div>
  );
}

function countFilled(g: GrowthReview): number {
  const fields: (keyof GrowthReview)[] = [
    "whatWorked", "whatDidnt", "acquisitionLessons", "channelLessons", "offerLessons",
    "salesLessons", "deliveryLessons", "retentionLessons", "opportunities", "priorities",
  ];
  let n = 0;
  for (const f of fields) if (String(g[f]).trim()) n += 1;
  if (g.nextActions.some((a) => a.trim())) n += 1;
  if (g.label.trim() && g.startDate && g.endDate) n += 1;
  return n;
}

/* ------------------------------ review editor ------------------------------ */

function ReviewEditor({ review, isNew, onClose }: { review: GrowthReview; isNew: boolean; onClose: () => void }) {
  const { s3, data, addGrowthReview, updateGrowthReview, removeGrowthReview } = useStore();
  const [draft, setDraft] = useState<GrowthReview>(review);
  const [errors, setErrors] = useState<string[]>([]);
  const [actionDraft, setActionDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (p: Partial<GrowthReview>) => setDraft((d) => ({ ...d, ...p }));
  const saved = s3.growthReviews.some((g) => g.id === draft.id);
  const metrics = periodMetrics(data, draft.startDate, draft.endDate);

  const commit = (): boolean => {
    const e = missingGrowthReviewFields(draft);
    setErrors(e);
    if (e.length > 0) return false;
    if (saved) updateGrowthReview(draft.id, draft);
    else addGrowthReview(draft);
    return true;
  };

  const complete = () => {
    if (!commit()) return;
    onClose();
  };

  // A saved review auto-commits its answers when the drawer closes — like
  // proposals. An unsaved new draft only persists through Save/Done.
  const requestClose = () => {
    if (saved && draft !== review) updateGrowthReview(draft.id, draft);
    onClose();
  };

  const addNextAction = () => {
    const t = actionDraft.trim();
    if (!t) return;
    const next = { ...draft, nextActions: [...draft.nextActions, t] };
    setDraft(next);
    setActionDraft("");
    if (saved) updateGrowthReview(draft.id, { nextActions: next.nextActions });
  };

  return (
    <Drawer
      open
      onClose={requestClose}
      width="max-w-2xl"
      title={
        <span className="flex items-center gap-2">
          {draft.label || `${GROWTH_PERIOD_LABEL[draft.period]} review`}
          {saved ? <Pill tone="complete">saved</Pill> : <Pill tone="refine">not saved</Pill>}
        </span>
      }
      subtitle={`${draft.startDate} → ${draft.endDate} · ${GROWTH_PERIOD_LABEL[draft.period]}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          {confirmDelete ? (
            <span className="flex items-center gap-2 text-[12.5px] text-cgs-danger">
              Delete this review?
              <Button size="sm" variant="danger" onClick={() => { removeGrowthReview(draft.id); onClose(); }}>Yes</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>No</Button>
            </span>
          ) : saved ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-cgs-faint hover:text-cgs-danger">
              <Trash2 size={12} aria-hidden /> Delete review
            </Button>
          ) : (
            <span className="text-[12px] text-cgs-faint">{isNew ? "Nothing is stored until you save." : ""}</span>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={requestClose}>Close</Button>
            <Button size="sm" variant="secondary" onClick={() => commit()}>Save</Button>
            <Button size="sm" variant="primary" onClick={complete}>
              <Check size={13} aria-hidden /> Done
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {errors.length > 0 && (
          <p className="rounded-lg bg-cgs-danger-soft px-3 py-2 text-[12.5px] text-cgs-danger" role="alert">
            {errors.join(" · ")}
          </p>
        )}

        {/* Period facts */}
        <section aria-label="Review period" className="rounded-xl border border-cgs-line bg-cgs-inset/50 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px]">
            <TextFieldLite label="Label" required value={draft.label} onChange={(v) => set({ label: v })} placeholder="e.g. Week of Sep 7" />
            <DateField label="From" value={draft.startDate} onChange={(v) => set({ startDate: v ?? draft.startDate })} allowClear={false} />
            <DateField label="To" value={draft.endDate} onChange={(v) => set({ endDate: v ?? draft.endDate })} allowClear={false} />
          </div>
          <p className="mt-2 text-[11.5px] text-cgs-muted">
            Choosing a period above sets the dates; the real numbers below follow them automatically.
          </p>
        </section>

        {/* The period's real record counts — read-only, honest */}
        <section aria-label="Period records" className="rounded-xl border border-cgs-line bg-cgs-surface p-4">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">What the records say</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12.5px] sm:grid-cols-4">
            <Stat label="Outreach sent" value={metrics.outreachContacted} />
            <Stat label="Replies" value={metrics.outreachReplied} />
            <Stat label="Deals won" value={metrics.opportunitiesWon} sub={metrics.wonValue > 0 ? formatValue(metrics.wonValue) : undefined} />
            <Stat label="Onboardings done" value={metrics.onboardingsCompleted} />
            <Stat label="Client reviews done" value={metrics.retentionReviewsDone} />
            <Stat label="Retention actions done" value={metrics.retentionActionsDone} />
          </dl>
        </section>

        <Section title="The honest look-back">
          <TA label="What worked" value={draft.whatWorked} onChange={(v) => set({ whatWorked: v })} placeholder="Specific things — the message that got replies, the process step that saved hours" />
          <TA label="What didn't" value={draft.whatDidnt} onChange={(v) => set({ whatDidnt: v })} placeholder="Where effort went nowhere, and what that cost" />
        </Section>

        <Section title="Lessons per stage">
          <TA label="Acquisition" value={draft.acquisitionLessons} onChange={(v) => set({ acquisitionLessons: v })} placeholder="Where the clients actually come from this period" />
          <TA label="Channels" value={draft.channelLessons} onChange={(v) => set({ channelLessons: v })} placeholder="Which channel over/under-delivered against its target" />
          <TA label="Offer" value={draft.offerLessons} onChange={(v) => set({ offerLessons: v })} placeholder="What buyers' questions said about the offer" />
          <TA label="Sales" value={draft.salesLessons} onChange={(v) => set({ salesLessons: v })} placeholder="Where deals moved or stuck, and why" />
          <TA label="Delivery" value={draft.deliveryLessons} onChange={(v) => set({ deliveryLessons: v })} placeholder="What onboarding and delivery taught you" />
          <TA label="Retention" value={draft.retentionLessons} onChange={(v) => set({ retentionLessons: v })} placeholder="What reviews and renewals revealed" />
        </Section>

        <Section title="Looking forward">
          <TA label="Opportunities" value={draft.opportunities} onChange={(v) => set({ opportunities: v })} placeholder="Visible openings — expansion candidates, channels worth a bet, offers clients asked for" />
          <TA label="Priorities for next period" value={draft.priorities} onChange={(v) => set({ priorities: v })} placeholder="Two, maybe three. Not ten." />
        </Section>

        <section aria-label="Next actions">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">Next actions out of this review</h3>
          <ul className="mt-2 space-y-1.5">
            {draft.nextActions.map((a, i) => (
              <li key={`${a}-${i}`} className="group flex items-center gap-2 rounded-lg border border-cgs-line bg-cgs-inset/40 px-3 py-1.5 text-[13px]">
                <Check size={12} className="shrink-0 text-cgs-accent" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-cgs-ink">{a}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = draft.nextActions.filter((_, j) => j !== i);
                    setDraft({ ...draft, nextActions: next });
                    if (saved) updateGrowthReview(draft.id, { nextActions: next });
                  }}
                  aria-label={`Remove next action ${a}`}
                  className="rounded p-0.5 text-transparent group-hover:text-cgs-faint hover:!text-cgs-danger"
                >
                  <Trash2 size={11} aria-hidden />
                </button>
              </li>
            ))}
            {draft.nextActions.length === 0 && <li className="text-[12.5px] text-cgs-faint">None yet — a review without actions is a diary entry.</li>}
          </ul>
          <div className="mt-1.5 flex gap-2">
            <input
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNextAction()}
              placeholder="e.g. Rewrite the LinkedIn angle around the training outcome"
              aria-label="New next action"
              className="flex-1 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
            />
            <Button size="sm" variant="secondary" onClick={addNextAction} disabled={!actionDraft.trim()}>Add</Button>
          </div>
        </section>

        <p className="text-[11.5px] leading-relaxed text-cgs-faint">
          Saved reviews stay in this history. Looking back across them is how you see whether the lessons actually changed anything —{" "}
          <Link href={dHref("/retain/clients")} className="text-cgs-accent underline-offset-2 hover:underline">RETAIN</Link> and{" "}
          <Link href={dHref("/acquire/outreach")} className="text-cgs-accent underline-offset-2 hover:underline">ACQUIRE</Link> records feed the next period&rsquo;s numbers automatically.
        </p>
      </div>
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">{title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-[0.08em] text-cgs-faint">{label}</dt>
      <dd className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-cgs-display text-[16px] font-semibold tabular-nums text-cgs-ink">{value}</span>
        {sub && <span className="text-[11px] text-cgs-muted">{sub}</span>}
      </dd>
    </div>
  );
}

function TA({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <TextAreaLite label={label} value={value} onChange={onChange} rows={2} placeholder={placeholder} />;
}
