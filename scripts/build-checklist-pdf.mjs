#!/usr/bin/env node
/**
 * Builds the 25-Point Client Acquisition Audit PDF and embeds it as a
 * server-only base64 module (src/lib/email/checklist-pdf.ts) so the PDF
 * travels ONLY by email — no public URL to bypass the lead capture, and
 * no fs reads at runtime (the API runs on Cloudflare Workers).
 *
 * Re-run after editing CHECKLIST below:   node scripts/build-checklist-pdf.mjs
 * Optional preview copy:                 node scripts/build-checklist-pdf.mjs --preview /tmp/check.pdf
 *
 * DevDependency only (pdf-lib) — nothing ships to the runtime bundle
 * except the generated base64 string.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------------ */
/* Content — the 25 points, same six phases as the interactive audit   */
/* ------------------------------------------------------------------ */

const PHASES = [
  {
    label: "Build",
    tagline: "Positioning, offer, and who you serve.",
    points: [
      "One tested sentence describes who you serve and what you get them — and it is used consistently, everywhere.",
      "The offer is packaged: defined scope, price, and outcome. It is not reinvented with every prospect.",
      "Written ideal-client criteria exist, and every new lead is checked against them.",
      "You can say, out loud, what you no longer do for clients.",
    ],
  },
  {
    label: "Acquire",
    tagline: "Where leads come from, and what follows.",
    points: [
      "A documented channel plan sets a weekly rhythm and numbers for lead generation.",
      "Outreach time happens every week — not only when the pipeline looks empty.",
      "Outreach messages have a clear structure and a specific ask.",
      "Every open conversation has a scheduled next touch, with a date.",
      "Follow-up runs by rule — touch two, three, four — not at the first silence.",
    ],
  },
  {
    label: "Sell",
    tagline: "Conversations, proposals, and the pipeline.",
    points: [
      "Sales calls follow a written structure: discovery, qualification, next step.",
      "A question bank and prepared answers to the five most common objections exist.",
      "Proposals come from a template — scope, outcomes, terms, price, validity — never a blank page.",
      "Every open deal lives in one pipeline with defined stages.",
      "The pipeline is reviewed weekly, and stalled deals get a decision.",
    ],
  },
  {
    label: "Deliver",
    tagline: "From the yes to a running engagement.",
    points: [
      "The sequence from signature to kickoff is documented and run identically for every client.",
      "Scope is written, and changes go through a defined, priced change process.",
      "Clients receive updates on a standing cadence — they never have to ask where things stand.",
      "The project ends deliberately: handover, final review, closure — not a slow fade.",
    ],
  },
  {
    label: "Retain",
    tagline: "Keeping clients on purpose.",
    points: [
      "Scheduled check-ins happen with every active client.",
      "Early-warning signals of a drifting client are named, with a planned response for each.",
      "Referrals are asked for at defined moments — not when it feels natural.",
    ],
  },
  {
    label: "Grow",
    tagline: "Compounding what works.",
    points: [
      "A standing growth review sits on the calendar — with an agenda, kept.",
      "The full funnel is tracked: outreach, conversations, proposals, win rate, retention.",
      "When something stalls, the fix comes from the review — tested, documented, kept or reverted.",
      "The biggest current revenue lever is known, with one concrete action attached to it.",
    ],
  },
];

const BANDS = [
  { range: "0–9", name: "Leaky", verdict: "Growth runs on memory and momentum. Every phase depends on you remembering it this week." },
  { range: "10–14", name: "Patchy", verdict: "Real structure in places, but the gaps compound: a strong pitch can't save a pipeline nobody follows up." },
  { range: "15–19", name: "Structured", verdict: "Good bones. The difference between here and systematized is consistency — the same process every week." },
  { range: "20–25", name: "Systematized", verdict: "You run on systems. The next gain comes from tightening the weakest phase, not working harder." },
];

const FIX_FIRST = [
  ["Build", "ideal-client criteria — who fits, who doesn't, and why."],
  ["Acquire", "your follow-up rule — every open conversation gets a next touch with a date."],
  ["Sell", "your proposal skeleton — scope, outcomes, terms, price, validity. One page."],
  ["Deliver", "your start sequence — the first five things that happen after every yes."],
  ["Retain", "your check-in cadence — when, how, and what you review with each client."],
  ["Grow", "your review appointment — 30 minutes, weekly, on the calendar, with an agenda."],
];

/* ------------------------------------------------------------------ */
/* Palette + type — mirrors the site's editorial system                */
/* ------------------------------------------------------------------ */

const C = {
  ink: rgb(23 / 255, 21 / 255, 15 / 255),
  ink3: rgb(111 / 255, 106 / 255, 93 / 255),
  muted: rgb(138 / 255, 132 / 255, 116 / 255),
  accent: rgb(47 / 255, 93 / 255, 58 / 255),
  paper: rgb(244 / 255, 242 / 255, 236 / 255),
  line: rgb(221 / 255, 217 / 255, 206 / 255),
};

const PAGE = { w: 612, h: 792 }; // US Letter
const M = 56; // margin
const CW = PAGE.w - M * 2; // content width

const doc = await PDFDocument.create();
doc.setTitle("The 25-Point Client Acquisition Audit");
doc.setAuthor("Veyra");
doc.setSubject("A yes/no checklist across the six phases of client growth");

const serif = await doc.embedFont(StandardFonts.TimesRoman);
const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
const sans = await doc.embedFont(StandardFonts.Helvetica);
const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);

let page = doc.addPage([PAGE.w, PAGE.h]);
let y = PAGE.h - M;

function newPage() {
  page = doc.addPage([PAGE.w, PAGE.h]);
  y = PAGE.h - M;
  page.drawRectangle({ x: M, y: PAGE.h - 34, width: CW, height: 26, color: C.paper });
}

function space(n) { y -= n; }
function need(n) { if (y - n < M + 24) newPage(); }

function text(t, x, size, font, color, opts = {}) {
  page.drawText(sanitize(t), { x, y, size, font, color, ...opts });
}

function draw(t, size, font, color, { leading = size * 1.45, x = M, width = CW } = {}) {
  const lines = wrap(t, font, size, width);
  for (const line of lines) {
    need(leading);
    text(line, x, size, font, color);
    y -= leading;
  }
}

function wrap(t, font, size, maxWidth) {
  const words = t.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Letter-spaced label (small caps aesthetic), returns without moving y. */
function tracked(t, x, size, font, color, spacing = 1.6) {
  let cx = x;
  for (const ch of t.toUpperCase()) {
    page.drawText(sanitize(ch), { x: cx, y, size, font, color });
    cx += font.widthOfTextAtSize(ch, size) + spacing;
  }
  return cx - x;
}

function rule(color = C.line, thickness = 1, inset = 0) {
  page.drawLine({
    start: { x: M + inset, y },
    end: { x: PAGE.w - M - inset, y },
    thickness, color,
  });
}

/** Smart quotes and dashes are not in WinAnsi via pdf-lib drawText edge cases — keep them, pdf-lib handles WinAnsi; just guard exotic chars. */
function sanitize(s) { return s.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"'); }

/* ------------------------------------------------------------------ */
/* Masthead                                                            */
/* ------------------------------------------------------------------ */

tracked("Veyra", M, 11, sansBold, C.accent, 3);
{
  const prev = y;
  y = prev;
  const label = "Free resource";
  page.drawText(sanitize(label), { x: PAGE.w - M - sans.widthOfTextAtSize(label, 8), y: prev - 1, size: 8, font: sans, color: C.muted });
}
space(14);
rule(C.ink, 1.5);
space(30);

// Display title
text("The 25-Point", M, 30, serifBold, C.ink); y -= 34;
text("Client Acquisition Audit", M, 30, serifBold, C.ink); y -= 30;

draw(
  "Twenty-five yes/no checks across the six phases of client growth - build, " +
  "acquire, sell, deliver, retain, grow. One honest no costs more than ten " +
  "polished yeses: the point is not the score, it is finding where growth leaks.",
  12, serif, C.ink3, { leading: 17 }
);
space(10);
draw("Circle yes or no for each point. Keep a tally per phase.", 10.5, serifItalic, C.muted, { leading: 14 });
space(16);
rule();
space(6);

/* ------------------------------------------------------------------ */
/* The checklist                                                       */
/* ------------------------------------------------------------------ */

let num = 0;
for (const [pi, phase] of PHASES.entries()) {
  need(72);
  space(14);
  tracked(`Phase ${pi + 1} - ${phase.label}`, M, 8.5, sansBold, C.accent, 1.4);
  space(11);
  draw(phase.tagline, 9.5, serifItalic, C.muted, { leading: 12 });
  space(6);

  for (const point of phase.points) {
    num += 1;
    // measure wrapped text to size the row
    const lines = wrap(point, serif, 11, CW - 112);
    const rowH = lines.length * 14.5 + 8;
    need(rowH);
    const top = y;
    page.drawText(String(num).padStart(2, "0"), {
      x: M + 2, y: top - 12, size: 9, font: sansBold, color: C.muted,
    });
    lines.forEach((line, i) => {
      page.drawText(sanitize(line), { x: M + 26, y: top - 13 - i * 14.5, size: 11, font: serif, color: C.ink });
    });
    // answer boxes: yes / no, right-aligned
    const box = 8;
    const bx2 = PAGE.w - M - box;
    const bx1 = bx2 - 26 - box;
    const by = top - 15;
    page.drawRectangle({ x: bx1, y: by, width: box, height: box, borderColor: C.ink3, borderWidth: 0.8 });
    page.drawRectangle({ x: bx2, y: by, width: box, height: box, borderColor: C.ink3, borderWidth: 0.8 });
    page.drawText("no", { x: bx1 - 18, y: by + 0.5, size: 7.5, font: sans, color: C.muted });
    page.drawText("yes", { x: bx2 - 20, y: by + 0.5, size: 7.5, font: sans, color: C.muted });
    y = top - rowH;
  }
}

space(18);
need(40);
rule();

/* ------------------------------------------------------------------ */
/* Tally → what it means                                               */
/* ------------------------------------------------------------------ */

newPage();
space(2);
tracked("Add up the yeses", M, 8.5, sansBold, C.accent, 1.4);
space(20);
text("What your tally means", M, 22, serifBold, C.ink);
space(24);

for (const band of BANDS) {
  need(46);
  space(6);
  const top = y;
  page.drawRectangle({ x: M, y: top - 26, width: 58, height: 22, color: C.paper });
  page.drawText(sanitize(band.range), { x: M + 8, y: top - 19.5, size: 11, font: sansBold, color: C.accent });
  page.drawText(sanitize(band.name), { x: M + 70, y: top - 19.5, size: 12.5, font: serifBold, color: C.ink });
  const lines = wrap(band.verdict, serif, 10.5, CW - 70);
  lines.forEach((line, i) => {
    page.drawText(sanitize(line), { x: M + 70, y: top - 36 - i * 13.5, size: 10.5, font: serif, color: C.ink3 });
  });
  y = top - 36 - lines.length * 13.5;
}

space(26);
need(170);

/* Fix-first block on paper fill */
const fixTop = y + 6;
const fixH = 158;
page.drawRectangle({ x: M - 8, y: fixTop - fixH, width: CW + 16, height: fixH, color: C.paper });
y = fixTop - 26;
tracked("The fix-first rule", M + 8, 8.5, sansBold, C.accent, 1.4);
y = fixTop - 42;
draw(
  "Find the phase with the fewest yeses. Write down the one thing from its " +
  "row below - this week, before anything else.",
  10.5, serif, C.ink3, { x: M + 8, width: CW - 16, leading: 14 }
);
space(6);
for (const [phase, action] of FIX_FIRST) {
  const line = `${phase} - ${action}`;
  const lines = wrap(line, serif, 10, CW - 32);
  for (const l of lines) {
    page.drawText(sanitize(l), { x: M + 8, y, size: 10, font: serif, color: C.ink });
    y -= 12.5;
  }
}

/* ------------------------------------------------------------------ */
/* Footer CTA                                                          */
/* ------------------------------------------------------------------ */

space(20);
need(58);
rule();
space(16);
draw(
  "Prefer it scored for you? The interactive Growth Audit asks 18 questions " +
  "and returns your score, phase breakdown, and priority list in about " +
  "three minutes.",
  10.5, serifItalic, C.ink3, { leading: 14 }
);
space(2);
text("veyra.caelmont.in/audit", M, 13, serifBold, C.accent);
const fine = "Veyra - no spam, no drip campaign. veyra.caelmont.in";
page.drawText(sanitize(fine), { x: PAGE.w - M - sans.widthOfTextAtSize(fine, 8), y, size: 8, font: sans, color: C.muted });

/* ------------------------------------------------------------------ */
/* Emit                                                                */
/* ------------------------------------------------------------------ */

const bytes = await doc.save({ useObjectStreams: false });
const base64 = Buffer.from(bytes).toString("base64");

const outModule = resolve(repoRoot, "src/lib/email/checklist-pdf.ts");
await mkdir(dirname(outModule), { recursive: true });
await writeFile(
  outModule,
  `/**
 * GENERATED by scripts/build-checklist-pdf.mjs — do not edit by hand.
 * The 25-Point Client Acquisition Audit PDF, embedded as base64 so it can
 * be emailed as an attachment from any runtime (including Cloudflare
 * Workers, where there is no public filesystem to read from).
 * Regenerate after content changes:  node scripts/build-checklist-pdf.mjs
 */

import "server-only";

export const CHECKLIST_PDF_BASE64 =
  "${base64}";

export const CHECKLIST_PDF_FILENAME = "Veyra-25-Point-Client-Acquisition-Audit.pdf";
`
);

console.log(`[checklist-pdf] ${bytes.length} bytes -> ${outModule}`);

const previewFlag = process.argv.indexOf("--preview");
if (previewFlag !== -1 && process.argv[previewFlag + 1]) {
  const p = resolve(process.argv[previewFlag + 1]);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, bytes);
  console.log(`[checklist-pdf] preview written to ${p}`);
}
