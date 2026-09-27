# Build Spec — "The Veyra Growth Audit" (Interactive Web App)

> Self-contained implementation plan. Execute exactly as written.
> Do NOT add new npm dependencies. Do NOT change the design system.
> Everything below uses existing components and tokens already in the repo.

## 0. What we are building

An interactive business-audit web app at route **`/audit`**. The user answers
18 multiple-choice questions about how they run client growth (3 questions ×
6 phases). The app scores their business live, shows an overall score + grade
band for free, then gates the full per-phase breakdown and personalized fix
plan behind an email capture (reusing the existing `/api/subscribe` endpoint).
The results screen maps their weakest phases to specific **Client Growth
System** modules and ends with a purchase CTA at the founding price.

Funnel logic: free instant value → email capture → personalized gap analysis →
product pitch that references *their own answers*.

## 1. Existing code you must reuse (read these files first)

| File | What it gives you |
|---|---|
| `src/lib/products.ts` | `PHASE_ORDER`, `phaseMeta` (labels: Build, Acquire, Sell, Deliver, Retain, Grow), and the 12 module names per phase. Import `PHASE_ORDER`, `phaseMeta`, and the `Phase` type from here — do NOT redefine phases. |
| `src/lib/pricing.ts` | `FOUNDING_PRICE` (79), `REGULAR_PRICE` (149). Import for the CTA — never hardcode prices. |
| `src/lib/site.ts` | `formatPrice()`, `footerNav` (you'll add one link). |
| `src/components/ui/button.tsx` | `<Button variant size href arrow>` — variants: `primary`, `accent`, `outline`, `ghost`; sizes `sm/md/lg`. `href` renders a Next `<Link>`. |
| `src/components/ui/input.tsx` | `<Input label hint error ...inputProps>` — the only input style. |
| `src/components/ui/icons.tsx` | `CheckIcon`, `ArrowRightIcon`, `ChartIcon`, `DocIcon`, `MailIcon`, `ShieldIcon`, `ClockIcon`, `SparkIcon`, etc. 16px grid, sized via className. |
| `src/components/ui/page-header.tsx` | `<PageHeader breadcrumb eyebrow title lead />` — standard interior-page header. |
| `src/components/motion/reveal.tsx` | `<Reveal delay className>` — section entrance animation, reduced-motion safe. Use for page-level sections only, NOT for per-question transitions. |
| `src/app/api/subscribe/route.ts` | POST `{ email, source }` → Supabase `leads`. Reuse as-is with `source: "growth-audit"`. |
| `src/app/globals.css` | All tokens: `bg-paper`, `bg-surface`, `bg-accent-soft`, `border-line`, `border-line-strong`, `text-ink/ink-2/ink-3/ink-4`, `text-accent`, `text-amber`, `text-clay`, `container-page`, `container-tight`, `text-display-1/2`, `text-eyebrow`, `text-lead`, `animate-rise`, `stagger-rise`, `tnum`, `spec`. |
| `src/app/(site)/resources/page.tsx` and `src/components/home/lead-magnet.tsx` | Layout/copy patterns to imitate (two-column grid, card with `rounded-md border border-line bg-surface p-6 shadow-sm sm:p-8`). |

Design language: editorial, restrained, hairline borders, no gradients, no
glow, warm cream paper + deep bronze accent. Copy tone: dry, confident,
no-hype ("One email with the PDF. That's the whole arrangement.").

## 2. Files to create

### 2.1 `src/lib/audit.ts` — data layer (pure, no React)

```ts
import { PHASE_ORDER, phaseMeta, type Phase } from "@/lib/products";
```

**Types:**

```ts
export type AuditOption = { label: string; score: 0 | 1 | 2 | 3 };
export type AuditQuestion = { id: string; phase: Phase; prompt: string; options: AuditOption[] };
export type PhaseScore = { phase: Phase; label: string; points: number; maxPoints: number; percent: number };
export type AuditResult = {
  overall: number;                 // 0–100, rounded
  band: AuditBand;
  phases: PhaseScore[];            // in PHASE_ORDER
  strengths: PhaseScore[];         // top 2 by percent
  gaps: PhaseScore[];              // bottom 2 by percent (ascending)
};
export type AuditBand = { key: "leaky" | "patchy" | "structured" | "systematized"; label: string; verdict: string };
```

**Questions — use this exact content (18 questions, 3 per phase).**
Options are always listed worst→best with scores 0,1,2,3.

Phase `build`:
1. `build-1` — "When a prospect asks what you do, how specific is your answer?"
   - 0: "I describe my general skill set and let them draw conclusions"
   - 1: "I have a rough niche, but the wording changes every time"
   - 2: "I have a clear sentence — who I serve and what I do for them"
   - 3: "I use a tested positioning statement, consistently, everywhere"
2. `build-2` — "How is your offer packaged?"
   - 0: "It's improvised — scope changes with every client"
   - 1: "A few loose service descriptions, no real structure"
   - 2: "Defined packages with scope and pricing"
   - 3: "A documented offer: outcomes, boundaries, and pricing logic"
3. `build-3` — "Could you say exactly which clients you want more of?"
   - 0: "Whoever pays — I take what comes"
   - 1: "I have a vague sense, nothing written"
   - 2: "Written criteria I check new leads against"
   - 3: "Criteria and disqualifiers, actively applied to every lead"

Phase `acquire`:
4. `acquire-1` — "Where do your new leads come from?"
   - 0: "Hope and the occasional referral"
   - 1: "Bursts of outreach when the pipeline looks empty"
   - 2: "One or two channels I work most weeks"
   - 3: "A documented channel plan with a weekly rhythm and targets"
5. `acquire-2` — "What does your outreach actually look like?"
   - 0: "None — I wait to be found"
   - 1: "Copy-paste messages sent in bulk"
   - 2: "Structured messages with a clear ask and some personalization"
   - 3: "A maintained message library with reference points, run every week"
6. `acquire-3` — "What happens after your first message gets no reply?"
   - 0: "Nothing. The thread dies."
   - 1: "I follow up if I remember"
   - 2: "Every open conversation has a scheduled next touch"
   - 3: "A rules-based follow-up sequence — touch two, three, four — run to the end"

Phase `sell`:
7. `sell-1` — "How do you run a sales conversation?"
   - 0: "I wing it and hope the vibe is right"
   - 1: "A loose mental outline, different every call"
   - 2: "A written structure: discovery, qualification, next step"
   - 3: "A question bank and objection responses, used on every call"
8. `sell-2` — "How do your proposals get written?"
   - 0: "From a blank page, every time"
   - 1: "By editing whatever the last proposal was"
   - 2: "A template with scope, outcomes, and terms sections"
   - 3: "A proposal system — consistent, fast, and shaped like a decision"
9. `sell-3` — "Could you list where every open deal stands right now?"
   - 0: "It's all in my head"
   - 1: "Scattered across notes and inboxes"
   - 2: "A list or spreadsheet with stages"
   - 3: "A pipeline with defined stages, reviewed weekly"

Phase `deliver`:
10. `deliver-1` — "What happens between the client's yes and the kickoff?"
    - 0: "Whatever occurs to me at the time"
    - 1: "A few emails, sent ad hoc"
    - 2: "A checklist I mostly follow"
    - 3: "A documented start sequence, run identically for every client"
11. `deliver-2` — "How is scope handled during delivery?"
    - 0: "Verbal agreements — scope is whatever was last discussed"
    - 1: "A scope document exists, but it drifts"
    - 2: "Written scope with a change-request rule"
    - 3: "Scope, boundaries, and change pricing — documented and enforced"
12. `deliver-3` — "How do clients get updates on their project?"
    - 0: "They ask, I answer"
    - 1: "When I remember to send them"
    - 2: "A standing update cadence — weekly email or call"
    - 3: "Cadence plus a shared status view, so they never have to ask"

Phase `retain`:
13. `retain-1` — "Do you actively manage the client relationship after delivery starts?"
    - 0: "I deliver the work and hope they're happy"
    - 1: "The occasional informal check-in"
    - 2: "Scheduled check-ins with every active client"
    - 3: "Check-ins plus formal value reviews on a set cadence"
14. `retain-2` — "Would you notice a client drifting before they quit?"
    - 0: "Only when they tell me"
    - 1: "Sometimes, after it's already late"
    - 2: "I watch for signals — slow replies, tone, missed calls"
    - 3: "Defined early-warning signals with a planned response for each"
15. `retain-3` — "Do past clients come back or refer others?"
    - 0: "Rarely, and never predictably"
    - 1: "Sometimes, by luck"
    - 2: "I ask for referrals — irregularly"
    - 3: "Systematic referral asks at defined moments, plus alumni touchpoints"

Phase `grow`:
16. `grow-1` — "How often do you review what's actually working in the business?"
    - 0: "Never — there's no time"
    - 1: "A yearly gut-check, usually in a crisis"
    - 2: "A monthly look at the numbers"
    - 3: "A standing growth review with an agenda, on a fixed cadence"
17. `grow-2` — "Which numbers do you actually track?"
    - 0: "None — I watch the bank balance"
    - 1: "Revenue"
    - 2: "Revenue, leads, and rough close rate"
    - 3: "The full funnel: outreach, conversations, proposals, win rate, retention"
18. `grow-3` — "When something stalls — leads, closes, retention — what happens?"
    - 0: "Nothing changes until it becomes a crisis"
    - 1: "An improvised fix, then back to normal"
    - 2: "I change one thing and see if it helps"
    - 3: "Changes come out of the review — tested, documented, kept or reverted"

**Scoring functions (export):**

- `scoreAudit(answers: number[]): AuditResult` — `answers[i]` is the chosen
  option index (0–3) for `AUDIT_QUESTIONS[i]`. Throws/guards on wrong length.
  Per phase: points = sum of scores, maxPoints = 9, percent = round(points/9*100).
  Overall = round(totalPoints / 54 * 100).
- Bands (by overall): `0–39` leaky — label "Leaky", verdict "Growth runs on
  memory and momentum. Every phase depends on you remembering it this week."
  `40–59` patchy — label "Patchy", verdict "Real structure in places, but the
  gaps compound: a strong pitch can't save a pipeline nobody follows up."
  `60–79` structured — label "Structured", verdict "Good bones. The difference
  between here and systematized is consistency — the same process every week."
  `80–100` systematized — label "Systematized", verdict "You run on systems.
  The next gain comes from tightening the weakest phase, not working harder."
- `PHASE_FIX: Record<Phase, { headline: string; modules: string[]; fix: string }>`
  — maps each phase to the real Client Growth System modules (names must match
  `products.ts` exactly):
  - build → modules `["Business Foundation", "Positioning", "Offer", "Ideal Client"]`, headline "Fix the foundation first", fix "Positioning, offer, and client criteria are decisions — the system walks you through each one and stores the result."
  - acquire → `["Acquisition Strategy", "Outreach", "Follow-up"]`, "Make acquisition a weekly operation", "A channel plan, a message structure, and rules-based follow-up — so pipeline building doesn't depend on mood."
  - sell → `["Sales", "Proposals"]`, "Sell from structure, not vibe", "A defined call structure and a proposal system that reads like a decision, written the same way every time."
  - deliver → `["Client Onboarding"]`, "Start every client the same deliberate way", "One documented sequence from signature to kickoff — contract, access, schedule — no dropped threads."
  - retain → `["Retention"]`, "Keep clients on purpose", "Standing check-ins, value reviews, and early-warning signals — retention managed instead of assumed."
  - grow → `["Growth Review"]`, "Compound what works", "A recurring review of the whole journey — what produced clients, what stalled, what to change next."
- `phaseColor(percent)` helper is NOT needed in lib — handle colors in the component.

### 2.2 `src/components/audit/growth-audit.tsx` — the app (client component)

`"use client"` at top. Single exported component `<GrowthAudit />`.

**State machine** — `stage: "intro" | "quiz" | "gate" | "results"`, plus:
- `index: number` (current question)
- `answers: (number | null)[]` (length 18, option index per question)
- `email, emailStatus: "idle" | "loading" | "done" | "error", emailError`
- `result: AuditResult | null` (computed when entering `gate`)

**Screen A — intro** (inside a `rounded-md border border-line bg-surface p-6 shadow-sm sm:p-10` card, centered, max-w-2xl):
- Eyebrow: "Free · No signup to start"
- `text-display-1`: "How does your client growth actually run?"
- Lead paragraph (~2 sentences): 18 questions, about 3 minutes, scored across
  the six phases of client growth. You see your score before you give anything.
- Three small spec rows (use `spec` class labels + ink-2 values):
  "18 questions / ~3 minutes", "Six phases scored / Build → Grow",
  "Your score first / email only for the full report".
- `<Button variant="accent" size="lg" arrow onClick={start}>Start the audit</Button>`
- Fine print (`text-xs text-ink-4`): "Nothing is sold here. The report maps
  your gaps to the systems that fix them — you decide what's worth doing."

**Screen B — quiz:**
- Top row: current phase label (`text-eyebrow`, from `phaseMeta[q.phase].label`)
  + right-aligned mono counter `Question {index+1} of 18` (`spec text-ink-4 tnum`).
- Progress bar: `h-1 w-full rounded-full bg-line` track, inner div width
  `${((index + (answers[index] !== null ? 1 : 0)) / 18) * 100}%`,
  `bg-accent transition-[width] duration-300 ease-out`.
- Question prompt: `text-display-2` (no h-tag nesting issues — use `<h2>`; the
  page `<h1>` lives in the header).
- Options: rendered as a vertical stack of `<button type="button">`, full width,
  left-aligned: `rounded-sm border px-4 py-3.5 text-sm transition-colors text-left`.
  Default: `border-line-strong bg-surface text-ink-2 hover:border-accent/50 hover:bg-accent-soft/50`.
  Selected: `border-accent bg-accent-soft text-ink`.
  Prefix each option with a mono letter A/B/C/D (`spec text-ink-4 mr-3`).
  Wrap options in `role="radiogroup"` with `aria-label={q.prompt}`; each button
  gets `role="radio" aria-checked={selected}` and `tabIndex` 0.
- Behavior: clicking an option records the answer, waits 180ms (so the selected
  state is perceptible), then advances. On the last question, compute
  `scoreAudit` and move to `gate`.
- Per-question transition: wrap the question block in a `<div key={q.id} className="animate-rise">`
  so each question fades/rises in (the global reduced-motion rule in
  globals.css collapses this automatically — do not add JS motion here).
- Back button: `<Button variant="ghost" size="sm" onClick={back}>← Back</Button>`
  below the options, hidden when `index === 0`. Going back preserves previous
  answers and shows the previously selected option.
- Keyboard: 1–4 / A–D select the matching option (window keydown listener,
  cleaned up; ignore when typing in the email input — only active in `quiz` stage).

**Screen C — gate** (the persuasion moment; show real value before asking):
- Big score: overall number in `text-display-hero tnum` + `/100` smaller, with
  band label in a pill (`rounded-full border px-3 py-1 text-xs` — border/text
  color by band: leaky → `border-clay/40 text-clay`, patchy → `border-amber/50 text-amber`,
  structured/systematized → `border-accent/40 text-accent`).
- Band verdict paragraph (`text-lead`).
- ONE free teaser insight, from their actual answers: their single weakest
  phase → "Your weakest phase: **{label}** ({percent}%). {PHASE_FIX[phase].fix}"
- Locked section: heading "Your full report" + list of what's inside
  (per-phase scores across all six phases; your two strongest phases and why
  they hold; a fix-first priority list mapped to the exact modules; the one
  change to make this week) rendered at `opacity-100` above a divider, then
  the email form.
- Email form: `<Input type="email" label="Email address" placeholder="you@yourstudio.com" ...>`
  + `<Button variant="accent" size="lg" className="w-full">Send me my full report</Button>`.
  Submit → POST `/api/subscribe` with `{ email, source: "growth-audit" }`
  (copy the fetch pattern from `lead-magnet.tsx` exactly, including the
  `data.error ?? "Please try again."` handling). On success → `stage = "results"`.
  On failure → show error via Input's `error` prop, stay on gate, allow retry.
- Fine print: "One email with your report link. No spam, no drip campaign,
  unsubscribe anytime."

**Screen D — results** (only reachable after successful submit):
1. **Score recap** — overall + band pill + verdict (same as gate).
2. **Phase breakdown** — six rows, in `PHASE_ORDER`. Each row: phase label
   (`text-sm text-ink-2`), percent (`spec tnum text-ink-3`, right-aligned),
   and a bar (`h-1.5 rounded-full bg-line` track; fill width = percent, color:
   `bg-accent` ≥70, `bg-amber` 40–69, `bg-clay` <40). Wrap the six rows in
   `stagger-rise` for the entrance.
3. **Strengths** — top 2 phases: green-ish treatment (`text-accent` + CheckIcon),
   one line each: "{label} ({percent}%) — holding up. Keep the cadence."
4. **Fix-first list** — bottom 2 phases ascending, each rendered as a card
   (`rounded-sm border border-line bg-paper p-5`): phase label + percent,
   `PHASE_FIX[phase].headline` as the card title (`text-display-2 text-[1.125rem]`),
   the `fix` paragraph, and a mono line "Covered by: {modules.join(' · ')}"
   (`spec text-ink-4`).
5. **"The one change this week"** — a highlighted panel (`rounded-md border border-accent/30 bg-accent-soft/60 p-6`):
   take their weakest phase and render a concrete first action:
   "Before anything else: write down your {phase-specific action}." Phase → action map
   (put in `audit.ts` as `PHASE_FIRST_ACTION: Record<Phase, string>`):
   build: "ideal-client criteria — three bullets: who fits, who doesn't, and why."
   acquire: "your follow-up rule — every open conversation gets a next touch with a date."
   sell: "your proposal skeleton — scope, outcomes, terms, price, validity. One page."
   deliver: "your start sequence — the first five things that happen after every yes."
   retain: "your check-in cadence — when, how, and what you review with each active client."
   grow: "your review appointment — 30 minutes, weekly, on the calendar, with an agenda."
6. **Product CTA card** — dark, premium treatment (`rounded-md bg-ink text-paper p-8`):
   - `spec` eyebrow in `text-paper/60`: "The complete system"
   - `text-display-2`: "Fix all six phases with the Client Growth System"
   - Short paragraph (`text-paper/75 text-sm`): all 12 modules referenced in your
     report, one connected system, one-time purchase, instant delivery, every
     future update included.
   - Price row: `{formatPrice(FOUNDING_PRICE)}` large + struck
     `{formatPrice(REGULAR_PRICE)}` (`line-through text-paper/40`) + pill
     "Founding price" (`border border-paper/25 rounded-full px-3 py-1 text-xs`).
   - `<Button variant="accent" size="lg" arrow href="/products/client-growth-system">See the Client Growth System</Button>`
     (accent-on-dark works: accent is bronze; alternatively use a custom
     `bg-paper text-ink hover:bg-accent-soft` className override on the Button —
     prefer this for contrast on the ink card).
7. **Footer actions** — `<Button variant="outline" size="sm" onClick={retake}>Retake the audit</Button>`
   (resets all state to intro) + a ghost link "Back to resources" → `/resources`.

**General component rules:**
- No framer-motion inside this component; CSS animations only (`animate-rise`,
  `stagger-rise`) — the global reduced-motion rule handles them.
- On every stage change, scroll the card into view:
  `useRef` on the container + `el.scrollIntoView({ behavior: "smooth", block: "start" })`
  inside a `useEffect` on `stage`/`index` (guard with
  `window.matchMedia("(prefers-reduced-motion: reduce)").matches` → use `behavior: "auto"`).
- All copy uses proper apostrophes (`&rsquo;` / `'` in JSX text) — match the
  existing files' style.

### 2.3 `src/app/(site)/audit/page.tsx` — the page (server component)

```tsx
export const metadata: Metadata = {
  title: "Free Growth Audit",
  description:
    "An 18-question audit of how your client growth actually runs — scored across six phases, free, with your results before you give us anything.",
  alternates: { canonical: "/audit" },
  openGraph: { title: "Free Growth Audit — Veyra", url: "/audit" },
};
```

Structure:
- `<PageHeader breadcrumb={[{label:"Home",href:"/"},{label:"Resources",href:"/resources"},{label:"Growth Audit"}]} eyebrow="Free tool" title="Score your client-growth machine in three minutes." lead="Eighteen questions across the six phases of client growth — Build, Acquire, Sell, Deliver, Retain, Grow. You see your score before we ask for anything." />`
- `<section className="bg-paper">` with `container-page py-14 lg:py-20`, a
  centered max-w-2xl wrapper containing `<GrowthAudit />`.
- Below the app, a quiet three-column trust strip (`grid gap-8 sm:grid-cols-3`,
  `border-t border-line pt-12 mt-16`), each with an icon in the standard
  bordered square (`flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface`):
  - ShieldIcon — "Private by default" / "Your answers never leave the browser. Only your email — if you ask for the report — touches our server."
  - ClockIcon — "Three minutes" / "Eighteen questions, one screen each. Answer honestly; the score is only useful if it's real."
  - ChartIcon — "Built on the real system" / "The six phases aren't quiz marketing — they're the exact structure of the Client Growth System."
- Final small section with `Reveal`: "Prefer the checklist?" one-liner linking
  to `/resources#audit` (the PDF email capture stays as the secondary path).

## 3. Files to modify

### 3.1 `src/lib/site.ts`
In `footerNav.support`, add before Resources:
`{ label: "Free Growth Audit", href: "/audit" },`

### 3.2 `src/app/sitemap.ts`
Read the file first; add a `/audit` entry following the existing pattern for
static pages (weekly changefreq, priority matching `/resources`).

### 3.3 `src/components/home/lead-magnet.tsx` (homepage Section H)
Keep the existing email form working, but re-point the section at the app:
- Change eyebrow from "Free resource" to "Free tool".
- Change the h2 to: "How does your client growth actually run?"
- Change the lead paragraph: "The Growth Audit asks 18 questions and scores
  your business across six phases — build, acquire, sell, deliver, retain,
  grow. You see your score in about three minutes, before you give us anything."
- Replace the `auditPoints` list with what the audit outputs:
  "An overall score and grade — leaky, patchy, structured, or systematized",
  "Per-phase breakdown showing exactly where leads, deals, or clients slip",
  "A fix-first priority list — the one change to make this week",
  "No signup to start. Email only unlocks the full written report."
- In the right-hand card, add ABOVE the existing form:
  `<Button variant="accent" size="lg" className="w-full" arrow href="/audit">Start the free audit</Button>`,
  then a divider row (two hairlines flanking `<span className="spec text-ink-4">or get the PDF checklist</span>`),
  then the existing email form unchanged (keep `source: "homepage-audit"`).
  Adjust the card heading "Get the audit" → "Get the 25-point checklist" so
  the two paths read distinctly.

### 3.4 `src/app/(site)/resources/page.tsx`
- Add a NEW featured section above the existing audit section: the Growth
  Audit app promo. Same two-column pattern as the existing one: left = icon
  (ChartIcon) + `text-display-1` "The Growth Audit" + lead ("Answer 18
  questions, get a live score across the six phases of client growth — and a
  fix-first list you can act on today.") + 3 bullets (DownloadIcon → use
  CheckIcon here): "Scored instantly, in your browser", "Your results before
  your email", "Maps every gap to the module that fixes it".
  Right = a card with `<Button variant="accent" size="lg" arrow href="/audit" className="w-full">Start the audit — 3 minutes</Button>`
  + fine print "Free. No account, no card, no drip campaign."
- Change the "Coming next" section body to mention both paths: the audit app
  above and the PDF checklist, keeping the no-filler promise.

### 3.5 `src/app/(site)/page.tsx`
No structural change needed — `LeadMagnet` is already rendered at line 37.
Verify nothing else references the old heading copy (search for
"25-Point Client Acquisition Audit" — it stays valid on `/resources`).

## 4. Constraints & rules (non-negotiable)

1. **TypeScript strict** — no `any`, all exported types named.
2. **No new dependencies.** React state + CSS animations only.
3. **Never hardcode prices** — import `FOUNDING_PRICE`, `REGULAR_PRICE`,
   `formatPrice`.
4. **Never redefine phases** — import `PHASE_ORDER`, `phaseMeta`, `Phase` from
   `@/lib/products`.
5. Scoring runs **client-side only** — no API changes except reusing
   `/api/subscribe` with the new `source: "growth-audit"` tag (the route
   already accepts any string source, truncated to 64 chars).
6. Results are only shown after a **successful** subscribe response
   (`res.ok`). If Supabase is down (502), show the error and keep the gate —
   do not silently unlock.
7. Match the editorial copy tone — dry and specific, never salesy-shouty.
8. Accessibility: radiogroup semantics on options, `aria-live="polite"` on the
   progress counter, visible focus states come free from the token system —
   don't remove outline styles.

## 5. Verification checklist (run all)

1. `npx tsc --noEmit` — clean.
2. `npm run lint` (if configured) / `npx next lint` — clean.
3. `npm run build` — succeeds; `/audit` appears in the route list.
4. `npm run dev` → walk the full flow manually:
   - `/audit` intro → answer all 18 (use keyboard 1–4 on some screens to test
     the shortcut) → gate shows a plausible score → submit a test email →
     dev server logs `[subscribe] lead captured (dev): ... (growth-audit)` →
     results screen renders with bars, strengths, fix-first cards, product CTA.
   - Retake resets to intro.
   - Back button preserves answers.
   - Homepage `#audit` section: new CTA links to `/audit`, PDF form still
     submits and shows the "Check your inbox" state.
   - `/resources`: new featured section renders above the PDF section.
   - Footer contains the "Free Growth Audit" link.
   - Resize to 375px width — no overflow; options stack cleanly.
5. Confirm prefers-reduced-motion: OS-level setting on → question transitions
   are instant (global CSS handles it; verify no JS animation was added).
