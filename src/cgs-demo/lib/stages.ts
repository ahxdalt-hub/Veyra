/**
 * Veyra Client Growth System — growth pipeline definition.
 *
 * BUILD → ACQUIRE → SELL → DELIVER → RETAIN → GROW
 *
 * This file is the single source of truth for modules, blocks, and fields.
 * The data layer, editor UI, validation, and dashboard all derive from it,
 * so adding or editing a field never requires touching components.
 */

export type StageId =
  | "build"
  | "acquire"
  | "sell"
  | "deliver"
  | "retain"
  | "grow";

export type ModuleId = "foundation" | "positioning" | "offer" | "ideal-client";

export type FieldType = "text" | "textarea" | "choice" | "tags";

export interface FieldMeta {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: string[]; // choice
  min?: number; // tags: minimum entries to be complete
}

export interface ListMeta {
  /** A plain list item is one line of text; a titled list groups title + detail. */
  itemKind: "text" | "entry";
  itemLabel: string;
  itemPlaceholder?: string;
  detailLabel?: string;
  detailPlaceholder?: string;
  addLabel: string;
  required?: boolean;
  min?: number;
  /** Internal: attached from the owning block id when the stage map is built. */
  __blockId?: string;
}

export interface BlockMeta {
  id: string;
  title: string;
  description?: string;
  /** Contextual guidance shown as a quiet note inside the block. */
  note?: string;
  fields?: FieldMeta[];
  list?: ListMeta;
}

export interface ModuleMeta {
  id: ModuleId;
  step: number;
  title: string;
  tagline: string;
  href: string;
  /** What downstream decisions this module feeds. */
  unlocks: string[];
  intro: string;
  blocks: BlockMeta[];
}

export interface StageNavItem {
  id: string;
  label: string;
  href: string;
}

export interface StageMeta {
  id: StageId;
  label: string;
  number: string;
  summary: string;
  available: boolean;
  modules: ModuleMeta[];
  /** Workspace pages for operational stages (ACQUIRE, SELL). */
  nav?: StageNavItem[];
}

/* ---------------------------------- data ---------------------------------- */

export type TextFieldValue = string;
export type TagsFieldValue = string[];

export interface EntryItem {
  id: string;
  title: string;
  detail: string;
}
export interface TextItem {
  id: string;
  text: string;
}

/** Per-module data: scalar fields keyed by field key, lists keyed by block id. */
export interface ModuleData {
  fields: Record<string, string | string[]>;
  lists: Record<string, (TextItem | EntryItem)[]>;
}

export type ModuleStatus = "not-started" | "in-progress" | "complete" | "needs-review";

export interface LogEntry {
  id: string;
  at: string;
  module?: ModuleId;
  text: string;
}

export interface AppData {
  version: 1;
  updatedAt: string | null;
  lastModule: ModuleId | null;
  modules: Record<ModuleId, ModuleData>;
  status: Record<ModuleId, "draft" | "complete">;
  log: LogEntry[];
  /** ACQUIRE + SELL records. Optional in storage; normalized on load. */
  stage2?: import("@/cgs-demo/lib/workflow").Stage2Data;
  /** DELIVER + RETAIN + GROW records. Optional in storage; normalized on load. */
  stage3?: import("@/cgs-demo/lib/delivery").Stage3Data;
}

/* --------------------------------- helpers -------------------------------- */

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const emptyModuleData = (): ModuleData => ({ fields: {}, lists: {} });

export function emptyData(): AppData {
  return {
    version: 1,
    updatedAt: null,
    lastModule: null,
    modules: {
      foundation: emptyModuleData(),
      positioning: emptyModuleData(),
      offer: emptyModuleData(),
      "ideal-client": emptyModuleData(),
    },
    status: {
      foundation: "draft",
      positioning: "draft",
      offer: "draft",
      "ideal-client": "draft",
    },
    log: [],
    stage2: {
      strategy: {
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
      },
      outreach: [],
      followUps: [],
      opportunities: [],
      proposals: [],
    },
    stage3: {
      templates: [],
      onboardings: [],
      clients: [],
      actions: [],
      reviews: [],
      growthReviews: [],
    },
  };
}

/** True when a required field/list holds real content (not just stray characters). */
export function isFieldFilled(field: FieldMeta, data: ModuleData): boolean {
  const v = data.fields[field.key];
  if (field.type === "tags") {
    const arr = Array.isArray(v) ? v : [];
    return arr.length >= (field.min ?? 1);
  }
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return false;
  // Textareas need a real sentence; short texts just need a word.
  return field.type === "textarea" ? s.length >= 12 : true;
}

/** Count of required items (fields + lists) a module defines. */
export function requiredCount(meta: ModuleMeta): number {
  let n = 0;
  for (const b of meta.blocks) {
    for (const f of b.fields ?? []) if (f.required) n += 1;
    if (b.list?.required) n += 1;
  }
  return n;
}

/** How many required items currently have content. */
export function requiredFilledCount(meta: ModuleMeta, data: ModuleData): number {
  let n = 0;
  for (const b of meta.blocks) {
    for (const f of b.fields ?? []) if (f.required && isFieldFilled(f, data)) n += 1;
    if (b.list?.required && listFilled(b.list, data)) n += 1;
  }
  return n;
}

export function listFilled(list: ListMeta, data: ModuleData): boolean {
  const items = (list.__blockId ? data.lists[list.__blockId] : undefined) ?? [];
  const min = list.min ?? 1;
  if (items.length < min) return false;
  if (list.itemKind === "text") {
    return (items as TextItem[]).every((i) => i.text.trim().length > 0);
  }
  return (items as EntryItem[]).every((i) => i.title.trim().length > 0);
}

/** Required items that are still missing, for validation surfacing. */
export function missingRequirements(meta: ModuleMeta, data: ModuleData): string[] {
  const missing: string[] = [];
  for (const b of meta.blocks) {
    for (const f of b.fields ?? []) {
      if (f.required && !isFieldFilled(f, data)) missing.push(f.label);
    }
    if (b.list?.required && !listFilled(b.list, data)) missing.push(b.list.itemLabel);
  }
  return missing;
}

export function moduleStatus(meta: ModuleMeta, data: AppData, id: ModuleId): ModuleStatus {
  const m = data.modules[id];
  const hasContent =
    requiredFilledCount(meta, m) > 0 || Object.values(m.fields).length > 0;
  if (data.status[id] === "complete") {
    const valid = missingRequirements(meta, m).length === 0;
    return valid ? "complete" : "needs-review";
  }
  if (!hasContent) return "not-started";
  return "in-progress";
}

/* --------------------------------- stages --------------------------------- */

// `list.__blockId` is attached when the stage map is built below, so listFilled
// can look items up by block id without duplicating the id in ListMeta.
type ListMetaWithBlock = ListMeta & { __blockId: string };

function attachBlockIds(meta: ModuleMeta): ModuleMeta {
  for (const b of meta.blocks) {
    if (b.list) (b.list as ListMetaWithBlock).__blockId = b.id;
  }
  return meta;
}

const buildModules: ModuleMeta[] = [
  {
    id: "foundation",
    step: 1,
    title: "Business Foundation",
    tagline: "The facts about your business that every other decision rests on.",
    href: "/build/foundation",
    intro:
      "This is the shared context for the whole system — acquisition, sales and delivery all read from it, so it is written once and used everywhere.",
    unlocks: [
      "Positioning is judged against your real strengths and constraints",
      "Offer scope stays honest to your business model",
      "Outreach never promises what you cannot deliver",
    ],
    blocks: [
      {
        id: "identity",
        title: "Identity",
        description: "What the business is, in plain terms.",
        fields: [
          { key: "name", label: "Business name", type: "text", required: true, placeholder: "e.g. Northlight Consulting" },
          {
            key: "type",
            label: "Business type",
            type: "choice",
            required: true,
            options: ["Freelance / solo", "Consulting practice", "Studio", "Small agency", "Other"],
          },
          {
            key: "model",
            label: "Business model",
            type: "choice",
            required: true,
            options: ["Project-based", "Retainer", "Hourly", "Productized service", "Hybrid"],
            hint: "How you are paid today. You can change this later.",
          },
          {
            key: "stage",
            label: "Current business stage",
            type: "choice",
            required: true,
            options: ["Just starting", "First clients", "Steady but inconsistent", "Established, plateaued", "Scaling"],
          },
          {
            key: "objective",
            label: "Main objective for the next 6–12 months",
            type: "textarea",
            required: true,
            placeholder: "e.g. Book three projects per quarter with clearly defined scope, and stop hourly work that bleeds time.",
          },
        ],
      },
      {
        id: "services",
        title: "Services",
        description: "What you actually sell today — not a wishlist.",
        note: "List only what you would deliver this month. New services enter through the Offer module.",
        list: {
          itemKind: "text",
          itemLabel: "service",
          itemPlaceholder: "e.g. Website audits for ecommerce brands",
          addLabel: "Add service",
          required: true,
          min: 1,
        } as ListMeta,
      },
      {
        id: "assets",
        title: "Strengths",
        description: "What you genuinely do better than most.",
        note: "Be specific. “Fast turnaround on small scopes” guides later; “good quality” does not.",
        list: {
          itemKind: "text",
          itemLabel: "strength",
          itemPlaceholder: "e.g. 10 years inside the retail industry",
          addLabel: "Add strength",
          required: true,
          min: 1,
        } as ListMeta,
      },
      {
        id: "constraints",
        title: "Constraints",
        description: "Honest limits — capacity, cash, skills, tools.",
        note: "Naming limits now keeps acquisition and offers realistic later.",
        list: {
          itemKind: "text",
          itemLabel: "constraint",
          itemPlaceholder: "e.g. ~20 client-hours per week, no design capability in-house",
          addLabel: "Add constraint",
          required: true,
          min: 1,
        } as ListMeta,
      },
    ],
  },
  {
    id: "positioning",
    step: 2,
    title: "Positioning",
    tagline: "Why a specific customer should choose you over every other option.",
    href: "/build/positioning",
    intro:
      "Positioning is a claim you can keep. It writes the message every later stage — outreach pages, pitches, proposals — will reuse.",
    unlocks: [
      "Becomes the core message of acquisition outreach",
      "Sets the standard proposals must live up to",
      "Sharpens which ideal clients are worth pursuing",
    ],
    blocks: [
      {
        id: "audience",
        title: "Who and why",
        description: "The customer you serve and the pain you exist for.",
        fields: [
          {
            key: "target",
            label: "Target customer",
            type: "textarea",
            required: true,
            placeholder: "One sentence describing the specific person or company you serve.",
          },
          {
            key: "problem",
            label: "Their core problem",
            type: "textarea",
            required: true,
            placeholder: "The expensive, recurring problem you are hired to remove.",
          },
          {
            key: "outcome",
            label: "Desired outcome",
            type: "textarea",
            required: true,
            placeholder: "The concrete change they can point to after working with you.",
          },
        ],
      },
      {
        id: "method",
        title: "Your approach",
        description: "How you get there — and how that differs.",
        fields: [
          {
            key: "method",
            label: "Your method",
            type: "textarea",
            required: true,
            placeholder: "The repeatable way you work: your process, lens, or system.",
          },
          {
            key: "differentiation",
            label: "Differentiation",
            type: "textarea",
            required: true,
            placeholder: "What you do that typical providers in your space do not — or refuse to.",
          },
        ],
      },
      {
        id: "claim",
        title: "The claim",
        description: "The sentence a customer walks away with.",
        note: "Read it back: could a competitor honestly write the same line? If yes, keep sharpening.",
        fields: [
          {
            key: "why",
            label: "Why customers should choose this business",
            type: "textarea",
            required: true,
            placeholder: "e.g. “The only retail analytics consultant who hands you the dashboard and the people plan to run it.”",
          },
        ],
      },
    ],
  },
  {
    id: "offer",
    step: 3,
    title: "Offer",
    tagline: "One clearly defined thing people can buy from you.",
    href: "/build/offer",
    intro:
      "The offer turns positioning into something concrete: a named engagement with a scope, a process, and a price. Sales conversations are built directly on top of it.",
    unlocks: [
      "Becomes the basis of sales conversations and proposals",
      "Defines the delivery checklist before the first project",
      "Sets the boundary that keeps scope creep out",
    ],
    blocks: [
      {
        id: "overview",
        title: "Overview",
        description: "The shape of the deal.",
        fields: [
          { key: "name", label: "Offer name", type: "text", required: true, placeholder: "e.g. 30-Day Growth Audit" },
          { key: "customer", label: "Who it is for", type: "text", required: true, placeholder: "Short line — e.g. funded ecommerce teams without an analytics owner" },
          { key: "price", label: "Price", type: "text", required: true, placeholder: "e.g. €4,500 fixed, or from €150/hr", hint: "A number with a basis. “TBD” is not an offer." },
          { key: "timeline", label: "Timeline", type: "text", required: true, placeholder: "e.g. 3 weeks from kickoff" },
        ],
      },
      {
        id: "promise",
        title: "The promise",
        description: "What the buyer is actually purchasing.",
        fields: [
          { key: "problem", label: "Problem solved", type: "textarea", required: true, placeholder: "The specific pain this engagement removes." },
          { key: "outcome", label: "Outcome", type: "textarea", required: true, placeholder: "What exists at the end that did not exist at the start." },
          { key: "edge", label: "Why this offer is different", type: "textarea", required: false, placeholder: "Optional — but the strongest offers can answer it." },
        ],
      },
      {
        id: "deliverables",
        title: "Deliverables",
        description: "Everything the client receives. Named items, not vibes.",
        list: {
          itemKind: "text",
          itemLabel: "deliverable",
          itemPlaceholder: "e.g. Prioritised roadmap, scored by impact and effort",
          addLabel: "Add deliverable",
          required: true,
          min: 2,
        } as ListMeta,
      },
      {
        id: "process",
        title: "Process",
        description: "The steps the client sees, in order.",
        note: "A visible process is itself a selling point — clients buy certainty, not effort.",
        list: {
          itemKind: "entry",
          itemLabel: "process step",
          addLabel: "Add step",
          required: true,
          min: 2,
          itemPlaceholder: "e.g. Week 1 — Discovery",
          detailLabel: "What happens",
          detailPlaceholder: "e.g. Stakeholder interviews, analytics access review",
        } as ListMeta,
      },
      {
        id: "risk",
        title: "Risk reversal",
        description: "What makes saying yes feel safe.",
        fields: [
          {
            key: "reversal",
            label: "Risk reversal",
            type: "textarea",
            required: true,
            placeholder: "e.g. If the first milestone misses the agreed criteria, the rest of the engagement is free.",
          },
        ],
      },
    ],
  },
  {
    id: "ideal-client",
    step: 4,
    title: "Ideal Client",
    tagline: "A written profile of the client you want more of — and the ones to turn down.",
    href: "/build/ideal-client",
    intro:
      "This is the profile the acquisition stage will search for, and the qualification checklist the sales stage will apply. It is the highest-leverage page in BUILD.",
    unlocks: [
      "Drives who to target once acquisition opens",
      "Writes the outreach angle from real buying triggers",
      "Becomes the qualification filter before sales calls",
    ],
    blocks: [
      {
        id: "profile",
        title: "Who they are",
        description: "Attributes you can look for in the real world.",
        fields: [
          { key: "type", label: "Customer type", type: "text", required: true, placeholder: "e.g. Ops lead at a 20–100 person B2B services firm" },
          { key: "industry", label: "Industry", type: "text", required: true, placeholder: "e.g. Professional services, light ecommerce" },
        ],
        list: {
          itemKind: "text",
          itemLabel: "company characteristic",
          itemPlaceholder: "e.g. Has a sales team but no CRM discipline",
          addLabel: "Add characteristic",
          required: true,
          min: 1,
        } as ListMeta,
      },
      {
        id: "situation",
        title: "Their situation",
        description: "What is happening in their world right now.",
        fields: [
          { key: "current", label: "Current situation", type: "textarea", required: true, placeholder: "The context they operate in before hiring you." },
          { key: "problems", label: "Problems they feel", type: "textarea", required: true, placeholder: "Pain as they describe it — in their words, not yours." },
          { key: "goals", label: "Goals", type: "textarea", required: true, placeholder: "What they are actually being measured on." },
        ],
      },
      {
        id: "buying",
        title: "Buying behaviour",
        description: "What makes them move — and what they consider first.",
        fields: [
          {
            key: "triggers",
            label: "Buying triggers",
            type: "tags",
            required: true,
            min: 1,
            placeholder: "e.g. new funding, failed hire, season change",
            hint: "Events that turn a prospect from browsing into buying.",
          },
          {
            key: "alternatives",
            label: "Alternatives they weigh",
            type: "tags",
            required: true,
            min: 1,
            placeholder: "e.g. doing nothing, hiring in-house, a bigger agency",
            hint: "Every deal is lost to something. Name them honestly.",
          },
        ],
      },
      {
        id: "fit",
        title: "Fit",
        description: "The line between a good client and a costly one.",
        note: "Poor-fit traits protect your calendar later; qualification criteria turn “is this a yes?” into a checklist.",
        list: {
          itemKind: "text",
          itemLabel: "poor-fit characteristic",
          itemPlaceholder: "e.g. Wants outcomes without access to data",
          addLabel: "Add poor-fit trait",
          required: true,
          min: 1,
        } as ListMeta,
      },
      {
        id: "qualification",
        title: "Qualification criteria",
        description: "Apply these before any sales conversation.",
        list: {
          itemKind: "text",
          itemLabel: "qualification criterion",
          itemPlaceholder: "e.g. Budget above €5k, decision maker in the first call",
          addLabel: "Add criterion",
          required: true,
          min: 1,
        } as ListMeta,
      },
    ],
  },
];

for (const m of buildModules) attachBlockIds(m);

export const STAGES: StageMeta[] = [
  {
    id: "build",
    label: "Build",
    number: "01",
    summary: "Foundation, positioning, offer and ideal client.",
    available: true,
    modules: buildModules,
  },
  {
    id: "acquire",
    label: "Acquire",
    number: "02",
    summary: "Channels, outreach, and messaging that reach your ideal client.",
    available: true,
    modules: [],
    nav: [
      { id: "strategy", label: "Acquisition Strategy", href: "/acquire/strategy" },
      { id: "outreach", label: "Outreach", href: "/acquire/outreach" },
      { id: "follow-ups", label: "Follow-ups", href: "/acquire/follow-ups" },
    ],
  },
  {
    id: "sell",
    label: "Sell",
    number: "03",
    summary: "Qualification, proposals, and conversations that close.",
    available: true,
    modules: [],
    nav: [
      { id: "opportunities", label: "Sales Opportunities", href: "/sell/opportunities" },
      { id: "proposals", label: "Proposals", href: "/sell/proposals" },
    ],
  },
  {
    id: "deliver",
    label: "Deliver",
    number: "04",
    summary: "Projects run to the promise you made.",
    available: true,
    modules: [],
    nav: [
      { id: "onboarding", label: "Client Onboarding", href: "/deliver/onboarding" },
    ],
  },
  {
    id: "retain",
    label: "Retain",
    number: "05",
    summary: "Relationships that stay and renew.",
    available: true,
    modules: [],
    nav: [
      { id: "clients", label: "Active Clients", href: "/retain/clients" },
      { id: "reviews", label: "Retention Reviews", href: "/retain/reviews" },
    ],
  },
  {
    id: "grow",
    label: "Grow",
    number: "06",
    summary: "Referrals, repeat revenue, and expansion.",
    available: true,
    modules: [],
    nav: [
      { id: "reviews", label: "Growth Reviews", href: "/grow/reviews" },
    ],
  },
];

export const MODULES: Record<ModuleId, ModuleMeta> = Object.fromEntries(
  buildModules.map((m) => [m.id, m]),
) as Record<ModuleId, ModuleMeta>;

export const MODULE_ORDER: ModuleId[] = buildModules.map((m) => m.id);

export function isModuleId(v: string | undefined | null): v is ModuleId {
  return !!v && v in MODULES;
}
