/**
 * Product catalog — typed data layer.
 *
 * Single source of truth driving the shop grid, product pages, category
 * pages, search, the homepage featured sections, and the sitemap. In
 * Phase 2 the same interface is served from Supabase — every consumer
 * depends only on the types and helpers below.
 */

export type ProductCategory =
  | "client-acquisition"
  | "sales-pipeline"
  | "client-onboarding";

export type ProductFormat = "notion" | "sheets" | "pdf";

export type ProductModule = {
  name: string;
  purpose: string;
  detail: string;
};

export type ProductSpec = {
  label: string;
  value: string;
};

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  formats: ProductFormat[];
  price: number;
  shortDescription: string;
  /** Benefit-oriented description used on cards. */
  cardDescription: string;
  /** Who it is for. */
  audience: string;
  /** The outcome the buyer gets. */
  outcome: string;
  description: string;
  modules: ProductModule[];
  specs: ProductSpec[];
  featured: boolean;
};

export type CategoryMeta = {
  slug: ProductCategory;
  name: string;
  description: string;
};

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const categories: CategoryMeta[] = [
  {
    slug: "client-acquisition",
    name: "Client Acquisition",
    description:
      "Systems for finding, qualifying, and winning new clients — from first contact to signed agreement.",
  },
  {
    slug: "sales-pipeline",
    name: "Sales Pipeline",
    description:
      "Systems for tracking, advancing, and reviewing every active deal so nothing stalls unseen.",
  },
  {
    slug: "client-onboarding",
    name: "Client Onboarding",
    description:
      "Systems for turning a signed agreement into a running engagement without dropped threads.",
  },
];

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export const products: Product[] = [
  {
    slug: "client-acquisition-system",
    name: "The Client Acquisition System",
    category: "client-acquisition",
    formats: ["notion", "sheets", "pdf"],
    price: 59,
    shortDescription:
      "The complete workflow for finding, qualifying, and winning clients.",
    cardDescription:
      "Find, qualify, and win clients with one connected workflow — from first contact to signed agreement.",
    audience:
      "Consultants, freelancers, and small studios who get leads but close them inconsistently.",
    outcome:
      "A repeatable weekly rhythm for outreach, lead tracking, and closing — without improvising.",
    description:
      "The Client Acquisition System is a complete, connected workspace for the work that precedes every invoice: finding clients, qualifying them, and winning the engagement. Instead of leads scattered across your inbox, a spreadsheet, and a sticky note, you get one pipeline with defined stages, follow-up rules, and a weekly operating rhythm. It ships as a Notion workspace with a linked Google Sheets tracker and a printable PDF playbook — download, duplicate, and start running it today.",
    modules: [
      {
        name: "Lead Management",
        purpose: "Every lead in one place",
        detail:
          "A single capture board with source, fit score, and next action — inbox, spreadsheet, and DMs all feed one list.",
      },
      {
        name: "Outreach",
        purpose: "Outreach you can sustain",
        detail:
          "Message sequences with structure: reference points, a clear ask, and room for personalization — not a wall of cold templates.",
      },
      {
        name: "Follow-Up",
        purpose: "Nothing slips",
        detail:
          "Rules-based follow-up with day counters and escalating touch types, so a forgotten reply stops ending deals.",
      },
      {
        name: "Sales Pipeline",
        purpose: "See every active deal",
        detail:
          "A board view of every engagement from inquiry to signature, with value, stage, and next step at a glance.",
      },
      {
        name: "Client Onboarding",
        purpose: "Handoff without dropped threads",
        detail:
          "A start-up checklist that carries the client from yes to kickoff — contract, invoice, access, schedule — in one place.",
      },
      {
        name: "Analytics",
        purpose: "Know what's working",
        detail:
          "A monthly review sheet measuring outreach sent, reply rate, calls held, and close rate — numbers you can act on.",
      },
    ],
    specs: [
      { label: "Format", value: "Notion + Google Sheets + PDF" },
      { label: "Delivery", value: "Instant download" },
      { label: "Licence", value: "One business, unlimited use" },
      { label: "Requires", value: "Free Notion + Google accounts" },
      { label: "Version", value: "2.1 — updated quarterly" },
    ],
    featured: true,
  },
  {
    slug: "follow-up-engine",
    name: "The Follow-Up Engine",
    category: "client-acquisition",
    formats: ["sheets", "pdf"],
    price: 29,
    shortDescription: "A rules-based follow-up tracker for open deals.",
    cardDescription:
      "A rules-based follow-up tracker that keeps every conversation moving — without a CRM subscription.",
    audience:
      "Anyone whose deals stall between \u201csounds interesting\u201d and signature.",
    outcome:
      "A follow-up cadence that runs itself: every open conversation has a next touch and a date.",
    description:
      "The Follow-Up Engine is a focused tracker for the stage where most deals quietly die: after the first yes. Every conversation becomes a row with a stage, a next touch, and a due date — plus a rules sheet that tells you exactly which touch comes next. It runs entirely in Google Sheets. No CRM subscription, no onboarding calls, no forty-field records.",
    modules: [
      {
        name: "Conversation Tracker",
        purpose: "One row per open thread",
        detail:
          "Contact, stage, last touch, next touch, and due date — five columns that replace a spreadsheet full of tabs.",
      },
      {
        name: "Cadence Rules",
        purpose: "No guessing the next step",
        detail:
          "A rules sheet mapping stage to touch type — nudge, value-add, recap, or close — with day counts per step.",
      },
      {
        name: "Follow-Up Library",
        purpose: "Write less, send more",
        detail:
          "Twelve follow-up message skeletons covering stalled replies, pricing follow-ups, and post-call recaps.",
      },
      {
        name: "Weekly Sweep",
        purpose: "A fifteen-minute ritual",
        detail:
          "A filtered view of everything due this week — run it Monday morning and you are current.",
      },
    ],
    specs: [
      { label: "Format", value: "Google Sheets + PDF guide" },
      { label: "Delivery", value: "Instant download" },
      { label: "Licence", value: "One business, unlimited use" },
      { label: "Requires", value: "Free Google account" },
      { label: "Version", value: "1.4 — updated quarterly" },
    ],
    featured: false,
  },
  {
    slug: "onboarding-kit",
    name: "The Client Onboarding Kit",
    category: "client-onboarding",
    formats: ["notion", "pdf"],
    price: 39,
    shortDescription: "A structured start for every new engagement.",
    cardDescription:
      "Turn every signed client into a running engagement with a checklist that catches every handoff detail.",
    audience:
      "Service businesses where week one with a new client is improvised every time.",
    outcome:
      "A repeatable start sequence — contract through kickoff — that looks deliberate and misses nothing.",
    description:
      "The Client Onboarding Kit is the sequence between signed and started. A Notion checklist with a welcome email set, a kickoff agenda, and a first-thirty-days plan. Use it for every new client and week one stops being a scramble — it becomes the part of your service clients remember.",
    modules: [
      {
        name: "Start Checklist",
        purpose: "Contract to kickoff, itemized",
        detail:
          "Every step from countersignature to kickoff call: invoices, access, tooling, agenda — with an owner per item.",
      },
      {
        name: "Welcome Sequence",
        purpose: "A calm first impression",
        detail:
          "Three email drafts — welcome, what to expect, and kickoff confirmation — written to be edited, not pasted.",
      },
      {
        name: "Kickoff Agenda",
        purpose: "A call that sets terms",
        detail:
          "A forty-five minute kickoff structure covering scope, cadence, channels, and success criteria.",
      },
      {
        name: "First 30 Days",
        purpose: "Momentum you can see",
        detail:
          "A milestone plan for the first month of the engagement, with a weekly check-in format.",
      },
    ],
    specs: [
      { label: "Format", value: "Notion + PDF templates" },
      { label: "Delivery", value: "Instant download" },
      { label: "Licence", value: "One business, unlimited use" },
      { label: "Requires", value: "Free Notion account" },
      { label: "Version", value: "1.2 — updated quarterly" },
    ],
    featured: false,
  },
  {
    slug: "pipeline-board",
    name: "The Pipeline Board",
    category: "sales-pipeline",
    formats: ["notion"],
    price: 19,
    shortDescription: "A visual pipeline for every active deal.",
    cardDescription:
      "A visual board for every active deal — stage, value, and next step visible at a glance.",
    audience:
      "Anyone who has ever lost a deal because its status lived in their head.",
    outcome:
      "Every active deal visible on one board, with a next step assigned before a card can move.",
    description:
      "The Pipeline Board is a Notion kanban for active engagements — from inquiry to signature. Each card carries value, stage, next step, and next touch. It is deliberately minimal: one board, four stages, no configuration required.",
    modules: [
      {
        name: "Deal Board",
        purpose: "Four stages, no setup",
        detail:
          "Inquiry, Conversation, Proposal, Signed — with value and next touch on every card.",
      },
      {
        name: "Weekly Review",
        purpose: "Stalled deals surface fast",
        detail:
          "A review view highlighting cards that have not moved in fourteen days, with a one-line diagnosis field.",
      },
    ],
    specs: [
      { label: "Format", value: "Notion workspace" },
      { label: "Delivery", value: "Instant download" },
      { label: "Licence", value: "One business, unlimited use" },
      { label: "Requires", value: "Free Notion account" },
      { label: "Version", value: "1.1 — updated quarterly" },
    ],
    featured: false,
  },
];


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

/** All products, catalog order (flagship first). */
export function getProducts(): Product[] {
  return products;
}

export function getCategory(slug: string): CategoryMeta | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getProductsByCategory(slug: ProductCategory): Product[] {
  return products.filter((p) => p.category === slug);
}

export function getFeaturedProduct(): Product {
  const featured = products.find((p) => p.featured);
  if (!featured) throw new Error("No featured product configured.");
  return featured;
}

export function getShopProducts(): Product[] {
  return [...products].sort((a, b) => b.price - a.price);
}

/** Lightweight search across name, description, and audience. */
export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter((p) =>
    [
      p.name,
      p.shortDescription,
      p.cardDescription,
      p.audience,
      p.outcome,
      getCategory(p.category)?.name ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

const formatNames: Record<ProductFormat, string> = {
  notion: "Notion",
  sheets: "Google Sheets",
  pdf: "PDF",
};

export function formatLabel(formats: ProductFormat[]): string {
  return formats.map((f) => formatNames[f]).join(" + ");
}
