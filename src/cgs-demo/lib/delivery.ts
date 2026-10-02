/**
 * Stage 3 domain model — DELIVER (onboarding), RETAIN (clients, retention
 * actions & reviews) and GROW (growth reviews).
 *
 * Like workflow.ts, every business rule here is a pure function so the store
 * stays thin and the logic is unit-testable without React. User-picked dates
 * are calendar strings ("YYYY-MM-DD"); events are ISO timestamps.
 */

import { AppData, uid } from "@/cgs-demo/lib/stages";
import {
  BuildContext,
  Opportunity,
  daysFromToday,
  formatCalendarDate,
  isCalendarDate,
  relativeDue,
  todayISO,
} from "@/cgs-demo/lib/workflow";

// Stage-3 pages may import the shared calendar helpers from here.
export { daysFromToday, formatCalendarDate, isCalendarDate, relativeDue, todayISO };

/* ================================ DELIVER ================================= */

/** The journey between a won deal and an active client. */
export type OnboardingPhase = "welcome" | "information" | "kickoff" | "setup" | "milestone";

export const ONBOARDING_PHASES: OnboardingPhase[] = [
  "welcome",
  "information",
  "kickoff",
  "setup",
  "milestone",
];

export const ONBOARDING_PHASE_LABEL: Record<OnboardingPhase, string> = {
  welcome: "Welcome",
  information: "Information collection",
  kickoff: "Kickoff",
  setup: "Setup",
  milestone: "First milestone",
};

export interface TemplateTask {
  id: string;
  title: string;
  detail: string;
  phase: OnboardingPhase;
  /** Days after the start date the task is due; null = no deadline. */
  defaultOffsetDays: number | null;
}

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  builtIn: boolean;
  tasks: TemplateTask[];
  createdAt: string;
  updatedAt: string;
}

export type OnboardingTaskStatus = "pending" | "done" | "skipped";

export interface OnboardingTask {
  id: string;
  title: string;
  detail: string;
  phase: OnboardingPhase;
  status: OnboardingTaskStatus;
  dueDate: string | null;
  completedAt: string | null;
}

export type OnboardingStatus = "active" | "completed" | "archived";

export interface Onboarding {
  id: string;
  opportunityId: string | null;
  contact: string;
  company: string;
  offerRef: string;
  useCurrentOffer: boolean;
  templateId: string;
  templateName: string; // snapshot — survives template edits
  status: OnboardingStatus;
  tasks: OnboardingTask[];
  notes: string;
  clientId: string | null;
  startedAt: string; // ISO
  completedAt: string | null; // ISO
}

export function defaultTemplates(): OnboardingTemplate[] {
  const now = new Date("2026-01-01T00:00:00Z").toISOString();
  const t = (
    phase: OnboardingPhase,
    title: string,
    detail: string,
    offset: number | null,
  ): TemplateTask => ({ id: uid(), title, detail, phase, defaultOffsetDays: offset });
  return [
    {
      id: "tpl-project",
      name: "Project delivery",
      description: "A fixed-scope project: welcome, access, kickoff, setup, first milestone.",
      builtIn: true,
      createdAt: now,
      updatedAt: now,
      tasks: [
        t("welcome", "Send welcome message", "Introduce the process, timeline, and how you work together.", 0),
        t("welcome", "Confirm contacts and rhythm", "Who decides, who does the work, when you talk.", 1),
        t("information", "Collect access and materials", "Everything needed to start: accounts, data, brand assets.", 3),
        t("information", "Agree success criteria in writing", "What makes this project a yes, stated plainly.", 5),
        t("kickoff", "Hold the kickoff call", "Walk the plan, set expectations, start the clock.", 7),
        t("setup", "Set up the working space", "Shared folder, board, or channel the project lives in.", 9),
        t("setup", "Confirm milestone dates", "Lock the schedule against the offer timeline.", 10),
        t("milestone", "Deliver the first milestone", "The first visible piece of real value.", 14),
        t("milestone", "Review against criteria", "Did it land as agreed? Capture the answer.", 16),
      ],
    },
    {
      id: "tpl-retainer",
      name: "Retainer start",
      description: "An ongoing engagement: goals, first working session, reporting rhythm.",
      builtIn: true,
      createdAt: now,
      updatedAt: now,
      tasks: [
        t("welcome", "Send welcome and intake form", "Start the relationship on your terms.", 0),
        t("information", "Collect goals and constraints", "What they are measured on, what you cannot touch.", 2),
        t("kickoff", "First working session", "Agree scope of the first cycle together.", 4),
        t("setup", "Set access and reporting rhythm", "Tools, contacts, and when updates land.", 5),
        t("milestone", "Deliver first-cycle summary", "Prove the cadence early.", 10),
      ],
    },
  ];
}

/* ------------------------------ onboarding rules --------------------------- */

export interface OnboardingProgress {
  total: number;
  done: number; // done + skipped (settled tasks)
  remaining: number;
  percent: number;
  currentPhase: OnboardingPhase | null; // first phase with an open task
  canComplete: boolean;
}

export function onboardingProgress(ob: Onboarding): OnboardingProgress {
  const total = ob.tasks.length;
  const settled = ob.tasks.filter((x) => x.status !== "pending").length;
  const open = ob.tasks.filter((x) => x.status === "pending");
  const phase =
    ONBOARDING_PHASES.find((p) => open.some((x) => x.phase === p)) ?? null;
  return {
    total,
    done: settled,
    remaining: total - settled,
    percent: total === 0 ? 0 : Math.round((settled / total) * 100),
    currentPhase: ob.status === "completed" ? null : phase,
    canComplete: ob.status === "active" && total > 0 && settled === total,
  };
}

/** Open onboarding tasks that are due today or overdue, soonest first. */
export function dueOnboardingTasks(onboardings: Onboarding[], now: Date = new Date()): { ob: Onboarding; task: OnboardingTask }[] {
  const out: { ob: Onboarding; task: OnboardingTask }[] = [];
  for (const ob of onboardings) {
    if (ob.status !== "active") continue;
    for (const task of ob.tasks) {
      if (task.status !== "pending") continue;
      if (isCalendarDate(task.dueDate) && daysFromToday(task.dueDate, now) <= 0)
        out.push({ ob, task });
    }
  }
  return out.sort((a, b) => (a.task.dueDate ?? "").localeCompare(b.task.dueDate ?? ""));
}

export function activeOnboardings(data: AppData): Onboarding[] {
  return stage3(data).onboardings.filter((o) => o.status === "active");
}

export function completedOnboardings(data: AppData): Onboarding[] {
  return stage3(data).onboardings.filter((o) => o.status === "completed");
}

export function validateOnboardingTemplate(t: Partial<OnboardingTemplate>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!t.name?.trim()) e.name = "A template needs a name.";
  if (!t.tasks || t.tasks.filter((x) => x.title.trim()).length === 0)
    e.tasks = "Add at least one task to the template.";
  return e;
}

/* ================================ RETAIN ================================== */

export type ClientStatus = "active" | "at-risk" | "paused" | "completed" | "churned";

export const CLIENT_STATUSES: ClientStatus[] = [
  "active",
  "at-risk",
  "paused",
  "completed",
  "churned",
];

export const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  active: "Active",
  "at-risk": "At risk",
  paused: "Paused",
  completed: "Engagement ended",
  churned: "Churned",
};

export interface Client {
  id: string;
  contact: string; // main person
  company: string;
  offerRef: string; // "" = current BUILD offer
  useCurrentOffer: boolean;
  startDate: string | null; // YYYY-MM-DD
  status: ClientStatus;
  satisfaction: "" | "great" | "good" | "mixed" | "at-risk";
  satisfactionNote: string;
  recentWork: string; // what you delivered lately
  upcomingNeeds: string; // what they need next
  renewalDate: string | null;
  renewalNote: string;
  expansionIdeas: string[]; // stored as plain strings (filled rows only)
  relationshipNotes: string;
  nextReviewDate: string | null;
  onboardingId: string | null;
  opportunityId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RetentionActionType =
  | "check-in"
  | "review"
  | "renewal"
  | "feedback"
  | "expansion"
  | "follow-up";

export const RETENTION_ACTION_TYPES: RetentionActionType[] = [
  "check-in",
  "review",
  "renewal",
  "feedback",
  "expansion",
  "follow-up",
];

export const RETENTION_ACTION_LABEL: Record<RetentionActionType, string> = {
  "check-in": "Check-in",
  review: "Review",
  renewal: "Renewal",
  feedback: "Feedback",
  expansion: "Expansion",
  "follow-up": "Relationship follow-up",
};

export interface RetentionAction {
  id: string;
  clientId: string;
  type: RetentionActionType;
  note: string;
  dueDate: string; // YYYY-MM-DD
  completedAt: string | null;
  createdAt: string;
  origin: "manual" | "review";
}

export type ReviewSatisfaction = "" | "satisfied" | "neutral" | "at-risk";

export interface RetentionReview {
  id: string;
  clientId: string;
  date: string | null; // YYYY-MM-DD the review conversation happened
  satisfaction: ReviewSatisfaction;
  valueDelivered: string;
  nextNeeds: string;
  risks: string;
  opportunities: string;
  nextStep: string;
  followUpType: RetentionActionType | "";
  followUpDue: string | null; // YYYY-MM-DD — creates an action when completed
  completedAt: string | null; // ISO — null means the review is still open
  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus = "overdue" | "due" | "scheduled" | "unscheduled" | "none";

/**
 * Is this client due for a retention review? Deterministic from
 * nextReviewDate; clients never reviewed and with no date are "unscheduled".
 */
export function clientReviewStatus(
  client: Client,
  reviews: RetentionReview[],
  now: Date = new Date(),
): ReviewStatus {
  if (client.status === "churned" || client.status === "completed") return "none";
  const hasCompleted = reviews.some((r) => r.clientId === client.id && r.completedAt);
  if (isCalendarDate(client.nextReviewDate)) {
    const n = daysFromToday(client.nextReviewDate, now);
    if (n < 0) return "overdue";
    if (n === 0) return "due";
    return "scheduled";
  }
  return hasCompleted ? "none" : "unscheduled";
}

export function clientsDueForReview(
  clients: Client[],
  reviews: RetentionReview[],
  now: Date = new Date(),
): Client[] {
  return clients.filter((c) => {
    const s = clientReviewStatus(c, reviews, now);
    return s === "overdue" || s === "due";
  });
}

/** Renewal dates within `days` from today, soonest first. */
export function clientsRenewingWithin(
  clients: Client[],
  days: number,
  now: Date = new Date(),
): Client[] {
  return clients
    .filter(
      (c) =>
        (c.status === "active" || c.status === "at-risk" || c.status === "paused") &&
        isCalendarDate(c.renewalDate) &&
        daysFromToday(c.renewalDate!, now) >= 0 &&
        daysFromToday(c.renewalDate!, now) <= days,
    )
    .sort((a, b) => (a.renewalDate ?? "").localeCompare(b.renewalDate ?? ""));
}

export function openRetentionActions(actions: RetentionAction[]): RetentionAction[] {
  return actions.filter((a) => !a.completedAt);
}

export function retentionActionBucket(
  a: RetentionAction,
  now: Date = new Date(),
): "completed" | "overdue" | "today" | "upcoming" {
  if (a.completedAt) return "completed";
  const n = daysFromToday(a.dueDate, now);
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  return "upcoming";
}

export interface RetentionCounts {
  dueToday: number;
  overdue: number;
  upcoming: number;
  completed: number;
}

export function countRetentionActions(
  actions: RetentionAction[],
  now: Date = new Date(),
): RetentionCounts {
  const c: RetentionCounts = { dueToday: 0, overdue: 0, upcoming: 0, completed: 0 };
  for (const a of actions) {
    const b = retentionActionBucket(a, now);
    if (b === "today") c.dueToday += 1;
    else if (b === "overdue") c.overdue += 1;
    else if (b === "upcoming") c.upcoming += 1;
    else c.completed += 1;
  }
  return c;
}

export function validateClient(c: Partial<Client>): Record<string, string> {
  const e: Record<string, string> = {};
  if (!c.company?.trim() && !c.contact?.trim())
    e.company = "A client needs at least a company or a contact name.";
  return e;
}

/** Required answers before a retention review can be completed. */
export function missingReviewFields(r: RetentionReview): string[] {
  const m: string[] = [];
  if (!r.satisfaction) m.push("Satisfaction");
  if (!r.valueDelivered.trim()) m.push("Value delivered");
  if (!r.nextNeeds.trim()) m.push("What they need next");
  if (!r.nextStep.trim()) m.push("Next step");
  return m;
}

/**
 * What completing a review changes: sets the client's next review date and
 * queues the follow-up action. Returned patch data is applied by the store so
 * the rule stays testable.
 */
export function reviewCompletionEffects(
  review: RetentionReview,
  client: Client,
  now: Date = new Date(),
): {
  clientPatch: Partial<Client>;
  newAction: RetentionAction | null;
} {
  const clientPatch: Partial<Client> = {};
  if (review.satisfaction) {
    clientPatch.satisfaction =
      review.satisfaction === "satisfied"
        ? "great"
        : review.satisfaction === "neutral"
          ? "mixed"
          : "at-risk";
  }
  if (review.satisfaction === "at-risk" && client.status === "active")
    clientPatch.status = "at-risk";
  if (isCalendarDate(review.followUpDue))
    clientPatch.nextReviewDate = review.followUpDue;

  let newAction: RetentionAction | null = null;
  if (review.followUpType && isCalendarDate(review.followUpDue)) {
    newAction = newRetentionAction({
      clientId: client.id,
      type: review.followUpType,
      note: review.nextStep.trim() || `${RETENTION_ACTION_LABEL[review.followUpType]} for ${client.company || client.contact}`,
      dueDate: review.followUpDue,
      origin: "review",
    });
  } else if (review.followUpType && !isCalendarDate(review.followUpDue)) {
    const fallback = defaultFollowUpDate(now);
    clientPatch.nextReviewDate = fallback; // keep the schedule in step with the action
    newAction = newRetentionAction({
      clientId: client.id,
      type: review.followUpType,
      note: review.nextStep.trim() || RETENTION_ACTION_LABEL[review.followUpType],
      dueDate: fallback,
      origin: "review",
    });
  }
  return { clientPatch, newAction };
}

function defaultFollowUpDate(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 14);
  return todayISO(d);
}

/* ================================= GROW =================================== */

export type GrowthPeriod = "weekly" | "monthly" | "quarterly" | "custom";

export const GROWTH_PERIODS: GrowthPeriod[] = ["weekly", "monthly", "quarterly", "custom"];

export const GROWTH_PERIOD_LABEL: Record<GrowthPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  custom: "Custom",
};

export interface GrowthReview {
  id: string;
  period: GrowthPeriod;
  label: string; // e.g. "Week of Sep 7" — auto-suggested, editable
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  whatWorked: string;
  whatDidnt: string;
  acquisitionLessons: string;
  channelLessons: string;
  offerLessons: string;
  salesLessons: string;
  deliveryLessons: string;
  retentionLessons: string;
  opportunities: string;
  priorities: string;
  nextActions: string[];
  createdAt: string;
  updatedAt: string;
}

export function missingGrowthReviewFields(r: Partial<GrowthReview>): string[] {
  const m: string[] = [];
  if (!r.label?.trim()) m.push("Label");
  if (!isCalendarDate(r.startDate ?? null)) m.push("Period start");
  if (!isCalendarDate(r.endDate ?? null)) m.push("Period end");
  else if (isCalendarDate(r.startDate ?? null) && (r.endDate as string) < (r.startDate as string))
    return ["End date must be after the start date"];
  return m;
}

/** Real numbers for the period — derived only from stored timestamps/dates. */
export interface PeriodMetrics {
  outreachContacted: number;
  outreachReplied: number;
  opportunitiesWon: number;
  wonValue: number;
  onboardingsCompleted: number;
  retentionReviewsDone: number;
  retentionActionsDone: number;
}

const inRange = (isoOrDate: string | null, start: string, end: string): boolean => {
  if (!isoOrDate) return false;
  const d = isoOrDate.slice(0, 10);
  return d >= start && d <= end;
};

export function periodMetrics(
  data: AppData,
  start: string,
  end: string,
): PeriodMetrics {
  const s2 = data.stage2;
  const s3 = normalizeStage3(data.stage3);
  const m: PeriodMetrics = {
    outreachContacted: 0,
    outreachReplied: 0,
    opportunitiesWon: 0,
    wonValue: 0,
    onboardingsCompleted: 0,
    retentionReviewsDone: 0,
    retentionActionsDone: 0,
  };
  if (s2) {
    for (const o of s2.outreach) {
      if (isCalendarDate(o.dateContacted) && o.dateContacted >= start && o.dateContacted <= end)
        m.outreachContacted += 1;
      if (["replied", "qualified", "won"].includes(o.status) && o.updatedAt.slice(0, 10) >= start && o.updatedAt.slice(0, 10) <= end)
        m.outreachReplied += 1;
    }
    for (const o of s2.opportunities) {
      if (o.outcome === "won" && inRange(o.closedAt, start, end)) {
        m.opportunitiesWon += 1;
        m.wonValue += o.estimatedValue ?? 0;
      }
    }
  }
  for (const ob of s3.onboardings)
    if (inRange(ob.completedAt, start, end)) m.onboardingsCompleted += 1;
  for (const r of s3.reviews)
    if (inRange(r.completedAt, start, end)) m.retentionReviewsDone += 1;
  for (const a of s3.actions)
    if (inRange(a.completedAt, start, end)) m.retentionActionsDone += 1;
  return m;
}

/** Suggested label + dates for a period type, anchored on `now`. */
export function suggestPeriod(
  period: GrowthPeriod,
  now: Date = new Date(),
): { label: string; startDate: string; endDate: string } {
  if (period === "custom") {
    const s = new Date(now);
    s.setDate(s.getDate() - 27);
    return { label: "", startDate: todayISO(s), endDate: todayISO(now) };
  }
  if (period === "weekly") {
    const s = new Date(now);
    s.setDate(s.getDate() - 6);
    return { label: `Week of ${fmt(s)}`, startDate: todayISO(s), endDate: todayISO(now) };
  }
  if (period === "monthly") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { label: `${now.toLocaleString(undefined, { month: "long", year: "numeric" })}`, startDate: todayISO(s), endDate: todayISO(now) };
  }
  // quarterly
  const q = Math.floor(now.getMonth() / 3);
  const s = new Date(now.getFullYear(), q * 3, 1);
  return { label: `Q${q + 1} ${now.getFullYear()}`, startDate: todayISO(s), endDate: todayISO(now) };
}

function fmt(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ============================ stage3 document ============================== */

export interface Stage3Data {
  templates: OnboardingTemplate[];
  onboardings: Onboarding[];
  clients: Client[];
  actions: RetentionAction[];
  reviews: RetentionReview[];
  growthReviews: GrowthReview[];
}

export const emptyStage3 = (): Stage3Data => ({
  templates: defaultTemplates(),
  onboardings: [],
  clients: [],
  actions: [],
  reviews: [],
  growthReviews: [],
});

export function stage3(data: AppData): Stage3Data {
  return normalizeStage3(data.stage3);
}

/** Defensive normalization — tolerate partial/legacy documents. */
export function normalizeStage3(raw: unknown): Stage3Data {
  const base = emptyStage3();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<Stage3Data>;
  return {
    // Built-in templates always exist: an empty/absent list re-seeds them.
    templates:
      Array.isArray(s.templates) && s.templates.length > 0
        ? s.templates.map((t) => ({ ...t, tasks: Array.isArray(t.tasks) ? t.tasks : [] }))
        : base.templates,
    onboardings: Array.isArray(s.onboardings)
      ? s.onboardings.map((o) => ({ ...o, tasks: Array.isArray(o.tasks) ? o.tasks : [] }))
      : [],
    clients: Array.isArray(s.clients)
      ? s.clients.map((c) => ({ ...c, expansionIdeas: Array.isArray(c.expansionIdeas) ? c.expansionIdeas : [] }))
      : [],
    actions: Array.isArray(s.actions) ? s.actions : [],
    reviews: Array.isArray(s.reviews) ? s.reviews : [],
    growthReviews: Array.isArray(s.growthReviews)
      ? s.growthReviews.map((g) => ({ ...g, nextActions: Array.isArray(g.nextActions) ? g.nextActions : [] }))
      : [],
  };
}

/* -------------------------------- factories ------------------------------- */

export function newOnboardingTask(partial: Partial<OnboardingTask> = {}): OnboardingTask {
  return {
    id: uid(),
    title: "",
    detail: "",
    phase: "welcome",
    status: "pending",
    dueDate: null,
    completedAt: null,
    ...partial,
  };
}

export function newOnboarding(partial: Partial<Onboarding> = {}): Onboarding {
  return {
    id: uid(),
    opportunityId: null,
    contact: "",
    company: "",
    offerRef: "",
    useCurrentOffer: true,
    templateId: "",
    templateName: "",
    status: "active",
    tasks: [],
    notes: "",
    clientId: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    ...partial,
  };
}

export function newClient(partial: Partial<Client> = {}): Client {
  const now = new Date().toISOString();
  return {
    id: uid(),
    contact: "",
    company: "",
    offerRef: "",
    useCurrentOffer: true,
    startDate: null,
    status: "active",
    satisfaction: "",
    satisfactionNote: "",
    recentWork: "",
    upcomingNeeds: "",
    renewalDate: null,
    renewalNote: "",
    expansionIdeas: [],
    relationshipNotes: "",
    nextReviewDate: null,
    onboardingId: null,
    opportunityId: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newRetentionAction(partial: Partial<RetentionAction> = {}): RetentionAction {
  return {
    id: uid(),
    clientId: "",
    type: "check-in",
    note: "",
    dueDate: todayISO(),
    completedAt: null,
    createdAt: new Date().toISOString(),
    origin: "manual",
    ...partial,
  };
}

export function newRetentionReview(partial: Partial<RetentionReview> = {}): RetentionReview {
  const now = new Date().toISOString();
  return {
    id: uid(),
    clientId: "",
    date: todayISO(),
    satisfaction: "",
    valueDelivered: "",
    nextNeeds: "",
    risks: "",
    opportunities: "",
    nextStep: "",
    followUpType: "",
    followUpDue: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newGrowthReview(partial: Partial<GrowthReview> = {}): GrowthReview {
  const now = new Date().toISOString();
  return {
    id: uid(),
    period: "weekly",
    label: "",
    startDate: todayISO(),
    endDate: todayISO(),
    whatWorked: "",
    whatDidnt: "",
    acquisitionLessons: "",
    channelLessons: "",
    offerLessons: "",
    salesLessons: "",
    deliveryLessons: "",
    retentionLessons: "",
    opportunities: "",
    priorities: "",
    nextActions: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/* ----------------------------- cross-system flow --------------------------- */

/**
 * Won opportunity → onboarding instance. Carries contact, company and offer
 * over from SELL and materialises the template's tasks with due dates counted
 * from `start`, so nothing has to be re-entered.
 */
export function tasksFromTemplate(template: OnboardingTemplate, start: string = todayISO()): OnboardingTask[] {
  const base = new Date(`${start}T00:00:00`);
  return template.tasks.map((tt) => ({
    id: uid(),
    title: tt.title,
    detail: tt.detail,
    phase: tt.phase,
    status: "pending",
    dueDate:
      tt.defaultOffsetDays == null
        ? null
        : todayISO(new Date(base.getTime() + tt.defaultOffsetDays * 86_400_000)),
    completedAt: null,
  }));
}

export function onboardingFromOpportunity(
  opp: Opportunity,
  ctx: BuildContext,
  template: OnboardingTemplate,
  start: string = todayISO(),
): Onboarding {
  const tasks = tasksFromTemplate(template, start);
  return newOnboarding({
    opportunityId: opp.id,
    contact: opp.prospect,
    company: opp.company,
    offerRef: opp.useCurrentOffer ? "" : opp.offerRef,
    useCurrentOffer: opp.useCurrentOffer && ctx.hasOffer,
    templateId: template.id,
    templateName: template.name,
    tasks,
    notes: opp.notes ? `From the sales process: ${opp.notes}` : "",
  });
}

/**
 * Completed onboarding → active client. The relationship record inherits the
 * delivery facts already captured; the first review is scheduled 30 days out.
 */
export function clientFromOnboarding(
  ob: Onboarding,
  ctx: BuildContext,
  start: string = todayISO(),
): Client {
  const d30 = new Date(`${start}T00:00:00`);
  d30.setDate(d30.getDate() + 30);
  return newClient({
    contact: ob.contact,
    company: ob.company,
    offerRef: ob.useCurrentOffer ? "" : ob.offerRef,
    useCurrentOffer: ob.useCurrentOffer && ctx.hasOffer,
    startDate: start,
    status: "active",
    nextReviewDate: todayISO(d30),
    onboardingId: ob.id,
    opportunityId: ob.opportunityId,
    relationshipNotes: ob.notes,
  });
}

/** Offer line shared by DELIVER/RETAIN displays. */
export function deliveryOfferLine(
  rec: { useCurrentOffer: boolean; offerRef: string },
  ctx: BuildContext,
): string {
  if (rec.useCurrentOffer) return ctx.offerName || "No offer defined";
  return rec.offerRef || "Offer not named";
}
