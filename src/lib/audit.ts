/**
 * The Growth Audit — data layer.
 *
 * 18 questions, 3 per phase, mapped one-to-one onto the six phases of the
 * Client Growth System (PHASE_ORDER / phaseMeta from products.ts — the
 * audit borrows the real product model, it does not invent a quiz frame).
 * Every option carries a 0–3 score: never → ad hoc → documented → running
 * as a system. Scoring runs client-side; nothing about the answers leaves
 * the browser.
 */

import { PHASE_ORDER, phaseMeta, type Phase } from "@/lib/products";

export type AuditOption = {
  label: string;
  /** 0 = absent, 1 = improvised, 2 = defined, 3 = running as a system. */
  score: 0 | 1 | 2 | 3;
};

export type AuditQuestion = {
  id: string;
  phase: Phase;
  prompt: string;
  options: AuditOption[];
};

export type AuditBandKey =
  | "leaky"
  | "patchy"
  | "structured"
  | "systematized";

export type AuditBand = {
  key: AuditBandKey;
  label: string;
  verdict: string;
};

export type PhaseScore = {
  phase: Phase;
  label: string;
  points: number;
  maxPoints: number;
  /** 0–100, rounded. */
  percent: number;
};

export type AuditResult = {
  /** 0–100, rounded. */
  overall: number;
  band: AuditBand;
  /** In PHASE_ORDER. */
  phases: PhaseScore[];
  /** Top 2 phases by percent, descending. */
  strengths: PhaseScore[];
  /** Bottom 2 phases by percent, weakest first. */
  gaps: PhaseScore[];
};

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

const o = (label: string, score: 0 | 1 | 2 | 3): AuditOption => ({
  label,
  score,
});

export const AUDIT_QUESTIONS: AuditQuestion[] = [
  /* ---- Build ---- */
  {
    id: "build-1",
    phase: "build",
    prompt: "When a prospect asks what you do, how specific is your answer?",
    options: [
      o("I describe my general skill set and let them draw conclusions", 0),
      o("I have a rough niche, but the wording changes every time", 1),
      o("I have a clear sentence — who I serve and what I do for them", 2),
      o("I use a tested positioning statement, consistently, everywhere", 3),
    ],
  },
  {
    id: "build-2",
    phase: "build",
    prompt: "How is your offer packaged?",
    options: [
      o("It’s improvised — scope changes with every client", 0),
      o("A few loose service descriptions, no real structure", 1),
      o("Defined packages with scope and pricing", 2),
      o("A documented offer: outcomes, boundaries, and pricing logic", 3),
    ],
  },
  {
    id: "build-3",
    phase: "build",
    prompt: "Could you say exactly which clients you want more of?",
    options: [
      o("Whoever pays — I take what comes", 0),
      o("I have a vague sense, nothing written", 1),
      o("Written criteria I check new leads against", 2),
      o("Criteria and disqualifiers, actively applied to every lead", 3),
    ],
  },
  /* ---- Acquire ---- */
  {
    id: "acquire-1",
    phase: "acquire",
    prompt: "Where do your new leads come from?",
    options: [
      o("Hope and the occasional referral", 0),
      o("Bursts of outreach when the pipeline looks empty", 1),
      o("One or two channels I work most weeks", 2),
      o("A documented channel plan with a weekly rhythm and targets", 3),
    ],
  },
  {
    id: "acquire-2",
    phase: "acquire",
    prompt: "What does your outreach actually look like?",
    options: [
      o("None — I wait to be found", 0),
      o("Copy-paste messages sent in bulk", 1),
      o("Structured messages with a clear ask and some personalization", 2),
      o("A maintained message library with reference points, run every week", 3),
    ],
  },
  {
    id: "acquire-3",
    phase: "acquire",
    prompt: "What happens after your first message gets no reply?",
    options: [
      o("Nothing. The thread dies.", 0),
      o("I follow up if I remember", 1),
      o("Every open conversation has a scheduled next touch", 2),
      o("A rules-based follow-up sequence — touch two, three, four — run to the end", 3),
    ],
  },
  /* ---- Sell ---- */
  {
    id: "sell-1",
    phase: "sell",
    prompt: "How do you run a sales conversation?",
    options: [
      o("I wing it and hope the vibe is right", 0),
      o("A loose mental outline, different every call", 1),
      o("A written structure: discovery, qualification, next step", 2),
      o("A question bank and objection responses, used on every call", 3),
    ],
  },
  {
    id: "sell-2",
    phase: "sell",
    prompt: "How do your proposals get written?",
    options: [
      o("From a blank page, every time", 0),
      o("By editing whatever the last proposal was", 1),
      o("A template with scope, outcomes, and terms sections", 2),
      o("A proposal system — consistent, fast, and shaped like a decision", 3),
    ],
  },
  {
    id: "sell-3",
    phase: "sell",
    prompt: "Could you list where every open deal stands right now?",
    options: [
      o("It’s all in my head", 0),
      o("Scattered across notes and inboxes", 1),
      o("A list or spreadsheet with stages", 2),
      o("A pipeline with defined stages, reviewed weekly", 3),
    ],
  },
  /* ---- Deliver ---- */
  {
    id: "deliver-1",
    phase: "deliver",
    prompt: "What happens between the client’s yes and the kickoff?",
    options: [
      o("Whatever occurs to me at the time", 0),
      o("A few emails, sent ad hoc", 1),
      o("A checklist I mostly follow", 2),
      o("A documented start sequence, run identically for every client", 3),
    ],
  },
  {
    id: "deliver-2",
    phase: "deliver",
    prompt: "How is scope handled during delivery?",
    options: [
      o("Verbal agreements — scope is whatever was last discussed", 0),
      o("A scope document exists, but it drifts", 1),
      o("Written scope with a change-request rule", 2),
      o("Scope, boundaries, and change pricing — documented and enforced", 3),
    ],
  },
  {
    id: "deliver-3",
    phase: "deliver",
    prompt: "How do clients get updates on their project?",
    options: [
      o("They ask, I answer", 0),
      o("When I remember to send them", 1),
      o("A standing update cadence — weekly email or call", 2),
      o("Cadence plus a shared status view, so they never have to ask", 3),
    ],
  },
  /* ---- Retain ---- */
  {
    id: "retain-1",
    phase: "retain",
    prompt: "Do you actively manage the client relationship after delivery starts?",
    options: [
      o("I deliver the work and hope they’re happy", 0),
      o("The occasional informal check-in", 1),
      o("Scheduled check-ins with every active client", 2),
      o("Check-ins plus formal value reviews on a set cadence", 3),
    ],
  },
  {
    id: "retain-2",
    phase: "retain",
    prompt: "Would you notice a client drifting before they quit?",
    options: [
      o("Only when they tell me", 0),
      o("Sometimes, after it’s already late", 1),
      o("I watch for signals — slow replies, tone, missed calls", 2),
      o("Defined early-warning signals with a planned response for each", 3),
    ],
  },
  {
    id: "retain-3",
    phase: "retain",
    prompt: "Do past clients come back or refer others?",
    options: [
      o("Rarely, and never predictably", 0),
      o("Sometimes, by luck", 1),
      o("I ask for referrals — irregularly", 2),
      o("Systematic referral asks at defined moments, plus alumni touchpoints", 3),
    ],
  },
  /* ---- Grow ---- */
  {
    id: "grow-1",
    phase: "grow",
    prompt: "How often do you review what’s actually working in the business?",
    options: [
      o("Never — there’s no time", 0),
      o("A yearly gut-check, usually in a crisis", 1),
      o("A monthly look at the numbers", 2),
      o("A standing growth review with an agenda, on a fixed cadence", 3),
    ],
  },
  {
    id: "grow-2",
    phase: "grow",
    prompt: "Which numbers do you actually track?",
    options: [
      o("None — I watch the bank balance", 0),
      o("Revenue", 1),
      o("Revenue, leads, and rough close rate", 2),
      o("The full funnel: outreach, conversations, proposals, win rate, retention", 3),
    ],
  },
  {
    id: "grow-3",
    phase: "grow",
    prompt: "When something stalls — leads, closes, retention — what happens?",
    options: [
      o("Nothing changes until it becomes a crisis", 0),
      o("An improvised fix, then back to normal", 1),
      o("I change one thing and see if it helps", 2),
      o("Changes come out of the review — tested, documented, kept or reverted", 3),
    ],
  },
];

export const AUDIT_TOTAL = AUDIT_QUESTIONS.length;
const MAX_POINTS = AUDIT_TOTAL * 3; // 54

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

function bandFor(overall: number): AuditBand {
  if (overall <= 39) {
    return {
      key: "leaky",
      label: "Leaky",
      verdict:
        "Growth runs on memory and momentum. Every phase depends on you remembering it this week.",
    };
  }
  if (overall <= 59) {
    return {
      key: "patchy",
      label: "Patchy",
      verdict:
        "Real structure in places, but the gaps compound: a strong pitch can’t save a pipeline nobody follows up.",
    };
  }
  if (overall <= 79) {
    return {
      key: "structured",
      label: "Structured",
      verdict:
        "Good bones. The difference between here and systematized is consistency — the same process every week.",
    };
  }
  return {
    key: "systematized",
    label: "Systematized",
    verdict:
      "You run on systems. The next gain comes from tightening the weakest phase, not working harder.",
  };
}

/**
 * Score a completed audit. `answers[i]` is the chosen option index (0–3)
 * for AUDIT_QUESTIONS[i] — the option score equals its index by design.
 */
export function scoreAudit(answers: number[]): AuditResult {
  if (
    answers.length !== AUDIT_TOTAL ||
    answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)
  ) {
    throw new Error("scoreAudit: answers must be one option index per question.");
  }

  const phases: PhaseScore[] = PHASE_ORDER.map((phase) => {
    const qs = AUDIT_QUESTIONS.filter((q) => q.phase === phase);
    const points = qs.reduce(
      (sum, q) => sum + (answers[AUDIT_QUESTIONS.indexOf(q)] ?? 0),
      0
    );
    const maxPoints = qs.length * 3;
    return {
      phase,
      label: phaseMeta[phase].label,
      points,
      maxPoints,
      percent: Math.round((points / maxPoints) * 100),
    };
  });

  const total = answers.reduce((sum, a) => sum + a, 0);
  const overall = Math.round((total / MAX_POINTS) * 100);
  const ranked = [...phases].sort((a, b) => b.percent - a.percent);

  return {
    overall,
    band: bandFor(overall),
    phases,
    strengths: ranked.slice(0, 2),
    gaps: ranked.slice(-2).reverse(), // weakest first
  };
}

/* ------------------------------------------------------------------ */
/* Diagnosis — each phase maps to the modules that fix it              */
/* ------------------------------------------------------------------ */

export type PhaseFix = {
  headline: string;
  /** Module names, exactly as they appear in the Client Growth System. */
  modules: string[];
  fix: string;
};

export const PHASE_FIX: Record<Phase, PhaseFix> = {
  build: {
    headline: "Fix the foundation first",
    modules: ["Business Foundation", "Positioning", "Offer", "Ideal Client"],
    fix: "Positioning, offer, and client criteria are decisions — the system walks you through each one and stores the result.",
  },
  acquire: {
    headline: "Make acquisition a weekly operation",
    modules: ["Acquisition Strategy", "Outreach", "Follow-up"],
    fix: "A channel plan, a message structure, and rules-based follow-up — so pipeline building doesn’t depend on mood.",
  },
  sell: {
    headline: "Sell from structure, not vibe",
    modules: ["Sales", "Proposals"],
    fix: "A defined call structure and a proposal system that reads like a decision, written the same way every time.",
  },
  deliver: {
    headline: "Start every client the same deliberate way",
    modules: ["Client Onboarding"],
    fix: "One documented sequence from signature to kickoff — contract, access, schedule — no dropped threads.",
  },
  retain: {
    headline: "Keep clients on purpose",
    modules: ["Retention"],
    fix: "Standing check-ins, value reviews, and early-warning signals — retention managed instead of assumed.",
  },
  grow: {
    headline: "Compound what works",
    modules: ["Growth Review"],
    fix: "A recurring review of the whole journey — what produced clients, what stalled, what to change next.",
  },
};

/** The one concrete thing to write down this week, per phase. */
export const PHASE_FIRST_ACTION: Record<Phase, string> = {
  build:
    "ideal-client criteria — three bullets: who fits, who doesn’t, and why.",
  acquire:
    "your follow-up rule — every open conversation gets a next touch with a date.",
  sell:
    "your proposal skeleton — scope, outcomes, terms, price, validity. One page.",
  deliver:
    "your start sequence — the first five things that happen after every yes.",
  retain:
    "your check-in cadence — when, how, and what you review with each active client.",
  grow:
    "your review appointment — 30 minutes, weekly, on the calendar, with an agenda.",
};
