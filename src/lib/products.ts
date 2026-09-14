/**
 * Veyra product catalog — typed data layer.
 *
 * Single source of truth driving the shop grid, product pages, search,
 * the homepage, the sitemap, and product identity across the app.
 *
 * Prices: `price` is the catalog's regular retail price, used for display
 * and as the struck-through anchor while a founding-customer launch price
 * is in effect. The amounts actually charged — founding price, per-seat
 * team tiers, checkout totals — resolve through src/lib/pricing.ts, the
 * single commercial authority. Never charge from this file.
 *
 * Only products with status "available" may be purchased. Coming-soon
 * products carry no price and no checkout path by construction.
 */

import { REGULAR_PRICE } from "@/lib/pricing";
import { REFUND_WINDOW_LABEL } from "@/lib/site";

export type Phase = "build" | "acquire" | "sell" | "deliver" | "retain" | "grow";

export type ProductStatus = "available" | "coming-soon";

export type ProductModule = {
  phase: Phase;
  name: string;
  /** One-line job description. */
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
  status: ProductStatus;
  /** Whole US dollars — the catalog's regular retail price, shown as the
   *  struck-through anchor while a founding-customer launch price is in
   *  effect. `null` for coming-soon products. The chargeable amount
   *  (founding price, seat tiers, checkout totals) resolves through
   *  src/lib/pricing.ts — never from this field. */
  price: number | null;
  /** Current published version of the deliverable. The account library
   *  and re-delivery flow reference this as the authoritative version —
   *  update it here when a new revision ships. */
  version: string | null;
  tagline: string;
  /** Meta description / short line. */
  shortDescription: string;
  /** Benefit-oriented description used on cards. */
  cardDescription: string;
  /** Who it is for. */
  audience: string;
  /** The outcome the buyer gets. */
  outcome: string;
  /** The problem it solves. */
  problem: string;
  /** "What it is" — the full description. */
  description: string;
  /** How the system works — the journey, in order. */
  workflow: { phase: Phase; headline: string; detail: string }[];
  modules: ProductModule[];
  specs: ProductSpec[];
  featured: boolean;
};

/* ------------------------------------------------------------------ */
/* Phases                                                              */
/* ------------------------------------------------------------------ */

export const PHASE_ORDER: Phase[] = [
  "build",
  "acquire",
  "sell",
  "deliver",
  "retain",
  "grow",
];

export const phaseMeta: Record<Phase, { label: string; blurb: string }> = {
  build: {
    label: "Build",
    blurb: "Foundation, positioning, offer, and the client you serve.",
  },
  acquire: {
    label: "Acquire",
    blurb: "A strategy and cadence for finding and starting conversations.",
  },
  sell: {
    label: "Sell",
    blurb: "Sales conversations and proposals that move to a decision.",
  },
  deliver: {
    label: "Deliver",
    blurb: "Onboarding that turns a yes into a running engagement.",
  },
  retain: {
    label: "Retain",
    blurb: "Keeping good clients — deliberately, not by accident.",
  },
  grow: {
    label: "Grow",
    blurb: "A standing review of what works and what to scale.",
  },
};

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

export const products: Product[] = [
  {
    slug: "client-growth-system",
    name: "Client Growth System",
    status: "available",
    // Regular retail price — the struck-through anchor during the launch.
    // What customers actually pay during launch is the founding price in
    // src/lib/pricing.ts ($79, with per-seat team tiers), which checkout,
    // cart, and receipts all resolve through.
    price: REGULAR_PRICE,
    version: "1.0",
    tagline: "The complete operating system for the client-growth journey.",
    shortDescription:
      "A structured system for the whole client-growth journey — build your foundation, acquire clients, sell, deliver, retain, and grow. One-time purchase, instant digital delivery.",
    cardDescription:
      "One connected system for the entire client-growth journey — from business foundation to acquisition, sales, delivery, retention, and growth review.",
    audience:
      "For freelancers, consultants, service businesses, independent professionals, and small agencies who run client work and want the growth side of the business to run on structure instead of memory.",
    outcome:
      "A business where every stage of client growth — from positioning to retention — has a defined process, a place to work, and a next step you can see.",
    problem:
      "Most service businesses already know what good execution looks like. The problem is that the process lives everywhere except one place: notes, documents, spreadsheets, memory, and disconnected tools. When the process is scattered, execution becomes inconsistent — outreach stops after a good week, follow-up depends on mood, onboarding is reinvented per client. The Client Growth System exists to end that: one structured system for the entire journey, so the work runs the same way every week.",
    description:
      "The Client Growth System is Veyra's flagship product: a structured system that manages the journey from building a service business to acquiring clients, selling, delivering, retaining, and growing. It is not a course to watch or a template to fill in once — it is a working system organized around six connected phases. Each phase contains the modules for that stage of growth, and each module is built to be used: define your positioning, run your outreach, track your pipeline, structure your proposals, onboard every client the same deliberate way, and review what is working on a fixed cadence. Buy it once and run your growth on it.",
    workflow: [
      {
        phase: "build",
        headline: "Build the foundation",
        detail:
          "Define your business foundation, positioning, offer, and ideal client — the decisions everything else depends on.",
      },
      {
        phase: "acquire",
        headline: "Acquire clients",
        detail:
          "Run acquisition as a strategy: structured outreach and follow-up instead of bursts of motivation.",
      },
      {
        phase: "sell",
        headline: "Sell with structure",
        detail:
          "Run sales conversations and write proposals from a defined process, so deals advance on their merits.",
      },
      {
        phase: "deliver",
        headline: "Deliver deliberately",
        detail:
          "Onboard every client through the same start sequence — no dropped threads between signed and started.",
      },
      {
        phase: "retain",
        headline: "Retain the right clients",
        detail:
          "Work retention as a process: check-ins, value reviews, and early signals before a client drifts.",
      },
      {
        phase: "grow",
        headline: "Grow on review",
        detail:
          "A standing growth review that turns what worked into what you repeat — and what to scale next.",
      },
    ],
    modules: [
      {
        phase: "build",
        name: "Business Foundation",
        purpose: "Get the fundamentals out of your head",
        detail:
          "Capture how your business actually runs — services, capacity, constraints, and goals — in one structured place that the rest of the system builds on.",
      },
      {
        phase: "build",
        name: "Positioning",
        purpose: "Say clearly what you're the best at",
        detail:
          "Work through positioning as a set of decisions, not a paragraph of inspiration: who you serve, what you're worth, and why you over alternatives.",
      },
      {
        phase: "build",
        name: "Offer",
        purpose: "Package the work so it's easy to buy",
        detail:
          "Shape your services into a defined offer with scope, outcomes, and boundaries — so selling becomes presenting, not improvising.",
      },
      {
        phase: "build",
        name: "Ideal Client",
        purpose: "Know exactly who you're for",
        detail:
          "Define the clients you want more of — criteria you can actually apply when a lead arrives, not a persona poster.",
      },
      {
        phase: "acquire",
        name: "Acquisition Strategy",
        purpose: "One plan instead of scattered attempts",
        detail:
          "Choose your acquisition channels and set a weekly rhythm — what you do, how often, and what counts as working.",
      },
      {
        phase: "acquire",
        name: "Outreach",
        purpose: "Conversations you can sustain",
        detail:
          "Structured outreach with reference points, a clear ask, and room for personalization — built to run every week, not just in desperate ones.",
      },
      {
        phase: "acquire",
        name: "Follow-up",
        purpose: "Nothing slips after the first reply",
        detail:
          "Rules-based follow-up so every open conversation has a next touch and a date — the stage where most deals quietly die.",
      },
      {
        phase: "sell",
        name: "Sales",
        purpose: "Run the conversation, not the vibe",
        detail:
          "A defined structure for sales conversations — discovery, qualification, and next steps — so deals advance on evidence.",
      },
      {
        phase: "sell",
        name: "Proposals",
        purpose: "Proposals that read like decisions",
        detail:
          "Write proposals from structure — scope, outcomes, terms — consistently and quickly, without starting from a blank page.",
      },
      {
        phase: "deliver",
        name: "Client Onboarding",
        purpose: "From yes to running engagement",
        detail:
          "A start-up sequence that carries every client from signature to kickoff — contract, access, schedule — the same deliberate way each time.",
      },
      {
        phase: "retain",
        name: "Retention",
        purpose: "Keep the clients worth keeping",
        detail:
          "A retention practice with standing check-ins and value reviews, so the relationship is managed instead of assumed.",
      },
      {
        phase: "grow",
        name: "Growth Review",
        purpose: "A cadence for improving the system",
        detail:
          "A recurring review of the whole journey — what produced clients, what stalled, what to change — so the system compounds.",
      },
    ],
    specs: [
      { label: "Delivery", value: "Instant digital delivery" },
      { label: "Licence", value: "Per-seat — 1 to 5 licensed users" },
      { label: "Updates", value: "Included — every future revision" },
      { label: "Pricing", value: "One-time payment" },
      { label: "Guarantee", value: REFUND_WINDOW_LABEL },
    ],
    featured: true,
  },

  /* ---------------- Coming soon — not purchasable ---------------- */

  {
    slug: "client-acquisition-os",
    name: "Client Acquisition OS",
    status: "coming-soon",
    price: null,
    version: null,
    tagline: "The acquisition engine, as a dedicated system.",
    shortDescription:
      "A dedicated operating system for client acquisition — pipelines, outreach cadences, and demand tracking. Coming soon.",
    cardDescription:
      "A dedicated operating system for the acquisition engine — pipelines, outreach cadences, and demand tracking, built to run week after week.",
    audience: "For businesses whose growth bottleneck is starting conversations.",
    outcome: "Acquisition that runs on a weekly operating rhythm.",
    problem:
      "Acquisition work is the first thing to slip when delivery gets busy. Client Acquisition OS gives it a dedicated system.",
    description:
      "Client Acquisition OS is a dedicated operating system for the acquisition engine: pipeline, outreach cadences, follow-up, and demand tracking in one place. It extends the acquisition phase of the Client Growth System into a full standalone product. Currently in development — not yet available.",
    workflow: [],
    modules: [],
    specs: [],
    featured: false,
  },
  {
    slug: "offer-os",
    name: "Offer OS",
    status: "coming-soon",
    price: null,
    version: null,
    tagline: "Design and stress-test what you sell.",
    shortDescription:
      "A system for designing offers — structure, pricing logic, and packaging decisions in one place. Coming soon.",
    cardDescription:
      "A system for designing and stress-testing what you sell — offer structure, pricing logic, and packaging decisions in one place.",
    audience: "For businesses whose offer has grown by accretion, not design.",
    outcome: "An offer that is easy to present, price, and buy.",
    problem:
      "Offers tend to accrete — every new client adds a exception until the menu is unreadable. Offer OS makes offer design a deliberate process.",
    description:
      "Offer OS is a system for designing what you sell: offer structure, pricing logic, and packaging decisions, stress-tested before you take them to market. Currently in development — not yet available.",
    workflow: [],
    modules: [],
    specs: [],
    featured: false,
  },
  {
    slug: "sales-os",
    name: "Sales OS",
    status: "coming-soon",
    price: null,
    version: null,
    tagline: "The selling system, end to end.",
    shortDescription:
      "A system for selling — from first call to signature, with a repeatable pipeline and proposal flow. Coming soon.",
    cardDescription:
      "The selling system — from first call to signature, with a repeatable pipeline and proposal flow that advances on evidence.",
    audience: "For businesses where closing depends on who is selling.",
    outcome: "A sales process that produces the same quality of decision every time.",
    problem:
      "When sales lives in individual heads, quality varies by mood and memory. Sales OS turns selling into a defined process.",
    description:
      "Sales OS is a dedicated system for the selling stage: pipeline, conversation structure, proposals, and decision tracking. It extends the sales phase of the Client Growth System into a full standalone product. Currently in development — not yet available.",
    workflow: [],
    modules: [],
    specs: [],
    featured: false,
  },
  {
    slug: "client-operations-os",
    name: "Client Operations OS",
    status: "coming-soon",
    price: null,
    version: null,
    tagline: "The delivery side, on one rail.",
    shortDescription:
      "A system for client operations — onboarding, engagement tracking, and client communication on one rail. Coming soon.",
    cardDescription:
      "The delivery side of the business as a system — onboarding, engagement tracking, and client communication on one rail.",
    audience: "For businesses where delivery quality depends on heroics.",
    outcome: "Client work that runs the same deliberate way every engagement.",
    problem:
      "Delivery is where reputations are made, yet it is usually the least systematized part of a service business. Client Operations OS fixes that.",
    description:
      "Client Operations OS is a dedicated system for the deliver and retain stages: onboarding sequences, engagement tracking, and client communication cadences. Currently in development — not yet available.",
    workflow: [],
    modules: [],
    specs: [],
    featured: false,
  },
  {
    slug: "agency-growth-os",
    name: "Agency Growth OS",
    status: "coming-soon",
    price: null,
    version: null,
    tagline: "Run agency growth as an operations problem.",
    shortDescription:
      "A system for agency owners — capacity, pipeline, and review cadences in one operating system. Coming soon.",
    cardDescription:
      "For agency owners running growth as an operations problem — capacity, pipeline, and review cadences in one system.",
    audience: "For agency owners past the solo stage.",
    outcome: "Growth decisions made on a cadence, not in a crisis.",
    problem:
      "Agencies grow on momentum until it runs out. Agency Growth OS puts capacity, pipeline, and review into one operating rhythm.",
    description:
      "Agency Growth OS is a system for agency owners: capacity planning, pipeline visibility, and standing review cadences — the growth side of the agency run deliberately. Currently in development — not yet available.",
    workflow: [],
    modules: [],
    specs: [],
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

/** Products that can actually be bought. */
export function getAvailableProducts(): Product[] {
  return products.filter((p) => p.status === "available" && p.price !== null);
}

/** Products announced but not yet purchasable. */
export function getComingSoonProducts(): Product[] {
  return products.filter((p) => p.status === "coming-soon");
}

/**
 * Server-side price resolution — the only sanctioned way to turn a cart
 * line into an amount. Returns null for anything that isn't currently
 * purchasable, so the checkout API can reject it.
 */
export function resolvePurchasableProduct(
  slug: string
): (Product & { price: number }) | undefined {
  const product = getProduct(slug);
  if (!product || product.status !== "available" || product.price === null) {
    return undefined;
  }
  return product as Product & { price: number };
}

export function getFeaturedProduct(): Product & { price: number } {
  const featured = products.find((p) => p.featured);
  if (!featured || featured.price === null) {
    throw new Error("No purchasable featured product configured.");
  }
  return featured as Product & { price: number };
}

/** Lightweight search across name, description, and audience. */
export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter((p) =>
    [p.name, p.tagline, p.shortDescription, p.cardDescription, p.audience, p.outcome]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );
}

export function formatPhase(phase: Phase): string {
  return phaseMeta[phase].label;
}
