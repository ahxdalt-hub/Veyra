/**
 * Demo dataset — "Foundry & Finch", a fictional two-person brand studio.
 *
 * Shaped exactly like a desktop workspace document (AppData) so every page,
 * badge, and insight in the ported app reads it unmodified. Dates are
 * computed relative to load time, so the demo always looks recently used:
 * something is due today, something is overdue, something is coming up.
 */

import { AppData, LogEntry } from "@/cgs-demo/lib/stages";
import { OutreachRecord, Stage2Data } from "@/cgs-demo/lib/workflow";
import {
  Client,
  GrowthReview,
  Onboarding,
  OnboardingTask,
  RetentionAction,
  RetentionReview,
  Stage3Data,
} from "@/cgs-demo/lib/delivery";

/* --------------------------------- clocks --------------------------------- */

const NOW = new Date();

/** Calendar date (YYYY-MM-DD) offset from today by n days. */
function cal(offsetDays: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Full ISO timestamp offset from now. */
function stamp(offsetDays: number, minutes = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offsetDays);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

/* ------------------------------ BUILD modules ------------------------------ */

const foundation = {
  fields: {
    name: "Foundry & Finch",
    type: "Small agency",
    model: "Hybrid",
    stage: "Established, plateaued",
    objective:
      "Replace one-off logo work with two productized engagements, and land three qualified projects per quarter without hourly overflow.",
  },
  lists: {
    services: [
      { id: "sv-1", text: "Brand identity systems for craft beverage and food brands" },
      { id: "sv-2", text: "Packaging design sprints (label systems, shelf-ready artwork)" },
      { id: "sv-3", text: "Website art direction and launch asset kits" },
      { id: "sv-4", text: "Quarterly design retainers for growing CPG teams" },
    ],
    assets: [
      { id: "st-1", text: "Ten years of packaging work with regional distributors — we know what survives a warehouse" },
      { id: "st-2", text: "Full identity handoff: files, guidelines, and print specs, not just pretty decks" },
      { id: "st-3", text: "Two-week turnaround on small, well-scoped launches" },
    ],
    constraints: [
      { id: "cn-1", text: "~24 client-hours per week across the two-person studio" },
      { id: "cn-2", text: "No in-house copywriting — we partner for voice work" },
      { id: "cn-3", text: "Cannot hold more than two active sprints at once" },
    ],
  },
};

const positioning = {
  fields: {
    target:
      "Founder-led craft beverage and specialty-food companies between first regional wins and national distribution.",
    problem:
      "Their brand looked fine at farmers' markets but falls apart at scale — inconsistent labels, no system, and reprints whenever a SKU changes.",
    outcome:
      "A shelf-ready identity system: every label, variant, and asset follows one coherent set of rules the team can run without us.",
    method:
      "We start from the production reality — dielines, print methods, distributor requirements — and design the identity backwards from what has to survive it.",
    differentiation:
      "Most brand studios hand over a guideline PDF. We hand over the artwork itself: press-ready templates for every current SKU and a tested process for the next one.",
    why:
      "The only studio that ships the brand in a box — the identity, the press-ready files, and the rhythm to keep both honest.",
  },
  lists: {},
};

const offer = {
  fields: {
    name: "Brand Launch Sprint",
    customer: "Craft beverage and food founders about to widen distribution",
    price: "$6,800 fixed, deposit to start",
    timeline: "3 weeks from kickoff",
    problem:
      "A rebrand that stalls in PDF-land: concepts approved, artwork never lands on the actual package.",
    outcome:
      "Shelf-ready artwork for every current SKU, plus a template kit for the next five launches, delivered in three weeks.",
    edge:
      "Design and production in one motion — nothing gets approved that cannot be printed on their line.",
    reversal:
      "If the first SKU's artwork does not clear their printer's preflight, the rest of the sprint is free.",
  },
  lists: {
    deliverables: [
      { id: "dl-1", text: "Identity refresh: mark, palette, type system, lockups" },
      { id: "dl-2", text: "Press-ready label artwork for every current SKU" },
      { id: "dl-3", text: "Template kit for future variants (Figma + print files)" },
      { id: "dl-4", text: "One-page rules sheet the team can run without us" },
    ],
    process: [
      {
        id: "pr-1",
        title: "Week 1 — Production audit",
        detail: "Collect dielines, print specs, current artwork; flag everything that will not scale.",
      },
      {
        id: "pr-2",
        title: "Week 2 — System design",
        detail: "Identity and label system built directly on the real production constraints.",
      },
      {
        id: "pr-3",
        title: "Week 3 — Preflight and handoff",
        detail: "Artwork clears the printer, template kit is tested with their team, rules sheet ships.",
      },
    ],
  },
};

const idealClient = {
  fields: {
    type: "Founder-led craft beverage or specialty-food company",
    industry: "Craft cider, kombucha, small-batch sauces — light CPG",
    current:
      "Carved a regional niche, about to sign a second distributor, artwork held together by a freelancer's files.",
    problems:
      "\"Every SKU looks slightly different, our printer keeps rejecting files, and rebrands stall at the mockup stage.\"",
    goals:
      "Look as established as they want to become — without pausing shipments to redesign.",
    triggers: ["New distributor deal", "Retail listing feedback", "Failed previous rebrand", "Seasonal launch window"],
    alternatives: ["Big design agency", "Freelance logo site", "Doing nothing until volume grows"],
  },
  lists: {
    profile: [
      { id: "pf-1", text: "Two to fifteen people, founder still makes design calls" },
      { id: "pf-2", text: "Physical product with real production constraints" },
      { id: "pf-3", text: "Already past the 'friends run it' stage" },
    ],
    fit: [
      { id: "ft-1", text: "Wants brand work without giving us artwork approval cycles from five stakeholders" },
      { id: "ft-2", text: "Chases award aesthetics over production reality" },
    ],
    qualification: [
      { id: "qc-1", text: "Budget above $5k and a launch window within eight weeks" },
      { id: "qc-2", text: "Decision maker on the first call" },
    ],
  },
};

/* -------------------------------- stage 2 --------------------------------- */

const outreach: OutreachRecord[] = [
  {
    id: "ou-1",
    person: "Maya Okafor",
    company: "Tidewater Cider",
    contact: "maya@tidewatercider.com",
    channel: "Warm intro",
    dateContacted: cal(-34),
    message:
      "Intro from their co-founder's roaster; opened with the two SKUs whose labels fight each other on shelf.",
    status: "won",
    stage: "handoff",
    nextFollowUpDate: null,
    offerRef: "",
    useCurrentOffer: true,
    notes: "Signed the Brand Launch Sprint after the discovery call. Deposit in.",
    createdAt: stamp(-34),
    updatedAt: stamp(-26),
  },
  {
    id: "ou-2",
    person: "Daniel Reyes",
    company: "Ember & Rye Sauces",
    contact: "daniel@emberandrye.com",
    channel: "Email",
    dateContacted: cal(-18),
    message:
      "Cold email referencing their hot-sauce relaunch — label got rejected by their printer, we showed the fix.",
    status: "qualified",
    stage: "qualified",
    nextFollowUpDate: null,
    offerRef: "",
    useCurrentOffer: true,
    notes: "Budget confirmed, wants to start after bottling week.",
    createdAt: stamp(-18),
    updatedAt: stamp(-9),
  },
  {
    id: "ou-3",
    person: "Priya Natarajan",
    company: "Kite Kombucha",
    contact: "priya@kitekombucha.co",
    channel: "Instagram",
    dateContacted: cal(-7),
    message: "Replied to our shelf-side story series; sent two before/after cases from a similar bottler.",
    status: "follow-up",
    stage: "active",
    nextFollowUpDate: cal(-1),
    offerRef: "",
    useCurrentOffer: true,
    notes: "Loves the work, but asked about timing twice — capacity fear, not price.",
    createdAt: stamp(-7),
    updatedAt: stamp(-7),
  },
  {
    id: "ou-4",
    person: "Tom Halvorsen",
    company: "North Field Meadery",
    contact: "tom@northfieldmead.com",
    channel: "Referral",
    dateContacted: cal(-5),
    message: "Referred by Maya. Sent the rules-sheet sample PDF.",
    status: "replied",
    stage: "conversation",
    nextFollowUpDate: cal(1),
    offerRef: "",
    useCurrentOffer: true,
    notes: "Asked whether mead flight variants fit the template kit. They do.",
    createdAt: stamp(-5),
    updatedAt: stamp(-2),
  },
  {
    id: "ou-5",
    person: "Grace Lindqvist",
    company: "Solvatten Seltzer",
    contact: "grace@solvatten.se",
    channel: "Email",
    dateContacted: cal(-21),
    message: "EU market, our print specs do not match their canner. Qualified out honestly.",
    status: "not-interested",
    stage: "archived",
    nextFollowUpDate: null,
    offerRef: "",
    useCurrentOffer: true,
    notes: "Right person, wrong fit. Told them so in one line.",
    createdAt: stamp(-21),
    updatedAt: stamp(-20),
  },
];

const followUps = [
  {
    id: "fu-1",
    outreachId: "ou-3",
    note: "Chase Priya — she goes quiet when a decision is close.",
    dueDate: cal(-1),
    completedAt: null,
    createdAt: stamp(-7),
    origin: "outreach" as const,
  },
  {
    id: "fu-2",
    outreachId: "ou-4",
    note: "Send Tom the mead-flight variant example.",
    dueDate: cal(0),
    completedAt: null,
    createdAt: stamp(-2),
    origin: "outreach" as const,
  },
  {
    id: "fu-3",
    outreachId: "ou-2",
    note: "Re-engage Daniel after bottling week.",
    dueDate: cal(4),
    completedAt: null,
    createdAt: stamp(-9),
    origin: "outreach" as const,
  },
  {
    id: "fu-4",
    outreachId: null,
    note: "Ask Maya for two retail sell-sheet intros at the distributor event.",
    dueDate: cal(2),
    completedAt: null,
    createdAt: stamp(-6),
    origin: "manual" as const,
  },
  {
    id: "fu-5",
    outreachId: null,
    note: "Ship the rules-sheet sample PDF request for Ember & Rye.",
    dueDate: cal(-4),
    completedAt: stamp(-3),
    createdAt: stamp(-10),
    origin: "manual" as const,
  },
];

const stage2: Stage2Data = {
  strategy: {
    primaryChannel: "Warm intro",
    secondaryChannels: ["Email", "Instagram", "Referral"],
    experimentalChannels: ["Community / forum"],
    audienceNote: "",
    channelApproach:
      "Two project shots and one specific, honest observation about their current label — never a pitch deck.",
    angleNote: "Lead with shelf and printer outcomes, not awards or aesthetics.",
    desiredAction: "Book a 20-minute intro call with the founder",
    frequency: "Weekly",
    weeklyTarget: 8,
    priorities: [
      "Past-client referrals (Maya's network first)",
      "Instagram replies on the shelf-side series",
    ],
    notes: "Replies cluster Tuesday–Thursday mornings. EU time zones convert badly — skip.",
    updatedAt: stamp(-11),
  },
  outreach,
  followUps,
  opportunities: [
    {
      id: "op-1",
      prospect: "Maya Okafor",
      company: "Tidewater Cider",
      offerRef: "",
      useCurrentOffer: true,
      stage: "closed",
      outcome: "won",
      lostReason: "",
      estimatedValue: 6800,
      nextAction: "",
      nextActionDate: null,
      notes: "Fastest clean close we've had. The preflight demo did it.",
      outreachId: "ou-1",
      createdAt: stamp(-30),
      lastActivityAt: stamp(-26),
      activities: [
        { id: "ac-1", at: stamp(-29), text: "Discovery call: three SKUs, distributor deal signed in April." },
        { id: "ac-2", at: stamp(-27), text: "Sent scope + the printer-preflight guarantee line." },
        { id: "ac-3", at: stamp(-26), text: "Verbal yes, deposit invoiced. Moving to onboarding." },
      ],
      closedAt: stamp(-26),
    },
    {
      id: "op-2",
      prospect: "Daniel Reyes",
      company: "Ember & Rye Sauces",
      offerRef: "",
      useCurrentOffer: true,
      stage: "decision",
      outcome: "open",
      lostReason: "",
      estimatedValue: 9400,
      nextAction: "Send the revised scope with the retainer add-on priced separately",
      nextActionDate: cal(1),
      notes: "Wants hot-sauce line plus the seasonal BBQ range. Bottling week ends Friday.",
      outreachId: "ou-2",
      createdAt: stamp(-14),
      lastActivityAt: stamp(-3),
      activities: [
        { id: "ac-4", at: stamp(-12), text: "Discovery: eight SKUs, canner preflight is the pain." },
        { id: "ac-5", at: stamp(-8), text: "Proposal sent — draft v1 with two scope tiers." },
        { id: "ac-6", at: stamp(-3), text: "Asked to split the retainer out of the sprint price." },
      ],
      closedAt: null,
    },
    {
      id: "op-3",
      prospect: "Tom Halvorsen",
      company: "North Field Meadery",
      offerRef: "",
      useCurrentOffer: true,
      stage: "qualification",
      outcome: "open",
      lostReason: "",
      estimatedValue: null,
      nextAction: "Confirm the decision maker before the intro call",
      nextActionDate: cal(-2),
      notes: "Referred by Maya — high trust, unknown budget.",
      outreachId: "ou-4",
      createdAt: stamp(-2),
      lastActivityAt: stamp(-2),
      activities: [
        { id: "ac-7", at: stamp(-2), text: "Replied to our email. Intro call tentatively Friday." },
      ],
      closedAt: null,
    },
    {
      id: "op-4",
      prospect: "Sofia Marchetti",
      company: "Verde Kombucha",
      offerRef: "Custom — identity only, no packaging",
      useCurrentOffer: false,
      stage: "closed",
      outcome: "lost",
      lostReason: "Chose an in-house hire; timing gap we could not bridge.",
      estimatedValue: 5200,
      nextAction: "",
      nextActionDate: null,
      notes: "Re-check in two quarters — the hire might not stick.",
      outreachId: null,
      createdAt: stamp(-45),
      lastActivityAt: stamp(-32),
      activities: [
        { id: "ac-8", at: stamp(-38), text: "Proposal sent." },
        { id: "ac-9", at: stamp(-32), text: "Lost to in-house hire. Feedback was gracious." },
      ],
      closedAt: stamp(-32),
    },
  ],
  proposals: [
    {
      id: "pv-1",
      client: "Daniel Reyes",
      company: "Ember & Rye Sauces",
      opportunityId: "op-2",
      status: "sent",
      problem:
        "Eight hot-sauce SKUs drift label to label; the canner keeps rejecting artwork files late in runs.",
      desiredOutcome:
        "One label system, all current SKUs preflight-approved, and a template kit the bottling team can run.",
      solution:
        "Brand Launch Sprint on the full SKU list, with canner preflight built into week three.",
      deliverables: [
        "Identity refresh tuned for the hot-sauce line",
        "Press-ready artwork for eight SKUs",
        "Template kit for the seasonal BBQ range",
        "Rules sheet for the bottling team",
      ],
      scope: "The current eight SKUs plus five future variants via templates. Photography and copy excluded.",
      timeline: "3 weeks from kickoff; artwork freezes before their bottling week if we start by the 10th.",
      investment: "$9,400 fixed",
      terms: "40% deposit, balance at preflight sign-off. First SKU clears the canner or the rest is free.",
      nextSteps: "Verbal confirm by Friday, kickoff Monday of bottling week.",
      createdAt: stamp(-8),
      updatedAt: stamp(-3),
    },
    {
      id: "pv-2",
      client: "Tom Halvorsen",
      company: "North Field Meadery",
      opportunityId: "op-3",
      status: "draft",
      problem: "Mead flight labels are hand-assembled per batch; nothing scales past the taproom.",
      desiredOutcome: "A flight label system that survives retail shelving.",
      solution: "Brand Launch Sprint, adapted scope for batch-varying artwork.",
      deliverables: ["Identity system", "Flight label template set"],
      scope: "TBD pending the intro call — decision maker and budget still unconfirmed.",
      timeline: "3 weeks from kickoff",
      investment: "",
      terms: "",
      nextSteps: "Qualify first; do not send until Maya confirms the buyer.",
      createdAt: stamp(-1),
      updatedAt: stamp(-1),
    },
  ],
};

/* -------------------------------- stage 3 --------------------------------- */

function task(
  id: string,
  phase: OnboardingTask["phase"],
  title: string,
  detail: string,
  status: OnboardingTask["status"],
  dueDate: string | null,
  completedAt: string | null,
): OnboardingTask {
  return { id, phase, title, detail, status, dueDate, completedAt };
}

const onboardings: Onboarding[] = [
  {
    id: "ob-1",
    opportunityId: "op-1",
    contact: "Maya Okafor",
    company: "Tidewater Cider",
    offerRef: "",
    useCurrentOffer: true,
    templateId: "tpl-project",
    templateName: "Project delivery",
    status: "active",
    tasks: [
      task("t-1", "welcome", "Send welcome message", "Introduce the process, timeline, and how you work together.", "done", cal(-12), stamp(-12)),
      task("t-2", "welcome", "Confirm contacts and rhythm", "Who decides, who does the work, when you talk.", "done", cal(-11), stamp(-11)),
      task("t-3", "information", "Collect access and materials", "Everything needed to start: accounts, data, brand assets.", "done", cal(-9), stamp(-9)),
      task("t-4", "information", "Agree success criteria in writing", "What makes this project a yes, stated plainly.", "done", cal(-7), stamp(-7)),
      task("t-5", "kickoff", "Hold the kickoff call", "Walk the plan, set expectations, start the clock.", "done", cal(-5), stamp(-5)),
      task("t-6", "setup", "Set up the working space", "Shared folder, board, or channel the project lives in.", "pending", cal(-3), null),
      task("t-7", "setup", "Confirm milestone dates", "Lock the schedule against the offer timeline.", "pending", cal(-1), null),
      task("t-8", "milestone", "Deliver the first milestone", "The first visible piece of real value.", "pending", cal(2), null),
      task("t-9", "milestone", "Review against criteria", "Did it land as agreed? Capture the answer.", "pending", cal(4), null),
    ],
    notes: "Maya wants the cider flight artwork first — distributor visit on the 18th.",
    clientId: null,
    startedAt: stamp(-12),
    completedAt: null,
  },
  {
    id: "ob-2",
    opportunityId: null,
    contact: "Elena Duarte",
    company: "Bramble & Rye",
    offerRef: "",
    useCurrentOffer: true,
    templateId: "tpl-project",
    templateName: "Project delivery",
    status: "completed",
    tasks: [
      task("u-1", "welcome", "Send welcome message", "", "done", cal(-64), stamp(-64)),
      task("u-2", "welcome", "Confirm contacts and rhythm", "", "done", cal(-63), stamp(-63)),
      task("u-3", "information", "Collect access and materials", "", "done", cal(-61), stamp(-61)),
      task("u-4", "information", "Agree success criteria in writing", "", "done", cal(-59), stamp(-59)),
      task("u-5", "kickoff", "Hold the kickoff call", "", "done", cal(-57), stamp(-57)),
      task("u-6", "setup", "Set up the working space", "", "done", cal(-55), stamp(-55)),
      task("u-7", "setup", "Confirm milestone dates", "", "done", cal(-54), stamp(-54)),
      task("u-8", "milestone", "Deliver the first milestone", "", "done", cal(-50), stamp(-50)),
      task("u-9", "milestone", "Review against criteria", "Cleared preflight on the first run.", "done", cal(-48), stamp(-48)),
    ],
    notes: "Clean delivery. The sell-sheet expansion came out of this.",
    clientId: "cl-1",
    startedAt: stamp(-64),
    completedAt: stamp(-58),
  },
];

const clients: Client[] = [
  {
    id: "cl-1",
    contact: "Elena Duarte",
    company: "Bramble & Rye",
    offerRef: "",
    useCurrentOffer: true,
    startDate: cal(-58),
    status: "active",
    satisfaction: "good",
    satisfactionNote: "Happy with the system; her ops lead now runs the templates alone.",
    recentWork: "Seasonal rhubarb variant shipped without us touching it.",
    upcomingNeeds: "Retail sell-sheet design for two new accounts.",
    renewalDate: cal(64),
    renewalNote: "Quarterly retainer review scheduled for next quarter.",
    expansionIdeas: ["Packaging refresh for the winter SKU", "Retail sell-sheet design"],
    relationshipNotes: "Elena replies fast on Tuesdays. Send decisions, not drafts.",
    nextReviewDate: cal(-3),
    onboardingId: "ob-2",
    opportunityId: null,
    createdAt: stamp(-58),
    updatedAt: stamp(-26),
  },
  {
    id: "cl-2",
    contact: "Jonas Petri",
    company: "Kessel & Co. Snacks",
    offerRef: "Identity care retainer",
    useCurrentOffer: false,
    startDate: cal(-140),
    status: "at-risk",
    satisfaction: "at-risk",
    satisfactionNote: "Two missed approvals in a row; their new marketing lead prefers in-house tools.",
    recentWork: "Updated multipack carton artwork.",
    upcomingNeeds: "Nothing requested — which is the worry.",
    renewalDate: cal(21),
    renewalNote: "Renewal conversation due before the 21st. Do not let it slip.",
    expansionIdeas: [],
    relationshipNotes: "Jonas is warm but time-poor. Get the renewal talk on calendars, not email.",
    nextReviewDate: cal(0),
    onboardingId: null,
    opportunityId: null,
    createdAt: stamp(-140),
    updatedAt: stamp(-9),
  },
  {
    id: "cl-3",
    contact: "Ruth Abara",
    company: "Highwater Coffee Roasters",
    offerRef: "",
    useCurrentOffer: true,
    startDate: cal(-220),
    status: "completed",
    satisfaction: "great",
    satisfactionNote: "\"Best money we spent all year.\" Referred Maya to us — full circle.",
    recentWork: "Bag system across six roasts; their team has run it solo since.",
    upcomingNeeds: "None — deliberately. They're set for a year.",
    renewalDate: null,
    renewalNote: "",
    expansionIdeas: ["Possible wholesale-line expansion in autumn"],
    relationshipNotes: "Keep warm quarterly. Referral engine for the studio.",
    nextReviewDate: cal(38),
    onboardingId: null,
    opportunityId: null,
    createdAt: stamp(-220),
    updatedAt: stamp(-40),
  },
];

const actions: RetentionAction[] = [
  {
    id: "ra-1",
    clientId: "cl-2",
    type: "renewal",
    note: "Renewal call with Jonas — bring the two approved cartons as proof of momentum.",
    dueDate: cal(-2),
    completedAt: null,
    createdAt: stamp(-8),
    origin: "manual",
  },
  {
    id: "ra-2",
    clientId: "cl-1",
    type: "review",
    note: "Overdue retention review — send the five-question form before the call.",
    dueDate: cal(2),
    completedAt: null,
    createdAt: stamp(-5),
    origin: "review",
  },
  {
    id: "ra-3",
    clientId: "cl-3",
    type: "check-in",
    note: "Quarterly 'how's the system surviving' note to Ruth.",
    dueDate: cal(12),
    completedAt: null,
    createdAt: stamp(-20),
    origin: "manual",
  },
  {
    id: "ra-4",
    clientId: "cl-1",
    type: "expansion",
    note: "Pitch the retail sell-sheet scope to Elena.",
    dueDate: cal(-6),
    completedAt: stamp(-4),
    createdAt: stamp(-14),
    origin: "review",
  },
];

const reviews: RetentionReview[] = [
  {
    id: "rv-1",
    clientId: "cl-1",
    date: cal(-32),
    satisfaction: "satisfied",
    valueDelivered: "The template kit paid for itself on the rhubarb variant alone.",
    nextNeeds: "Sell sheets for two new retail accounts by month's end.",
    risks: "None raised. Ops lead confident running templates solo.",
    opportunities: "She mentioned Bramble is widening to grocery — more SKUs.",
    nextStep: "Send sell-sheet scope as a one-page add-on.",
    followUpType: "expansion",
    followUpDue: cal(-14),
    completedAt: stamp(-32),
    createdAt: stamp(-34),
    updatedAt: stamp(-32),
  },
  {
    id: "rv-2",
    clientId: "cl-2",
    date: null,
    satisfaction: "",
    valueDelivered: "",
    nextNeeds: "Find out whether the new marketing lead intends to renew at all.",
    risks: "Silence on artwork requests for three weeks.",
    opportunities: "",
    nextStep: "",
    followUpType: "",
    followUpDue: null,
    completedAt: null,
    createdAt: stamp(-9),
    updatedAt: stamp(-9),
  },
];

const growthReviews: GrowthReview[] = [
  {
    id: "gr-1",
    period: "monthly",
    label: "Month in review — last month",
    startDate: cal(-38),
    endDate: cal(-8),
    whatWorked:
      "Warm intros converted 3x cold email. The preflight guarantee line closed Tidewater in six days.",
    whatDidnt:
      "Instagram DMs ate hours and produced one real conversation. EU outreach is a dead quarter.",
    acquisitionLessons: "Double down on referral asks at project wrap-ups — that is now half the pipeline.",
    channelLessons: "Cut Instagram to 20 minutes/week. Email only to warm lists.",
    offerLessons: "Two prospects asked to unbundle the retainer from the sprint — price it separately.",
    salesLessons: "Discovery call + same-evening scope beats any follow-up sequence.",
    deliveryLessons: "Kickoff-by-week-one is realistic; the working-space task keeps slipping.",
    retentionLessons: "Kessel's silence is the story. Review form too long for a busy ops person.",
    opportunities: "Bramble grocery expansion; Maya's distributor event intros.",
    priorities: "Fix the renewal conversation with Kessel before it dies quietly.",
    nextActions: [
      "Publish the retainer as its own priced add-on",
      "Add 'ask for two intros' to the offboarding checklist",
      "Trim the review form to five questions",
    ],
    createdAt: stamp(-8),
    updatedAt: stamp(-7),
  },
  {
    id: "gr-2",
    period: "quarterly",
    label: "Quarter look-back",
    startDate: cal(-98),
    endDate: cal(-68),
    whatWorked: "The shelf-side story series started inbound interest from brands we never contacted.",
    whatDidnt: "Took on a logo-only project to fill the calendar; it bled a fortnight.",
    acquisitionLessons: "Content warms, but intros close. Sequence: intro first, content support second.",
    channelLessons: "Distributor events outperform every screen.",
    offerLessons: "Fixed price held. Zero scope creep on the sprint format.",
    salesLessons: "Stopping 'yes for cash' projects was worth more than taking them.",
    deliveryLessons: "Two parallel sprints is the real ceiling, not three.",
    retentionLessons: "Highwater's referral proves satisfied clients are the cheapest channel.",
    opportunities: "Codify the preflight guarantee into every proposal header.",
    priorities: "Build the referral ask into delivery, not afterthoughts.",
    nextActions: ["Draft the offboarding referral script", "Cap sprints at two concurrent"],
    createdAt: stamp(-67),
    updatedAt: stamp(-66),
  },
];

const stage3: Stage3Data = {
  templates: [], // normalizeStage3 re-seeds the built-ins with stable ids
  onboardings,
  clients,
  actions,
  reviews,
  growthReviews,
};

/* ---------------------------------- log ----------------------------------- */

const log: LogEntry[] = [
  { id: "lg-1", at: stamp(-1, 20), text: "Growth review opened: Month in review." },
  { id: "lg-2", at: stamp(-2), text: "Proposal drafted for North Field Meadery." },
  { id: "lg-3", at: stamp(-3, -30), text: "Ember & Rye asked to split the retainer out of the sprint." },
  { id: "lg-4", at: stamp(-5), text: "Kickoff call held for Tidewater Cider." },
  { id: "lg-5", at: stamp(-9), text: "Retention review started for Kessel & Co. Snacks." },
  { id: "lg-6", at: stamp(-14), text: "Expansion action raised for Bramble & Rye." },
  { id: "lg-7", at: stamp(-26), text: "Sales opportunity closed won — Tidewater Cider." },
  { id: "lg-8", at: stamp(-26, -40), text: "Completed “Offer”." , module: "offer" },
  { id: "lg-9", at: stamp(-41), text: "Completed “Positioning”.", module: "positioning" },
];

/* -------------------------------- document --------------------------------- */

export function demoSeed(): AppData {
  return {
    version: 1,
    updatedAt: stamp(0, -35),
    lastModule: "ideal-client",
    modules: {
      foundation,
      positioning,
      offer,
      "ideal-client": idealClient,
    },
    status: {
      foundation: "complete",
      positioning: "complete",
      offer: "complete",
      "ideal-client": "draft",
    },
    log,
    stage2,
    stage3,
  };
}
