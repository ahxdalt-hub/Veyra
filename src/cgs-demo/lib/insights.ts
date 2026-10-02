/**
 * Rule-based operational insights and the "what should I do next?" engine.
 *
 * Every insight here is a deterministic read of real records already stored
 * in the workspace — no invented data, no scores, no AI. The next-action
 * engine is the product answering one question: what is the most useful thing
 * to do right now, across all six stages?
 */

import { AppData, ModuleId, moduleStatus, MODULE_ORDER, MODULES } from "@/cgs-demo/lib/stages";
import {
  FollowUpTask,
  Opportunity,
  OutreachRecord,
  countFollowUps,
  daysFromToday,
  dueSalesActions,
  isCalendarDate,
  missingStrategyFields,
  openOpportunities,
  stage2,
  todayISO,
} from "@/cgs-demo/lib/workflow";
import {
  Onboarding,
  RetentionAction,
  clientReviewStatus,
  clientsRenewingWithin,
  countRetentionActions,
  dueOnboardingTasks,
  onboardingProgress,
  stage3,
} from "@/cgs-demo/lib/delivery";

/* ------------------------------- next actions ------------------------------ */

export type ActionSeverity = "urgent" | "due" | "next";

export interface NextAction {
  id: string;
  /** Imperative, specific — "Review 2 overdue follow-ups", never "Look at tasks". */
  label: string;
  detail: string;
  href: string;
  severity: ActionSeverity;
  /** Which stage of the system this action belongs to. */
  stage: "build" | "acquire" | "sell" | "deliver" | "retain" | "grow";
}

const SEVERITY_ORDER: Record<ActionSeverity, number> = { urgent: 0, due: 1, next: 2 };

/**
 * The ordered "what should I do next?" list. Rules fire only on real data
 * states; ties break by severity, then by the pipeline order BUILD→GROW so
 * earlier-stage blocks surface before later-stage polish.
 */
export function computeNextActions(data: AppData, now: Date = new Date()): NextAction[] {
  const out: NextAction[] = [];
  const s2 = stage2(data);
  const s3 = stage3(data);

  /* BUILD */
  const buildIncomplete = MODULE_ORDER.some(
    (id) => moduleStatus(MODULES[id], data, id) !== "complete",
  );
  if (buildIncomplete) {
    const first = MODULE_ORDER.find(
      (id) => moduleStatus(MODULES[id], data, id) !== "complete",
    ) as ModuleId;
    const st = moduleStatus(MODULES[first], data, first);
    out.push({
      id: `build-${first}`,
      label: st === "needs-review" ? `Refine ${MODULES[first].title}` : `Complete ${MODULES[first].title}`,
      detail: MODULES[first].tagline,
      href: MODULES[first].href,
      severity: st === "needs-review" ? "due" : "next",
      stage: "build",
    });
  }

  /* ACQUIRE — a half-entered strategy must not silently drop off the radar. */
  const strategyMissing = missingStrategyFields(s2.strategy);
  if (strategyMissing.length > 0) {
    const started = s2.strategy.updatedAt !== null;
    out.push({
      id: "acquire-strategy",
      label: started ? "Finish your acquisition strategy" : "Create your acquisition strategy",
      detail: started
        ? `Still missing: ${strategyMissing.join(", ")}. Outreach works best with a defined primary channel.`
        : "Decide where your ideal client is reached, how you approach them, and your weekly target.",
      href: "/acquire/strategy",
      severity: started ? "due" : "next",
      stage: "acquire",
    });
  }
  const fu = countFollowUps(s2.followUps, now);
  if (fu.overdue > 0)
    out.push({
      id: "acquire-fu-overdue",
      label: `Review ${fu.overdue} overdue follow-up${fu.overdue === 1 ? "" : "s"}`,
      detail: "Past due — respond, reschedule, or close the record honestly.",
      href: "/acquire/follow-ups",
      severity: "urgent",
      stage: "acquire",
    });
  if (fu.dueToday > 0)
    out.push({
      id: "acquire-fu-today",
      label: `Do ${fu.dueToday} follow-up${fu.dueToday === 1 ? "" : "s"} due today`,
      detail: "Keep the conversations warm while they are still warm.",
      href: "/acquire/follow-ups",
      severity: "due",
      stage: "acquire",
    });

  /* SELL */
  const noAction = openOpportunities(data).filter(
    (o) => !o.nextAction.trim() && !isCalendarDate(o.nextActionDate),
  );
  if (noAction.length > 0)
    out.push({
      id: "sell-no-next-action",
      label: `Set the next action on ${noAction.length} opportunit${noAction.length === 1 ? "y" : "ies"}`,
      detail: "An open deal without a next action is not a deal — it is a hope.",
      href: `/sell/opportunities?id=${noAction[0].id}`,
      severity: "due",
      stage: "sell",
    });
  const due = dueSalesActions(data, now);
  if (due.length > 0)
    out.push({
      id: "sell-due-actions",
      label: `Execute ${due.length} due sales action${due.length === 1 ? "" : "s"}`,
      detail: `${due.map((o) => o.company || o.prospect).slice(0, 3).join(", ")}${due.length > 3 ? "…" : ""}.`,
      href: `/sell/opportunities?id=${due[0].id}`,
      severity: due[0].nextActionDate && daysFromToday(due[0].nextActionDate, now) < 0 ? "urgent" : "due",
      stage: "sell",
    });

  /* Won opportunities without onboarding — the SELL → DELIVER handoff. */
  const wonNoOnboarding = s2.opportunities.filter(
    (o) => o.outcome === "won" && !s3.onboardings.some((ob) => ob.opportunityId === o.id),
  );
  for (const o of wonNoOnboarding.slice(0, 3))
    out.push({
      id: `deliver-start-${o.id}`,
      label: `Start onboarding for ${o.company || o.prospect}`,
      detail: "Won in SELL, not yet picked up by DELIVER.",
      href: `/deliver/onboarding?opportunity=${o.id}`,
      severity: "due",
      stage: "deliver",
    });

  /* DELIVER */
  const dueOb = dueOnboardingTasks(s3.onboardings, now);
  const obOverdue = dueOb.filter((x) => isCalendarDate(x.task.dueDate) && daysFromToday(x.task.dueDate!, now) < 0);
  if (obOverdue.length > 0)
    out.push({
      id: "deliver-overdue-tasks",
      label: `Complete ${obOverdue.length} overdue onboarding task${obOverdue.length === 1 ? "" : "s"}`,
      detail: `${obOverdue[0].ob.company} — ${obOverdue[0].task.title}.`,
      href: `/deliver/onboarding?id=${obOverdue[0].ob.id}`,
      severity: "urgent",
      stage: "deliver",
    });
  const readyToFinish = s3.onboardings.filter(
    (ob) => ob.status === "active" && onboardingProgress(ob).canComplete,
  );
  for (const ob of readyToFinish.slice(0, 2))
    out.push({
      id: `deliver-complete-${ob.id}`,
      label: `Finish onboarding for ${ob.company}`,
      detail: "Every task is settled — activate the client in RETAIN.",
      href: `/deliver/onboarding?id=${ob.id}`,
      severity: "due",
      stage: "deliver",
    });
  const completedNoClient = s3.onboardings.filter(
    (ob) => ob.status === "completed" && !s3.clients.some((c) => c.onboardingId === ob.id),
  );
  for (const ob of completedNoClient.slice(0, 2))
    out.push({
      id: `retain-activate-${ob.id}`,
      label: `Activate ${ob.company} as an active client`,
      detail: "Onboarding is done; the relationship belongs in RETAIN.",
      href: `/retain/clients?onboarding=${ob.id}`,
      severity: "due",
      stage: "retain",
    });
  /* RETAIN */
  const ra = countRetentionActions(s3.actions, now);
  if (ra.overdue > 0)
    out.push({
      id: "retain-actions-overdue",
      label: `Clear ${ra.overdue} overdue retention action${ra.overdue === 1 ? "" : "s"}`,
      detail: "Relationships decay quietly. Answer the overdue ones today.",
      href: "/retain/reviews",
      severity: "urgent",
      stage: "retain",
    });
  if (ra.dueToday > 0)
    out.push({
      id: "retain-actions-today",
      label: `Do ${ra.dueToday} retention action${ra.dueToday === 1 ? "" : "s"} due today`,
      detail: "Check-ins, renewals and feedback that land today.",
      href: "/retain/reviews",
      severity: "due",
      stage: "retain",
    });
  const reviewClients = s3.clients.filter((c) => {
    const st = clientReviewStatus(c, s3.reviews, now);
    return st === "overdue" || st === "due";
  });
  if (reviewClients.length > 0)
    out.push({
      id: "retain-reviews-due",
      label: `Complete ${reviewClients.length} client review${reviewClients.length === 1 ? "" : "s"}`,
      detail: `${reviewClients.map((c) => c.company || c.contact).slice(0, 3).join(", ")}${reviewClients.length > 3 ? "…" : ""} — the scheduled review is ${daysFromToday(reviewClients[0].nextReviewDate!, now) < 0 ? "overdue" : "due"}.`,
      href: `/retain/reviews?client=${reviewClients[0].id}`,
      severity: reviewClients.some((c) => clientReviewStatus(c, s3.reviews, now) === "overdue") ? "urgent" : "due",
      stage: "retain",
    });
  const unscheduled = s3.clients.filter(
    (c) => c.status === "active" && clientReviewStatus(c, s3.reviews, now) === "unscheduled",
  );
  if (unscheduled.length > 0)
    out.push({
      id: "retain-schedule-review",
      label: `Schedule the first review for ${unscheduled[0].company || unscheduled[0].contact}`,
      detail: `${unscheduled.length} active client${unscheduled.length === 1 ? " has" : "s have"} no review date — satisfaction drifts unseen.`,
      href: `/retain/clients?id=${unscheduled[0].id}`,
      severity: "next",
      stage: "retain",
    });

  /* GROW — only once real operational history exists to review. */
  const hasHistory =
    s2.opportunities.length > 0 || s2.outreach.length > 0 || s3.onboardings.length > 0 || s3.clients.length > 0;
  const lastReview = [...s3.growthReviews].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  if (hasHistory && !lastReview)
    out.push({
      id: "grow-first-review",
      label: "Run your first growth review",
      detail: "Look back honestly at what worked and what did not — this is how the system improves.",
      href: "/grow/reviews?new=weekly",
      severity: "next",
      stage: "grow",
    });
  else if (lastReview && isCalendarDate(lastReview.endDate)) {
    const gap = daysFromToday(lastReview.endDate, now);
    const threshold = lastReview.period === "weekly" ? 10 : lastReview.period === "monthly" ? 40 : lastReview.period === "quarterly" ? 100 : 40;
    if (gap >= threshold)
      out.push({
        id: "grow-next-review",
        label: `Open the next growth review (${lastReview.period})`,
        detail: `Last review ended ${gap} days ago.`,
        href: `/grow/reviews?new=${lastReview.period === "custom" ? "weekly" : lastReview.period}`,
        severity: "next",
        stage: "grow",
      });
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/* --------------------------------- insights -------------------------------- */

export type InsightTone = "neutral" | "good" | "warn" | "danger";

export interface Insight {
  id: string;
  label: string;
  value: string;
  tone: InsightTone;
  href: string;
}

/** Small real facts for the dashboard — counts and dates only, no invented analytics. */
export function computeInsights(data: AppData, now: Date = new Date()): Insight[] {
  const s2 = stage2(data);
  const s3 = stage3(data);
  const out: Insight[] = [];

  const open = openOpportunities(data);
  if (open.length > 0)
    out.push({ id: "open-opps", label: "Open opportunities", value: String(open.length), tone: "neutral", href: "/sell/opportunities" });

  const stalled = stalledOpportunities(data, now);
  if (stalled.length > 0)
    out.push({
      id: "stalled",
      label: `Stalled deal${stalled.length === 1 ? "" : "s"}`,
      value: `${stalled.length} over ${STALLED_DAYS} days`,
      tone: "warn",
      href: `/sell/opportunities?id=${stalled[0].id}`,
    });

  const won = s2.opportunities.filter((o) => o.outcome === "won");
  if (won.length > 0)
    out.push({ id: "won", label: "Won deals", value: String(won.length), tone: "good", href: "/sell/opportunities" });

  const activeOb = s3.onboardings.filter((o) => o.status === "active");
  if (activeOb.length > 0) {
    const overdue = dueOnboardingTasks(activeOb, now).filter(
      (x) => isCalendarDate(x.task.dueDate) && daysFromToday(x.task.dueDate!, now) < 0,
    ).length;
    out.push({
      id: "onboarding",
      label: "Onboarding in progress",
      value: overdue > 0 ? `${activeOb.length} · ${overdue} overdue` : String(activeOb.length),
      tone: overdue > 0 ? "danger" : "neutral",
      href: "/deliver/onboarding",
    });
  }
  const doneOb = s3.onboardings.filter((o) => o.status === "completed").length;
  if (doneOb > 0)
    out.push({ id: "onboarded", label: "Onboarding completed", value: String(doneOb), tone: "good", href: "/deliver/onboarding" });

  const activeClients = s3.clients.filter((c) => c.status === "active" || c.status === "at-risk");
  if (activeClients.length > 0) {
    const atRisk = activeClients.filter((c) => c.status === "at-risk").length;
    out.push({
      id: "clients",
      label: "Active clients",
      value: atRisk > 0 ? `${activeClients.length} · ${atRisk} at risk` : String(activeClients.length),
      tone: atRisk > 0 ? "warn" : "good",
      href: "/retain/clients",
    });
  }
  const dueReviews = s3.clients.filter((c) => {
    const st = clientReviewStatus(c, s3.reviews, now);
    return st === "overdue" || st === "due";
  }).length;
  if (dueReviews > 0)
    out.push({ id: "reviews-due", label: "Reviews due", value: String(dueReviews), tone: "warn", href: "/retain/reviews" });

  const renewing = clientsRenewingWithin(s3.clients, 30, now);
  if (renewing.length > 0)
    out.push({
      id: "renewals",
      label: "Renewals within 30 days",
      value: String(renewing.length),
      tone: "warn",
      href: "/retain/clients",
    });

  const ra = countRetentionActions(s3.actions, now);
  if (ra.overdue > 0)
    out.push({ id: "retention-overdue", label: "Retention actions overdue", value: String(ra.overdue), tone: "danger", href: "/retain/reviews" });

  // Outreach without a single reply — an honest signal, only after real volume.
  const contacted = s2.outreach.filter((o) => o.dateContacted).length;
  const replied = s2.outreach.filter((o) => ["replied", "qualified", "won"].includes(o.status)).length;
  if (contacted >= 5 && replied === 0)
    out.push({
      id: "no-replies",
      label: "Replies on outreach",
      value: `0 of ${contacted}`,
      tone: "warn",
      href: "/acquire/outreach",
    });

  return out;
}

/** Stalled = open, has had no activity for STALLED_DAYS days. */
export const STALLED_DAYS = 10;

export function stalledOpportunities(data: AppData, now: Date = new Date()): Opportunity[] {
  return openOpportunities(data).filter(
    (o) => daysFromToday(o.lastActivityAt.slice(0, 10), now) <= -STALLED_DAYS,
  );
}

/** Acquisition activity per week (last `weeks` weeks) — real counts by contact date. */
export interface WeeklyActivity {
  weekStart: string; // YYYY-MM-DD (Monday)
  contacted: number;
}

export function acquisitionActivityPattern(
  outreach: OutreachRecord[],
  weeks = 6,
  now: Date = new Date(),
): WeeklyActivity[] {
  const buckets: WeeklyActivity[] = [];
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (monday.getDay() + 6) % 7; // Mon=0
  monday.setDate(monday.getDate() - dow);
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(monday);
    ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    const start = todayISO(ws);
    const end = todayISO(we);
    const contacted = outreach.filter(
      (r) => isCalendarDate(r.dateContacted) && r.dateContacted >= start && r.dateContacted <= end,
    ).length;
    buckets.push({ weekStart: start, contacted });
  }
  return buckets;
}

/** Repeat operational friction: the same kind of overdue across ≥2 different records. */
export interface Bottleneck {
  id: string;
  label: string;
  count: number;
  href: string;
}

export function findBottlenecks(
  followUps: FollowUpTask[],
  onboardings: Onboarding[],
  actions: RetentionAction[],
  now: Date = new Date(),
): Bottleneck[] {
  const out: Bottleneck[] = [];
  const overdueFollowUps = followUps.filter(
    (t) => !t.completedAt && isCalendarDate(t.dueDate) && daysFromToday(t.dueDate, now) < 0,
  ).length;
  if (overdueFollowUps >= 2)
    out.push({
      id: "bn-followups",
      label: `${overdueFollowUps} follow-ups are overdue — scheduling may be outrunning capacity`,
      count: overdueFollowUps,
      href: "/acquire/follow-ups",
    });
  let overdueTasks = 0;
  const obsWithOverdue = new Set<string>();
  for (const x of dueOnboardingTasks(onboardings, now)) {
    if (x.task.dueDate && daysFromToday(x.task.dueDate, now) < 0) {
      overdueTasks += 1;
      obsWithOverdue.add(x.ob.id);
    }
  }
  if (overdueTasks >= 2 && obsWithOverdue.size >= 2)
    out.push({
      id: "bn-onboarding",
      label: `Onboarding tasks overdue across ${obsWithOverdue.size} clients — check what consistently slips (access, materials, kickoff)`,
      count: overdueTasks,
      href: "/deliver/onboarding",
    });
  const overdueRA = actions.filter(
    (a) => !a.completedAt && isCalendarDate(a.dueDate) && daysFromToday(a.dueDate, now) < 0,
  );
  const types = new Map<string, number>();
  for (const a of overdueRA) types.set(a.type, (types.get(a.type) ?? 0) + 1);
  for (const [type, n] of types)
    if (n >= 2)
      out.push({
        id: `bn-retention-${type}`,
        label: `${n} ${type === "follow-up" ? "relationship follow-ups" : type + (n > 1 ? "s" : "")} overdue — the same work keeps sliding`,
        count: n,
        href: "/retain/reviews",
      });
  return out;
}

