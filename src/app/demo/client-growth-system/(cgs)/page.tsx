"use client";

/**
 * The operational home. One question rules this page: what should I do next?
 * The stage rail shows where the business stands across all six stages; the
 * next-action queue is computed from real records; today/overdue/upcoming
 * pools every dated item in the system; and the insights strip only reports
 * facts that exist in the data. No scores, no filler.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  useBuildProgress,
  useContinueWhere,
  useStore,
} from "@/cgs-demo/lib/store";
import { STAGES } from "@/cgs-demo/lib/stages";
import {
  OPPORTUNITY_STAGE_LABEL,
  OUTREACH_STATUS_LABEL,
  buildContext,
  dueSalesActions,
  followUpSubject,
  formatValue,
  openOpportunities,
  openPipelineValue,
  relativeDue,
} from "@/cgs-demo/lib/workflow";
import {
  ONBOARDING_PHASE_LABEL,
  RETENTION_ACTION_LABEL,
  clientReviewStatus,
  countRetentionActions,
  dueOnboardingTasks,
  onboardingProgress,
} from "@/cgs-demo/lib/delivery";
import {
  acquisitionActivityPattern,
  computeInsights,
  computeNextActions,
  findBottlenecks,
} from "@/cgs-demo/lib/insights";
import { Reveal, SectionTitle, StatusBadge, StepRail, formatWhen } from "@/cgs-demo/components/ui";
import { Pill } from "@/cgs-demo/components/data";

/* ------------------------------ stage rail -------------------------------- */

function StageProgress() {
  const { completeCount, totalModules } = useBuildProgress();
  const { s2, s3 } = useStore();
  const buildDone = completeCount === totalModules;
  const acquireLive = s2.strategy.updatedAt !== null || s2.outreach.length > 0 || s2.followUps.length > 0;
  const sellLive = s2.opportunities.length > 0 || s2.proposals.length > 0;
  const deliverLive = s3.onboardings.length > 0;
  const retainLive = s3.clients.length > 0;
  const growLive = s3.growthReviews.length > 0;

  const detailOf: Record<string, string | null> = {
    build: `${completeCount}/${totalModules} modules`,
    acquire: `${s2.outreach.length} contact${s2.outreach.length === 1 ? "" : "s"}`,
    sell: `${s2.opportunities.filter((o) => o.stage !== "closed" && o.outcome === "open").length} open deal${s2.opportunities.filter((o) => o.stage !== "closed" && o.outcome === "open").length === 1 ? "" : "s"}`,
    deliver: `${s3.onboardings.filter((o) => o.status === "active").length} onboarding${s3.onboardings.filter((o) => o.status === "active").length === 1 ? "" : "s"}`,
    retain: `${s3.clients.filter((c) => c.status === "active" || c.status === "at-risk").length} client${s3.clients.filter((c) => c.status === "active" || c.status === "at-risk").length === 1 ? "" : "s"}`,
    grow: `${s3.growthReviews.length} review${s3.growthReviews.length === 1 ? "" : "s"}`,
  };

  const stateOf = (id: string): "done" | "active" | "pending" => {
    if (id === "build") return buildDone ? "done" : "active";
    if (id === "acquire") return acquireLive ? "active" : "pending";
    if (id === "sell") return sellLive ? "active" : "pending";
    if (id === "deliver") return deliverLive ? "active" : "pending";
    if (id === "retain") return retainLive ? "active" : "pending";
    if (id === "grow") return growLive ? "active" : "pending";
    return "pending";
  };

  return (
    <section aria-label="Growth system progress" className="rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <SectionTitle>The journey</SectionTitle>
        <span className="text-[11.5px] tabular-nums text-cgs-muted">
          Build {completeCount}/{totalModules} modules
        </span>
      </div>
      <ol className="grid grid-cols-3 gap-1.5 md:grid-cols-6" aria-label="Six growth stages">
        {STAGES.map((s) => {
          const st = stateOf(s.id);
          const href = s.modules[0]?.href ?? s.nav?.[0]?.href ?? "/";
          return (
            <li key={s.id}>
              <Link
                href={href}
                className={`block rounded-lg border px-2.5 py-2 transition-colors ${
                  st === "done"
                    ? "border-[#cfdcc8] bg-cgs-complete-soft hover:border-cgs-complete/50"
                    : st === "active"
                      ? "border-cgs-accent/40 bg-cgs-accent-faint hover:border-cgs-accent/70"
                      : "border-cgs-line bg-cgs-canvas hover:border-cgs-line-strong"
                }`}
                aria-current={st === "active" ? "step" : undefined}
                title={s.summary}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${
                      st === "active" ? "text-cgs-accent-deep" : st === "done" ? "text-cgs-complete" : "text-cgs-faint"
                    }`}
                  >
                    {s.number}
                  </span>
                  {st === "done" && (
                    <svg width="10" height="10" viewBox="0 0 12 12" className="text-cgs-complete" aria-label="Complete">
                      <path d="M2 6.5 4.8 9 10 3.2" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {st === "active" && <span className="h-1.5 w-1.5 rounded-full bg-cgs-accent" aria-hidden />}
                </div>
                <div className={`mt-1 text-[12.5px] font-medium ${st === "active" || st === "done" ? "text-cgs-ink" : "text-cgs-muted"}`}>
                  {s.label}
                </div>
                <div className="mt-0.5 text-[10.5px] text-cgs-faint">{detailOf[s.id] ?? ""}</div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* --------------------------- next action engine ---------------------------- */

const SEV_TONE = {
  urgent: "text-cgs-danger",
  due: "text-cgs-refine",
  next: "text-cgs-muted",
} as const;

function NextActionsPanel({ skipFirst }: { skipFirst: boolean }) {
  const { data } = useStore();
  // The ContinueCard above already speaks to either the engine's #1 action
  // (when BUILD is done) or the build module to continue (while it isn't) —
  // the panel shows what the card does not.
  const actions = useMemo(() => {
    const all = computeNextActions(data);
    return (skipFirst ? all.slice(1) : all.filter((a) => a.stage !== "build")).slice(0, 6);
  }, [data, skipFirst]);
  if (actions.length === 0) return null;
  return (
    <section aria-label="What to do next" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
      <div className="border-b border-cgs-line/70 px-5 py-3">
        <SectionTitle>What should I do next?</SectionTitle>
      </div>
      <ul className="divide-y divide-cgs-line/60">
        {actions.map((a) => (
          <li key={a.id}>
            <Link href={a.href} className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-cgs-inset/60">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${a.severity === "urgent" ? "bg-cgs-danger" : a.severity === "due" ? "bg-cgs-refine" : "bg-cgs-line-strong"}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-cgs-ink transition-colors group-hover:text-cgs-accent-deep">
                  {a.label}
                </span>
                <span className="block truncate text-[12px] text-cgs-muted">{a.detail}</span>
              </span>
              <span className={`shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.08em] ${SEV_TONE[a.severity]}`}>
                {a.stage}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------ today queue -------------------------------- */

interface QueuedItem {
  id: string;
  label: string;
  sub: string;
  due: string | null; // calendar
  href: string;
  kind: "follow-up" | "sales" | "onboarding" | "retention";
}

function useTodayQueue(): { overdue: QueuedItem[]; dueToday: QueuedItem[]; upcoming: QueuedItem[] } {
  const { data, s2, s3 } = useStore();
  return useMemo(() => {
    const now = new Date();
    const overdue: QueuedItem[] = [];
    const dueToday: QueuedItem[] = [];
    const upcoming: QueuedItem[] = [];
    const push = (item: QueuedItem, bucket: "overdue" | "today" | "upcoming") =>
      (bucket === "overdue" ? overdue : bucket === "today" ? dueToday : upcoming).push(item);
    const classify = (due: string) => {
      const d = new Date(`${due}T00:00:00`).getTime();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return d < today ? "overdue" : d === today ? "today" : "upcoming";
    };

    // Follow-ups
    for (const t of s2.followUps) {
      if (t.completedAt) continue;
      push(
        {
          id: `fu-${t.id}`,
          label: t.note || "Follow-up",
          sub: t.outreachId ? followUpSubject(t, s2.outreach) : "Manual follow-up",
          due: t.dueDate,
          href: "/acquire/follow-ups",
          kind: "follow-up",
        },
        classify(t.dueDate),
      );
    }
    // Sales next actions
    for (const o of openOpportunities(data)) {
      if (!o.nextActionDate || !o.nextAction.trim()) continue;
      push(
        {
          id: `sa-${o.id}`,
          label: o.nextAction,
          sub: o.company || o.prospect,
          due: o.nextActionDate,
          href: `/sell/opportunities?id=${o.id}`,
          kind: "sales",
        },
        classify(o.nextActionDate),
      );
    }
    // Onboarding tasks
    for (const { ob, task } of dueOnboardingTasks(s3.onboardings, now)) {
      push(
        {
          id: `ob-${task.id}`,
          label: task.title,
          sub: `Onboarding · ${ob.company || ob.contact}`,
          due: task.dueDate,
          href: `/deliver/onboarding?id=${ob.id}`,
          kind: "onboarding",
        },
        task.dueDate ? classify(task.dueDate) : "upcoming",
      );
    }
    // Retention actions
    for (const a of s3.actions) {
      if (a.completedAt) continue;
      const c = s3.clients.find((x) => x.id === a.clientId);
      push(
        {
          id: `ra-${a.id}`,
          label: a.note || RETENTION_ACTION_LABEL[a.type],
          sub: `Retention · ${c?.company || c?.contact || "client"}`,
          due: a.dueDate,
          href: "/retain/reviews",
          kind: "retention",
        },
        classify(a.dueDate),
      );
    }
    const byDue = (x: QueuedItem, y: QueuedItem) => (x.due ?? "9999").localeCompare(y.due ?? "9999");
    overdue.sort(byDue);
    dueToday.sort(byDue);
    upcoming.sort(byDue);
    return { overdue, dueToday, upcoming };
  }, [data, s2, s3]);
}

function TodayPanel() {
  const q = useTodayQueue();
  const total = q.overdue.length + q.dueToday.length + q.upcoming.length;
  const kindTone: Record<QueuedItem["kind"], "neutral" | "accent" | "complete" | "refine"> = {
    "follow-up": "neutral",
    sales: "accent",
    onboarding: "refine",
    retention: "complete",
  };
  const rows = (items: QueuedItem[], toneOverdue: boolean) =>
    items.slice(0, toneOverdue ? 4 : 3).map((i) => (
      <li key={i.id}>
        <Link href={i.href} className="flex items-center justify-between gap-3 px-5 py-2 transition-colors hover:bg-cgs-inset/60">
          <span className="min-w-0">
            <span className={`block truncate text-[13px] font-medium ${toneOverdue ? "text-cgs-danger" : "text-cgs-ink"}`}>{i.label}</span>
            <span className="block truncate text-[11.5px] text-cgs-muted">{i.sub}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <Pill tone={kindTone[i.kind]}>{i.kind === "follow-up" ? "acquire" : i.kind}</Pill>
            {i.due && <span className={`text-[11.5px] tabular-nums ${toneOverdue ? "font-medium text-cgs-danger" : "text-cgs-muted"}`}>{relativeDue(i.due)}</span>}
          </span>
        </Link>
      </li>
    ));

  return (
    <section aria-label="Due work" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
      <div className="flex items-center justify-between border-b border-cgs-line/70 px-5 py-3">
        <SectionTitle>Due work</SectionTitle>
        {total === 0 && <span className="text-[11.5px] text-cgs-complete">all clear</span>}
      </div>
      {total === 0 ? (
        <p className="px-5 py-4 text-[13px] leading-relaxed text-cgs-muted">
          Nothing overdue, nothing due today. The queue fills itself from follow-ups, sales actions, onboarding
          tasks and retention work as you schedule them.
        </p>
      ) : (
        <div>
          {q.overdue.length > 0 && (
            <div className="border-b border-cgs-line/60 bg-cgs-danger-soft/30">
              <p className="px-5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-cgs-danger">Overdue · {q.overdue.length}</p>
              <ul className="pb-1">{rows(q.overdue, true)}</ul>
            </div>
          )}
          {q.dueToday.length > 0 && (
            <div className="border-b border-cgs-line/60">
              <p className="px-5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-cgs-accent-deep">Today · {q.dueToday.length}</p>
              <ul className="pb-1">{rows(q.dueToday, false)}</ul>
            </div>
          )}
          {q.upcoming.length > 0 && (
            <div>
              <p className="px-5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-cgs-faint">Upcoming · {q.upcoming.length}</p>
              <ul className="pb-1">{rows(q.upcoming, false)}</ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* -------------------------------- insights --------------------------------- */

function InsightsStrip() {
  const { data } = useStore();
  const insights = useMemo(() => computeInsights(data), [data]);
  const bottlenecks = useMemo(
    () => findBottlenecks(data.stage2?.followUps ?? [], data.stage3?.onboardings ?? [], data.stage3?.actions ?? []),
    [data],
  );
  if (insights.length === 0 && bottlenecks.length === 0) return null;
  return (
    <section aria-label="Workspace insights" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
      <div className="border-b border-cgs-line/70 px-5 py-3">
        <SectionTitle>From your records</SectionTitle>
      </div>
      {insights.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 px-5 py-4 sm:grid-cols-3">
          {insights.map((i) => (
            <Link key={i.id} href={i.href} className="group">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-cgs-faint group-hover:text-cgs-muted">{i.label}</dt>
              <dd className={`mt-0.5 font-cgs-display text-[19px] font-semibold tabular-nums ${
                i.tone === "danger" ? "text-cgs-danger" : i.tone === "warn" ? "text-cgs-refine" : i.tone === "good" ? "text-cgs-complete" : "text-cgs-ink"
              }`}>
                {i.value}
              </dd>
            </Link>
          ))}
        </dl>
      )}
      {bottlenecks.length > 0 && (
        <ul className="border-t border-cgs-line/60 px-5 py-3 space-y-1.5">
          {bottlenecks.map((b) => (
            <li key={b.id}>
              <Link href={b.href} className="flex items-start gap-2 text-[12.5px] leading-snug text-cgs-refine hover:text-cgs-ink">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cgs-refine" aria-hidden />
                {b.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* --------------------------- acquisition rhythm ---------------------------- */

function AcquisitionRhythm() {
  const { s2 } = useStore();
  const weeks = useMemo(() => acquisitionActivityPattern(s2.outreach, 6), [s2.outreach]);
  const max = Math.max(1, ...weeks.map((w) => w.contacted));
  const total = weeks.reduce((s, w) => s + w.contacted, 0);
  if (total === 0) return null;
  return (
    <section aria-label="Outreach sent per week" className="rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card">
      <div className="flex items-baseline justify-between">
        <SectionTitle>Outreach sent · last 6 weeks</SectionTitle>
        <span className="text-[11.5px] tabular-nums text-cgs-muted">{total} total</span>
      </div>
      <div className="mt-4 flex h-20 items-end gap-2" role="img" aria-label={weeks.map((w) => `${w.weekStart}: ${w.contacted} contacted`).join("; ")}>
        {weeks.map((w) => (
          <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t ${w.contacted > 0 ? "bg-cgs-accent/70" : "bg-cgs-inset"}`}
              style={{ height: `${Math.max(4, (w.contacted / max) * 100)}%` }}
              title={`${w.contacted} contacted, week of ${new Date(`${w.weekStart}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            />
            <span className="text-[9.5px] tabular-nums text-cgs-faint">
              {new Date(`${w.weekStart}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ pipeline panel ----------------------------- */

function PipelinePanel() {
  const { data } = useStore();
  const open = useMemo(() => openOpportunities(data), [data]);
  const due = useMemo(() => dueSalesActions(data), [data]);
  const value = useMemo(() => openPipelineValue(data), [data]);
  if (open.length === 0 && due.length === 0) return null;
  return (
    <section aria-label="Sales pipeline" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
      <div className="flex items-center justify-between border-b border-cgs-line/70 px-5 py-3">
        <SectionTitle>Sales pipeline</SectionTitle>
        <Link href={dHref("/sell/opportunities")} className="inline-flex items-center gap-1 text-[12px] font-medium text-cgs-accent hover:text-cgs-accent-deep">
          Opportunities <ArrowRight size={11} aria-hidden />
        </Link>
      </div>
      <div className={`grid gap-3 px-5 py-3 ${value > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
        <div>
          <div className="font-cgs-display text-[22px] font-semibold leading-none tabular-nums text-cgs-ink">{open.length}</div>
          <div className="mt-1 text-[11.5px] text-cgs-faint">open opportunit{open.length === 1 ? "y" : "ies"}</div>
        </div>
        <div>
          <div className="font-cgs-display text-[22px] font-semibold leading-none tabular-nums text-cgs-ink">{due.length}</div>
          <div className="mt-1 text-[11.5px] text-cgs-faint">action{due.length === 1 ? "" : "s"} due</div>
        </div>
        {value > 0 && (
          <div>
            <div className="font-cgs-display text-[22px] font-semibold leading-none tabular-nums text-cgs-ink">{formatValue(value)}</div>
            <div className="mt-1 text-[11.5px] text-cgs-faint">pipeline value</div>
          </div>
        )}
      </div>
      {due.length > 0 && (
        <div className="border-t border-cgs-line/60 px-5 py-3">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-cgs-faint">Next sales actions</div>
          <ul className="mt-2 space-y-1.5">
            {due.slice(0, 3).map((o) => (
              <li key={o.id}>
                <Link href={dHref(`/sell/opportunities?id=${o.id}`)} className="group flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-cgs-ink group-hover:text-cgs-accent-deep">{o.company || o.prospect}</span>
                    <span className="ml-1.5 truncate text-cgs-muted">{o.nextAction}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-cgs-muted">{relativeDue(o.nextActionDate ?? "")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ------------------------------ delivery panel ----------------------------- */

function DeliveryPanel() {
  const { s3 } = useStore();
  const activeOb = s3.onboardings.filter((o) => o.status === "active");
  const reviewClients = s3.clients.filter((c) => {
    const st = clientReviewStatus(c, s3.reviews);
    return st === "overdue" || st === "due";
  });
  const ra = countRetentionActions(s3.actions);
  if (activeOb.length === 0 && reviewClients.length === 0 && s3.clients.length === 0) return null;
  return (
    <section aria-label="Delivery and retention" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
      <div className="flex items-center justify-between border-b border-cgs-line/70 px-5 py-3">
        <SectionTitle>Delivery &amp; retention</SectionTitle>
        <Link href={dHref("/retain/clients")} className="inline-flex items-center gap-1 text-[12px] font-medium text-cgs-accent hover:text-cgs-accent-deep">
          Clients <ArrowRight size={11} aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 py-3 sm:grid-cols-4">
        <Mini label="Onboarding" value={activeOb.length} tone={activeOb.length > 0 ? "ink" : "faint"} href={dHref("/deliver/onboarding")} />
        <Mini label="Active clients" value={s3.clients.filter((c) => c.status === "active" || c.status === "at-risk").length} tone="ink" href={dHref("/retain/clients")} />
        <Mini label="Reviews due" value={reviewClients.length} tone={reviewClients.length > 0 ? "refine" : "faint"} href={dHref("/retain/reviews")} />
        <Mini label="Actions overdue" value={ra.overdue} tone={ra.overdue > 0 ? "danger" : "faint"} href={dHref("/retain/reviews")} />
      </div>
      {activeOb.length > 0 && (
        <ul className="border-t border-cgs-line/60 divide-y divide-cgs-line/60">
          {activeOb.slice(0, 3).map((ob) => {
            const p = onboardingProgress(ob);
            return (
              <li key={ob.id}>
                <Link href={dHref(`/deliver/onboarding?id=${ob.id}`)} className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-cgs-inset/60">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-cgs-ink">{ob.company || ob.contact}</span>
                    <span className="block truncate text-[12px] text-cgs-muted">
                      {p.currentPhase ? `Phase: ${ONBOARDING_PHASE_LABEL[p.currentPhase]}` : p.canComplete ? "Ready to complete" : "No open tasks"}
                    </span>
                  </span>
                  <span className="shrink-0"><StepRail filled={p.done} total={p.total} status="in-progress" /></span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Mini({ label, value, tone, href }: { label: string; value: number; tone: "ink" | "refine" | "danger" | "faint"; href: string }) {
  const cls = tone === "danger" ? "text-cgs-danger" : tone === "refine" ? "text-cgs-refine" : tone === "faint" ? "text-cgs-faint" : "text-cgs-ink";
  return (
    <Link href={href} className="rounded-lg px-1 py-0.5 transition-colors hover:bg-cgs-inset/60">
      <div className={`font-cgs-display text-[20px] font-semibold leading-none tabular-nums ${cls}`}>{value}</div>
      <div className="mt-1 text-[10.5px] uppercase tracking-[0.08em] text-cgs-faint">{label}</div>
    </Link>
  );
}

/* ------------------------------ continue card ----------------------------- */

function ContinueCard() {
  const cont = useContinueWhere();
  const reduce = useReducedMotion();
  const { completeCount, totalModules } = useBuildProgress();
  const { data, s2, s3 } = useStore();
  const buildDone = completeCount === totalModules;

  // BUILD first; after that the engine's top action IS the continue card.
  const nextUp = useMemo(() => {
    if (!buildDone) return null;
    const engine = computeNextActions(data, new Date());
    const top = engine[0];
    if (top)
      return {
        href: top.href,
        title: top.label,
        sub: top.detail,
        kind: top.severity === "urgent" ? ("urgent" as const) : ("action" as const),
      };
    if (s3.growthReviews.length === 0 && (s2.outreach.length > 0 || s2.opportunities.length > 0))
      return { href: "/grow/reviews?new=weekly", title: "Run your first growth review", sub: "A week of real activity is recorded — look back while it is fresh.", kind: "start" as const };
    return { href: "/acquire/outreach", title: "Your queue is clear", sub: "Nothing is overdue or waiting. Consistency is what compounds here.", kind: "calm" as const };
  }, [buildDone, data, s2, s3]);

  if (nextUp) {
    const tone =
      nextUp.kind === "urgent"
        ? "border-cgs-refine/40 bg-cgs-refine-soft/60"
        : nextUp.kind === "calm"
          ? "border-[#cfdcc8] bg-cgs-complete-soft/50"
          : "border-cgs-accent/35 bg-cgs-accent-faint";
    return (
      <section className={`rounded-xl border p-5 shadow-cgs-card ${tone}`}>
        <SectionTitle>What needs your attention</SectionTitle>
        <Link href={nextUp.href} className="group mt-2.5 block">
          <motion.span {...(reduce ? {} : { whileHover: { x: 2 } })} className="flex items-center justify-between gap-4">
            <span className="min-w-0">
              <span className="block font-cgs-display text-[19px] font-semibold text-cgs-ink transition-colors group-hover:text-cgs-accent-deep">
                {nextUp.title}
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-cgs-ink-soft">{nextUp.sub}</span>
            </span>
            <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${nextUp.kind === "urgent" ? "bg-cgs-surface text-cgs-refine group-hover:bg-cgs-raised" : nextUp.kind === "calm" ? "bg-cgs-surface text-cgs-complete group-hover:bg-cgs-raised" : "bg-cgs-accent text-[#fdf9f4] group-hover:bg-cgs-accent-deep"}`}>
              Open
            </span>
          </motion.span>
        </Link>
      </section>
    );
  }

  if (!cont) return null;
  const isReview = cont.status === "needs-review";
  return (
    <section
      className={`rounded-xl border p-5 shadow-cgs-card ${
        isReview ? "border-cgs-refine/40 bg-cgs-refine-soft/60" : "border-cgs-accent/35 bg-cgs-accent-faint"
      }`}
    >
      <SectionTitle>{isReview ? "Needs your attention" : "Continue where you left off"}</SectionTitle>
      <Link href={cont.meta.href} className="group mt-2.5 block">
        <motion.span {...(reduce ? {} : { whileHover: { x: 2 } })} className="flex items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block font-cgs-display text-[19px] font-semibold text-cgs-ink transition-colors group-hover:text-cgs-accent-deep">
              {cont.meta.title}
            </span>
            <span className="mt-1 block text-[13px] leading-relaxed text-cgs-ink-soft">
              {isReview
                ? `Marked complete, but ${cont.missing.length} item${cont.missing.length === 1 ? "" : "s"} now ${cont.missing.length === 1 ? "needs" : "need"} attention: ${cont.missing.slice(0, 3).join(", ")}${cont.missing.length > 3 ? "…" : ""}.`
                : cont.status === "in-progress"
                  ? `${cont.filled} of ${cont.total} required items done. ${cont.meta.tagline}`
                  : cont.status === "not-started"
                    ? "Start here — everything downstream reads from this module. " + cont.meta.tagline
                    : cont.meta.tagline}
            </span>
          </span>
          <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${isReview ? "bg-cgs-surface text-cgs-refine group-hover:bg-cgs-raised" : "bg-cgs-accent text-[#fdf9f4] group-hover:bg-cgs-accent-deep"}`}>
            {cont.status === "not-started" ? "Start" : "Continue"}
          </span>
        </motion.span>
        <div className="mt-3.5">
          <StepRail filled={cont.filled} total={cont.total} status={cont.status} />
        </div>
      </Link>
    </section>
  );
}

/* ------------------------------ build list -------------------------------- */

function ModuleList() {
  const { modules } = useBuildProgress();
  return (
    <section aria-label="Build modules" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
      <div className="border-b border-cgs-line/70 px-5 py-3.5">
        <SectionTitle>Build · your foundation</SectionTitle>
      </div>
      <ul className="divide-y divide-cgs-line/70">
        {modules.map((m) => (
          <li key={m.id}>
            <Link
              href={m.meta.href}
              className="group flex items-center gap-4 px-5 py-3 transition-colors duration-150 hover:bg-cgs-inset/60"
            >
              <span className="w-5 shrink-0 text-[11px] font-semibold tabular-nums text-cgs-faint">{m.meta.step}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-cgs-ink transition-colors group-hover:text-cgs-accent-deep">
                  {m.meta.title}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-cgs-muted">{m.meta.tagline}</span>
              </span>
              <span className="hidden shrink-0 lg:block">
                <StepRail filled={m.filled} total={m.total} status={m.status} />
              </span>
              <StatusBadge status={m.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------ recent panels ------------------------------ */

function RecentOutreachPanel() {
  const { s2 } = useStore();
  const recent = useMemo(
    () => [...s2.outreach].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [s2.outreach],
  );
  if (recent.length === 0) return null;
  return (
    <section aria-label="Recent outreach" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
      <div className="flex items-center justify-between border-b border-cgs-line/70 px-5 py-3">
        <SectionTitle>Recent outreach</SectionTitle>
        <Link href={dHref("/acquire/outreach")} className="inline-flex items-center gap-1 text-[12px] font-medium text-cgs-accent hover:text-cgs-accent-deep">
          All outreach <ArrowRight size={11} aria-hidden />
        </Link>
      </div>
      <ul className="divide-y divide-cgs-line/60">
        {recent.map((r) => (
          <li key={r.id}>
            <Link href={dHref(`/acquire/outreach?id=${r.id}`)} className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-cgs-inset/60">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-cgs-ink">{r.person || r.company}</span>
                <span className="block truncate text-[12px] text-cgs-muted">{r.company}{r.channel ? ` · ${r.channel}` : ""}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Pill>{OUTREACH_STATUS_LABEL[r.status]}</Pill>
                <span className="text-[11px] tabular-nums text-cgs-faint">{formatWhen(r.updatedAt)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentDealsPanel() {
  const { s2 } = useStore();
  const recent = useMemo(
    () => [...s2.opportunities].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt)).slice(0, 5),
    [s2.opportunities],
  );
  if (recent.length === 0) return null;
  return (
    <section aria-label="Recently updated opportunities" className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card">
      <div className="border-b border-cgs-line/70 px-5 py-3">
        <SectionTitle>Recent deal activity</SectionTitle>
      </div>
      <ul className="px-5 py-3 space-y-1.5">
        {recent.map((o) => (
          <li key={o.id}>
            <Link href={dHref(`/sell/opportunities?id=${o.id}`)} className="group flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate">
                <span className="font-medium text-cgs-ink group-hover:text-cgs-accent-deep">{o.company || o.prospect}</span>
                <span className="ml-1.5 text-cgs-muted">{o.stage === "closed" ? o.outcome : OPPORTUNITY_STAGE_LABEL[o.stage]}</span>
              </span>
              <span className="shrink-0 tabular-nums text-[11px] text-cgs-faint">{formatWhen(o.lastActivityAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentActivityPanel() {
  const { data } = useStore();
  if (data.log.length === 0) return null;
  return (
    <section className="rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card">
      <SectionTitle>Recent activity</SectionTitle>
      <ul className="mt-3 space-y-2.5">
        {data.log.slice(0, 7).map((e) => (
          <li key={e.id} className="flex items-baseline justify-between gap-3">
            <span className="text-[12.5px] leading-snug text-cgs-ink-soft">{e.text}</span>
            <span className="shrink-0 text-[11px] tabular-nums text-cgs-faint">{formatWhen(e.at)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyHint() {
  return (
    <Reveal className="rounded-xl border border-dashed border-cgs-line-strong bg-cgs-surface/50 p-8 text-center">
      <p className="font-cgs-display text-[17px] text-cgs-ink">Nothing here yet.</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-cgs-muted">
        Veyra starts with the truth about your business. Answer a handful of direct questions in{" "}
        <Link
          href={dHref("/build/foundation")}
          className="font-medium text-cgs-accent underline decoration-cgs-accent/30 underline-offset-2 hover:text-cgs-accent-deep"
        >
          Business Foundation
        </Link>{" "}
        and this dashboard begins to reflect your real work — every stage from there is fed by the one before it.
      </p>
    </Reveal>
  );
}

/* -------------------------------- page ------------------------------------ */

export default function Dashboard() {
  const { ready, data, s2, s3 } = useStore();
  const { modules, completeCount, totalModules } = useBuildProgress();
  const buildDone = completeCount === totalModules;
  const hasAnything =
    data.log.length > 0 ||
    modules.some((m) => m.status !== "not-started") ||
    s2.outreach.length > 0 ||
    s2.opportunities.length > 0 ||
    s3.onboardings.length > 0 ||
    s3.clients.length > 0;

  if (!ready) return null;

  const engineActions = computeNextActions(data);
  const deliveryLive = s3.onboardings.length > 0 || s3.clients.length > 0;
  const businessLive = buildContext(data).businessName.length > 0;

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-7 md:px-9">
      <Reveal>
        <p className="text-[12.5px] text-cgs-muted">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          {businessLive && ` · ${buildContext(data).businessName}`}
        </p>
        <h2 className="mt-1 font-cgs-display text-[26px] font-semibold leading-tight text-cgs-ink">
          What should I work on right now?
        </h2>
      </Reveal>

      <div className="mt-6 space-y-5">
        <Reveal delay={0.04}>
          <StageProgress />
        </Reveal>

        {!hasAnything ? (
          <Reveal delay={0.08}>
            <EmptyHint />
          </Reveal>
        ) : (
          <>
            <Reveal delay={0.08}>
              <ContinueCard />
            </Reveal>

            {/* The operating core: engine + queue + pipeline side by side */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Reveal delay={0.12}>
                <div className="space-y-5">
                  {engineActions.length > 0 && <NextActionsPanel skipFirst={buildDone} />}
                  <TodayPanel />
                </div>
              </Reveal>
              <Reveal delay={0.14}>
                <div className="space-y-5">
                  <PipelinePanel />
                  {deliveryLive && <DeliveryPanel />}
                  <InsightsStrip />
                  <AcquisitionRhythm />
                </div>
              </Reveal>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
              <Reveal delay={0.12}>
                <div className="space-y-5">
                  <ModuleList />
                  {s2.outreach.length > 0 && <RecentOutreachPanel />}
                </div>
              </Reveal>
              <div className="space-y-5">
                <Reveal delay={0.16}>
                  <RecentDealsPanel />
                </Reveal>
                <Reveal delay={0.2}>
                  <RecentActivityPanel />
                </Reveal>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
