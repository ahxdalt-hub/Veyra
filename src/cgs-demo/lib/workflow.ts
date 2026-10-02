/**
 * Stage 2 domain model — ACQUIRE (strategy, outreach, follow-up) and
 * SELL (opportunities, proposals).
 *
 * All business rules live here as pure functions so the store stays thin and
 * the logic is unit-testable without React. Dates that users pick are stored
 * as calendar strings ("YYYY-MM-DD"); event times are full ISO timestamps.
 */

import { AppData, ModuleId, uid } from "@/cgs-demo/lib/stages";

/* ------------------------------- outreach -------------------------------- */

export type OutreachStatus =
  | "draft"
  | "contacted"
  | "follow-up"
  | "replied"
  | "qualified"
  | "won"
  | "lost"
  | "not-interested";

export const OUTREACH_STATUSES: OutreachStatus[] = [
  "draft",
  "contacted",
  "follow-up",
  "replied",
  "qualified",
  "won",
  "lost",
  "not-interested",
];

export const OUTREACH_STATUS_LABEL: Record<OutreachStatus, string> = {
  draft: "Draft",
  contacted: "Contacted",
  "follow-up": "Follow-up",
  replied: "Replied",
  qualified: "Qualified",
  won: "Converted",
  lost: "Lost",
  "not-interested": "Not interested",
};

/** Closing statuses end the outreach loop; no follow-ups should survive them. */
export const OUTREACH_CLOSED_STATUSES: OutreachStatus[] = [
  "won",
  "lost",
  "not-interested",
];

/** Where the contact sits in the acquisition journey. Kept coarser than
 *  status so both can change independently, with sensible defaults. */
export type OutreachStage =
  | "identified"
  | "active"
  | "conversation"
  | "qualified"
  | "handoff"
  | "archived";

export const OUTREACH_STAGES: OutreachStage[] = [
  "identified",
  "active",
  "conversation",
  "qualified",
  "handoff",
  "archived",
];

export const OUTREACH_STAGE_LABEL: Record<OutreachStage, string> = {
  identified: "Identified",
  active: "Active outreach",
  conversation: "In conversation",
  qualified: "Qualified",
  handoff: "Handed to sales",
  archived: "Archived",
};

/** A status change implies a journey move — unless the user set it manually. */
export const STATUS_TO_STAGE: Record<OutreachStatus, OutreachStage> = {
  draft: "identified",
  contacted: "active",
  "follow-up": "active",
  replied: "conversation",
  qualified: "qualified",
  won: "handoff",
  lost: "archived",
  "not-interested": "archived",
};

export interface OutreachRecord {
  id: string;
  person: string;
  company: string;
  contact: string; // email, phone, or profile link — free text
  channel: string; // matches a strategy channel label
  dateContacted: string | null; // YYYY-MM-DD
  message: string; // what was (or will be) sent
  status: OutreachStatus;
  stage: OutreachStage;
  nextFollowUpDate: string | null; // YYYY-MM-DD — mirrored into a linked task
  offerRef: string; // "" = current BUILD offer, otherwise custom text
  useCurrentOffer: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------- follow-ups ------------------------------- */

export interface FollowUpTask {
  id: string;
  outreachId: string | null;
  note: string;
  dueDate: string; // YYYY-MM-DD
  completedAt: string | null; // ISO timestamp
  createdAt: string;
  /** "outreach" tasks mirror the record's next-follow-up date; "manual" ones are free-standing. */
  origin: "outreach" | "manual";
}

export type FollowUpBucket = "completed" | "overdue" | "today" | "upcoming";

/* ------------------------------ opportunities ----------------------------- */

export type OpportunityStage =
  | "qualification"
  | "discovery"
  | "solution"
  | "objections"
  | "decision"
  | "closed";

export const OPPORTUNITY_STAGES: OpportunityStage[] = [
  "qualification",
  "discovery",
  "solution",
  "objections",
  "decision",
  "closed",
];

export const OPPORTUNITY_STAGE_LABEL: Record<OpportunityStage, string> = {
  qualification: "Qualification",
  discovery: "Discovery",
  solution: "Solution",
  objections: "Objections",
  decision: "Decision",
  closed: "Closed",
};

/** Pipeline stages before "closed" — used by the board view. */
export const OPEN_OPPORTUNITY_STAGES = OPPORTUNITY_STAGES.filter(
  (s) => s !== "closed",
) as Exclude<OpportunityStage, "closed">[];

export type OpportunityOutcome = "open" | "won" | "lost";

export interface OpportunityActivity {
  id: string;
  at: string; // ISO timestamp
  text: string;
}

export interface Opportunity {
  id: string;
  prospect: string;
  company: string;
  offerRef: string;
  useCurrentOffer: boolean;
  stage: OpportunityStage;
  outcome: OpportunityOutcome;
  lostReason: string;
  estimatedValue: number | null; // plain number, no currency assumed
  nextAction: string;
  nextActionDate: string | null; // YYYY-MM-DD
  notes: string;
  outreachId: string | null;
  createdAt: string;
  lastActivityAt: string;
  activities: OpportunityActivity[];
  closedAt: string | null; // ISO — set on won/lost so Stage 3 can read it
}

/* -------------------------------- proposals ------------------------------- */

export type ProposalStatus = "draft" | "sent";

export interface Proposal {
  id: string;
  client: string;
  company: string;
  opportunityId: string | null;
  status: ProposalStatus;
  problem: string;
  desiredOutcome: string;
  solution: string;
  deliverables: string[];
  scope: string;
  timeline: string;
  investment: string;
  terms: string;
  nextSteps: string;
  createdAt: string;
  updatedAt: string;
}

/* --------------------------- acquisition strategy -------------------------- */

export const CHANNEL_OPTIONS = [
  "Email",
  "LinkedIn",
  "X / Twitter",
  "Instagram",
  "Referral",
  "Partner network",
  "Community / forum",
  "Cold call",
  "Events / meetups",
  "Content / SEO",
  "Warm intro",
  "Other",
] as const;

export const FREQUENCY_OPTIONS = ["Daily", "Weekly", "Monthly"] as const;

export interface AcquisitionStrategy {
  primaryChannel: string;
  secondaryChannels: string[];
  experimentalChannels: string[];
  audienceNote: string; // only when the BUILD ideal client needs adjustment
  channelApproach: string;
  angleNote: string; // only when the positioning claim needs a channel twist
  desiredAction: string;
  frequency: string;
  weeklyTarget: number | null;
  priorities: string[];
  notes: string;
  updatedAt: string | null;
}

export const emptyStrategy = (): AcquisitionStrategy => ({
  primaryChannel: "",
  secondaryChannels: [],
  experimentalChannels: [],
  audienceNote: "",
  channelApproach: "",
  angleNote: "",
  desiredAction: "",
  frequency: "",
  weeklyTarget: null,
  priorities: [],
  notes: "",
  updatedAt: null,
});

/* -------------------------------- stage2 doc ------------------------------- */

export interface Stage2Data {
  strategy: AcquisitionStrategy;
  outreach: OutreachRecord[];
  followUps: FollowUpTask[];
  opportunities: Opportunity[];
  proposals: Proposal[];
}

export const emptyStage2 = (): Stage2Data => ({
  strategy: emptyStrategy(),
  outreach: [],
  followUps: [],
  opportunities: [],
  proposals: [],
});

/** Stage 2 collections live beside the BUILD modules inside AppData (see stages.ts). */
export function stage2(data: AppData): Stage2Data {
  return normalizeStage2(data.stage2);
}

/** Defensive normalization — tolerate partial/legacy documents. */
export function normalizeStage2(raw: unknown): Stage2Data {
  const base = emptyStage2();
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<Stage2Data>;
  return {
    strategy: { ...base.strategy, ...(s.strategy ?? {}) },
    outreach: Array.isArray(s.outreach) ? s.outreach : [],
    followUps: Array.isArray(s.followUps) ? s.followUps : [],
    opportunities: Array.isArray(s.opportunities)
      ? s.opportunities.map((o) => ({
          ...o,
          activities: Array.isArray(o.activities) ? o.activities : [],
        }))
      : [],
    proposals: Array.isArray(s.proposals)
      ? s.proposals.map((p) => ({ ...p, deliverables: Array.isArray(p.deliverables) ? p.deliverables : [] }))
      : [],
  };
}

/* ------------------------------- factories -------------------------------- */

export function newOutreach(partial: Partial<OutreachRecord> = {}): OutreachRecord {
  const now = new Date().toISOString();
  return {
    id: uid(),
    person: "",
    company: "",
    contact: "",
    channel: "",
    dateContacted: null,
    message: "",
    status: "draft",
    stage: "identified",
    nextFollowUpDate: null,
    offerRef: "",
    useCurrentOffer: true,
    notes: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newFollowUp(partial: Partial<FollowUpTask> = {}): FollowUpTask {
  return {
    id: uid(),
    outreachId: null,
    note: "",
    dueDate: todayISO(),
    completedAt: null,
    createdAt: new Date().toISOString(),
    origin: "manual",
    ...partial,
  };
}

export function newOpportunity(partial: Partial<Opportunity> = {}): Opportunity {
  const now = new Date().toISOString();
  return {
    id: uid(),
    prospect: "",
    company: "",
    offerRef: "",
    useCurrentOffer: true,
    stage: "qualification",
    outcome: "open",
    lostReason: "",
    estimatedValue: null,
    nextAction: "",
    nextActionDate: null,
    notes: "",
    outreachId: null,
    createdAt: now,
    lastActivityAt: now,
    activities: [],
    closedAt: null,
    ...partial,
  };
}

export function newProposal(partial: Partial<Proposal> = {}): Proposal {
  const now = new Date().toISOString();
  return {
    id: uid(),
    client: "",
    company: "",
    opportunityId: null,
    status: "draft",
    problem: "",
    desiredOutcome: "",
    solution: "",
    deliverables: [],
    scope: "",
    timeline: "",
    investment: "",
    terms: "",
    nextSteps: "",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/* -------------------------------- dates ---------------------------------- */

export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isCalendarDate(v: string | null | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Whole days from today until `date` (negative = past). */
export function daysFromToday(date: string, now: Date = new Date()): number {
  if (!isCalendarDate(date)) return 0;
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function formatCalendarDate(date: string | null): string {
  if (!isCalendarDate(date)) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: y === new Date().getFullYear() ? undefined : "numeric",
  });
}

/** "today" / "tomorrow" / "in 3 days" / "2 days overdue" — never a fake value. */
export function relativeDue(date: string | null, now: Date = new Date()): string {
  if (!isCalendarDate(date)) return "";
  const n = daysFromToday(date, now);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n > 1) return `in ${n} days`;
  if (n === -1) return "1 day overdue";
  return `${-n} days overdue`;
}

/* ------------------------------- validation ------------------------------- */

export interface FieldErrors {
  [key: string]: string;
}

export function validateOutreach(r: Partial<OutreachRecord>): FieldErrors {
  const e: FieldErrors = {};
  if (!r.person?.trim()) e.person = "A person’s name is required.";
  if (!r.company?.trim()) e.company = "A company is required.";
  if (r.status && r.status !== "draft" && !r.channel?.trim())
    e.channel = "Pick the channel used before contacting them.";
  if (r.status && r.status !== "draft" && !r.dateContacted)
    e.dateContacted = "Set the date they were contacted.";
  return e;
}

export function validateOpportunity(r: Partial<Opportunity>): FieldErrors {
  const e: FieldErrors = {};
  if (!r.prospect?.trim()) e.prospect = "A prospect name is required.";
  if (!r.company?.trim()) e.company = "A company is required.";
  if (r.estimatedValue != null && (!Number.isFinite(r.estimatedValue) || r.estimatedValue < 0))
    e.estimatedValue = "Estimated value must be a positive number.";
  return e;
}

export function validateProposal(r: Partial<Proposal>): FieldErrors {
  const e: FieldErrors = {};
  if (!r.client?.trim()) e.client = "A client contact is required.";
  if (!r.company?.trim()) e.company = "A company is required.";
  return e;
}

/** Required fields for marking the acquisition strategy complete/saved-ready. */
export function missingStrategyFields(s: AcquisitionStrategy): string[] {
  const missing: string[] = [];
  if (!s.primaryChannel.trim()) missing.push("Primary channel");
  if (!s.channelApproach.trim()) missing.push("Channel approach");
  if (!s.desiredAction.trim()) missing.push("Desired action");
  if (!s.frequency.trim()) missing.push("Frequency");
  if (s.weeklyTarget == null || s.weeklyTarget <= 0) missing.push("Weekly activity target");
  return missing;
}

/* --------------------------- business rules -------------------------------- */

export type FollowUpFilter = {
  status: "active" | "completed" | "all";
  bucket: FollowUpBucket | "all";
  query: string;
  outreachId?: string | null;
};

export function followUpBucket(t: FollowUpTask, now: Date = new Date()): FollowUpBucket {
  if (t.completedAt) return "completed";
  const n = daysFromToday(t.dueDate, now);
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  return "upcoming";
}

export function followUpSubject(t: FollowUpTask, outreach: OutreachRecord[]): string {
  const o = outreach.find((x) => x.id === t.outreachId);
  if (!o) return t.note || "Follow-up";
  return o.person.trim() ? `${o.person} · ${o.company}` : o.company;
}

export function filterFollowUps(
  tasks: FollowUpTask[],
  outreach: OutreachRecord[],
  f: FollowUpFilter,
  now: Date = new Date(),
): FollowUpTask[] {
  const q = f.query.trim().toLowerCase();
  return tasks.filter((t) => {
    if (f.outreachId && t.outreachId !== f.outreachId) return false;
    if (f.status === "active" && t.completedAt) return false;
    if (f.status === "completed" && !t.completedAt) return false;
    if (f.bucket !== "all" && followUpBucket(t, now) !== f.bucket) return false;
    if (q && !`${t.note} ${followUpSubject(t, outreach)}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

export interface FollowUpCounts {
  dueToday: number;
  overdue: number;
  upcoming: number;
  completed: number;
}

export function countFollowUps(tasks: FollowUpTask[], now: Date = new Date()): FollowUpCounts {
  const c: FollowUpCounts = { dueToday: 0, overdue: 0, upcoming: 0, completed: 0 };
  for (const t of tasks) {
    const b = followUpBucket(t, now);
    if (b === "today") c.dueToday += 1;
    else if (b === "overdue") c.overdue += 1;
    else if (b === "upcoming") c.upcoming += 1;
    else c.completed += 1;
  }
  return c;
}

/** Next upcoming follow-up after today, if any. */
export function nextFollowUp(tasks: FollowUpTask[], now: Date = new Date()): FollowUpTask | null {
  const upcoming = tasks
    .filter((t) => !t.completedAt && daysFromToday(t.dueDate, now) > 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return upcoming[0] ?? null;
}

/**
 * When an outreach record's next-follow-up date changes, keep exactly one
 * open linked task in sync. Closed statuses retire their pending tasks;
 * completed history is always preserved.
 */
export function syncFollowUpForOutreach(
  tasks: FollowUpTask[],
  record: OutreachRecord,
): FollowUpTask[] {
  const linked = tasks.filter((t) => t.outreachId === record.id);
  const keepHistory = linked.filter((t) => t.completedAt);
  const others = tasks.filter((t) => t.outreachId !== record.id);
  const open = linked.filter((t) => !t.completedAt);
  const closed = OUTREACH_CLOSED_STATUSES.includes(record.status);
  const date = isCalendarDate(record.nextFollowUpDate) ? record.nextFollowUpDate : null;

  if (closed || !date) return others.concat(keepHistory);

  if (open.length === 0) {
    return others.concat(
      keepHistory,
      [newFollowUp({
        outreachId: record.id,
        note: `Follow up with ${record.person || record.company}`,
        dueDate: date,
        origin: "outreach",
      })],
    );
  }
  // Keep the newest open task on the record's date; retire the rest.
  const keep = open.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return others.concat(keepHistory, [{ ...keep, dueDate: date, origin: "outreach" }]);
}

/** Apply a status change: the journey stage follows the new status.
 *  Users can still override the stage afterwards in the form.
 *  Moving off "draft" with no contact date stamps today — the contact went
 *  out now, and quick actions should never leave a half-empty record. */
export function applyStatusChange(
  record: OutreachRecord,
  status: OutreachStatus,
): OutreachRecord {
  return {
    ...record,
    status,
    dateContacted: status !== "draft" && !record.dateContacted ? todayISO() : record.dateContacted,
    stage: STATUS_TO_STAGE[status],
    updatedAt: new Date().toISOString(),
  };
}

export function isOppOpen(o: Opportunity): boolean {
  return o.stage !== "closed" && o.outcome === "open";
}

export function openOpportunities(data: AppData): Opportunity[] {
  return stage2(data).opportunities.filter(isOppOpen);
}

export function openPipelineValue(data: AppData): number {
  return openOpportunities(data).reduce((sum, o) => sum + (o.estimatedValue ?? 0), 0);
}

export function wonOpportunities(data: AppData): Opportunity[] {
  return stage2(data).opportunities.filter((o) => o.outcome === "won");
}

/** Open opportunities with a next action due today or earlier — the "do this" queue. */
export function dueSalesActions(data: AppData, now: Date = new Date()): Opportunity[] {
  return openOpportunities(data)
    .filter((o) => isCalendarDate(o.nextActionDate) && daysFromToday(o.nextActionDate!, now) <= 0)
    .sort((a, b) => (a.nextActionDate ?? "").localeCompare(b.nextActionDate ?? ""));
}

export function formatValue(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

/* ----------------------------- cross-system ------------------------------- */

/** Snapshot of BUILD context that ACQUIRE and SELL read but never copy. */
export interface BuildContext {
  businessName: string;
  positioningTarget: string; // positioning.fields.target
  positioningClaim: string; // positioning.fields.why
  idealClientType: string; // ideal-client.fields.type
  idealClientIndustry: string; // ideal-client.fields.industry
  offerName: string; // offer.fields.name
  offerPrice: string;
  offerTimeline: string;
  offerOutcome: string;
  offerProblem: string;
  offerDeliverables: string[];
  qualificationCriteria: string[]; // ideal-client list
  hasOffer: boolean;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const textList = (items: { id: string; text?: string }[] | undefined): string[] =>
  (items ?? []).map((i) => (i.text ?? "").trim()).filter(Boolean);

export function buildContext(data: AppData): BuildContext {
  const mod = (id: ModuleId) => data.modules[id]?.fields ?? {};
  const lists = (id: ModuleId, blockId: string) => data.modules[id]?.lists?.[blockId];
  const ideal = mod("ideal-client");
  const offer = mod("offer");
  const offerName = str(offer.name);
  return {
    businessName: str(mod("foundation").name),
    positioningTarget: str(mod("positioning").target),
    positioningClaim: str(mod("positioning").why),
    idealClientType: str(ideal.type),
    idealClientIndustry: str(ideal.industry),
    offerName,
    offerPrice: str(offer.price),
    offerTimeline: str(offer.timeline),
    offerOutcome: str(offer.outcome),
    offerProblem: str(offer.problem),
    offerDeliverables: textList(lists("offer", "deliverables")),
    qualificationCriteria: textList(lists("ideal-client", "qualification")),
    hasOffer: !!offerName,
  };
}

/** Outreach → Opportunity handoff: what carries over automatically. */
export function opportunityFromOutreach(o: OutreachRecord, ctx: BuildContext): Opportunity {
  return newOpportunity({
    prospect: o.person,
    company: o.company,
    offerRef: o.useCurrentOffer ? "" : o.offerRef,
    useCurrentOffer: o.useCurrentOffer && ctx.hasOffer,
    outreachId: o.id,
    stage: "qualification",
    notes: o.notes ? `From outreach: ${o.notes}` : "",
    activities: [
      {
        id: uid(),
        at: new Date().toISOString(),
        text: `Created from qualified outreach (${OUTREACH_STATUS_LABEL[o.status]}${o.channel ? ` via ${o.channel}` : ""}).`,
      },
    ],
  });
}

/** Opportunity + BUILD offer → proposal skeleton. Prefills, never overwrites user edits. */
export function proposalFromOpportunity(
  o: Opportunity,
  ctx: BuildContext,
): Proposal {
  return newProposal({
    client: o.prospect,
    company: o.company,
    opportunityId: o.id,
    problem: ctx.offerProblem,
    desiredOutcome: ctx.offerOutcome,
    solution: ctx.offerName,
    deliverables: ctx.offerDeliverables,
    timeline: ctx.offerTimeline,
    investment: ctx.offerPrice,
    nextSteps: o.nextAction || "Call to walk through the proposal and agree next steps.",
  });
}

/** Outreach channels the strategy defines — used by the record picker. */
export function strategyChannels(s: AcquisitionStrategy): string[] {
  const seen = new Set<string>();
  const all: string[] = [];
  for (const c of [s.primaryChannel, ...s.secondaryChannels, ...s.experimentalChannels]) {
    const t = c.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      all.push(t);
    }
  }
  return all;
}

/* --------------------------------- exports -------------------------------- */

export function exportProposalText(p: Proposal, ctx: BuildContext): string {
  const title = `Proposal — ${p.company || p.client || "Untitled"}`;
  const L: string[] = [title, "=".repeat(title.length), ""];
  if (ctx.businessName) L.push(`From: ${ctx.businessName}`, "");
  L.push(`Client: ${p.client}${p.company ? ` · ${p.company}` : ""}`, `Status: ${p.status}`, "");
  const section = (label: string, body: string | string[]) => {
    const value = Array.isArray(body) ? body.filter(Boolean) : body.trim();
    if (!value || (Array.isArray(value) && value.length === 0)) return;
    L.push(label.toUpperCase(), Array.isArray(value) ? value.map((v) => `  • ${v}`).join("\n") : value, "");
  };
  section("Problem", p.problem);
  section("Desired outcome", p.desiredOutcome);
  section("Solution", p.solution);
  section("Deliverables", p.deliverables);
  section("Scope", p.scope);
  section("Timeline", p.timeline);
  section("Investment", p.investment);
  section("Terms", p.terms);
  section("Next steps", p.nextSteps);
  return L.join("\n").trim();
}
