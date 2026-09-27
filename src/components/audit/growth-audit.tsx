"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PHASE_ORDER, phaseMeta } from "@/lib/products";
import {
  AUDIT_QUESTIONS,
  AUDIT_TOTAL,
  PHASE_FIRST_ACTION,
  PHASE_FIX,
  scoreAudit,
  type AuditBandKey,
  type AuditResult,
} from "@/lib/audit";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { formatPrice } from "@/lib/site";
import { useUiSounds } from "@/components/audit/use-sounds";
import { Button } from "@/components/ui/button";
import {
  CheckIcon,
  SoundOffIcon,
  SoundOnIcon,
  SparkIcon,
} from "@/components/ui/icons";

/**
 * GrowthAudit — the interactive score-your-business app.
 *
 * Three stages: intro → quiz (18 questions, one per screen) → results.
 * There is no email gate: the audit is a free *product*, and products are
 * acquired through accounts — the /audit page itself renders only for
 * signed-in owners with an active entitlement (see app/(site)/audit).
 * A "gate" fallback stage exists purely defensively, pointing anyone who
 * somehow reaches the flow without an entitlement to the claim page.
 * Answering plays an ascending pentatonic step (src/lib/sound.ts), so a
 * completed quiz audibly walks a scale — the same rising-pitch feedback
 * games use for progress.
 *
 * Motion is CSS-only (animate-slide-in / animate-rise / transitions);
 * the global reduced-motion rule collapses everything to instant.
 */

type Stage = "intro" | "quiz" | "scoring" | "gate" | "results";

type Props = {
  /** Signed-in owner of the free Growth Audit — results open un-gated. */
  unlocked?: boolean;
  /** The owner's licence reference, for the quiet "active" banner. */
  licenceReference?: string | null;
};

const LETTERS = ["A", "B", "C", "D"] as const;

const bandClasses: Record<AuditBandKey, string> = {
  leaky: "border-clay/40 text-clay",
  patchy: "border-amber/50 text-amber",
  structured: "border-accent/40 text-accent",
  systematized: "border-accent/40 text-accent",
};

function barColor(percent: number): string {
  if (percent >= 70) return "bg-accent";
  if (percent >= 40) return "bg-amber";
  return "bg-clay";
}

/** easeOutExpo count-up for the big score. */
function useCountUp(target: number, active: boolean, reduced: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, reduced]);
  return value;
}

export function GrowthAudit({
  unlocked = false,
  licenceReference = null,
}: Props) {
  const { enabled: sfxOn, toggle: toggleSfx, hover, select, back, play } =
    useUiSounds();

  const [stage, setStage] = useState<Stage>("intro");
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => Array<number | null>(AUDIT_TOTAL).fill(null)
  );
  const [result, setResult] = useState<AuditResult | null>(null);
  const [barsShown, setBarsShown] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const advancing = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const answeredCount = useMemo(
    () => answers.filter((a) => a !== null).length,
    [answers]
  );

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // The card keeps itself in view as stages change.
  useEffect(() => {
    cardRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [stage, index, reduced]);

  const finish = useCallback(
    (nums: number[]) => {
      setResult(scoreAudit(nums));
      play("reveal");
      setStage("scoring");
      const t = window.setTimeout(
        () => setStage(unlocked ? "results" : "gate"),
        reduced ? 0 : 900
      );
      timers.current.push(t);
    },
    [play, unlocked, reduced]
  );

  const choose = useCallback(
    (optionIdx: number) => {
      if (stage !== "quiz" || advancing.current) return;
      advancing.current = true;
      const next = [...answers];
      next[index] = optionIdx;
      setAnswers(next);
      select(index);
      const t = window.setTimeout(
        () => {
          advancing.current = false;
          if (index + 1 < AUDIT_TOTAL) {
            setDir("fwd");
            setIndex(index + 1);
          } else {
            const nums = next.map((a) => a ?? 0);
            finish(nums);
          }
        },
        reduced ? 0 : 200
      );
      timers.current.push(t);
    },
    [stage, answers, index, select, finish, reduced]
  );

  const goBack = useCallback(() => {
    if (index === 0) return;
    back();
    setDir("back");
    setIndex(index - 1);
  }, [index, back]);

  // Keyboard: 1–4 / A–D answer the current question.
  useEffect(() => {
    if (stage !== "quiz") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey)
        return;
      const n = "1234".indexOf(e.key);
      const l = "abcdABCD".indexOf(e.key);
      const pick = n >= 0 ? n : l >= 0 ? l % 4 : -1;
      if (pick >= 0) {
        e.preventDefault();
        choose(pick);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, choose]);

  // Bars/score animate in once the results screen mounts.
  useEffect(() => {
    if (stage !== "results") return;
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => setBarsShown(true))
    );
    return () => cancelAnimationFrame(r);
  }, [stage]);

  function start() {
    play("unlock");
    setStage("quiz");
  }

  function retake() {
    setAnswers(Array<number | null>(AUDIT_TOTAL).fill(null));
    setResult(null);
    setIndex(0);
    setDir("fwd");
    setBarsShown(false);
    setStage("intro");
  }

  const q = AUDIT_QUESTIONS[index];
  const progressPercent = (answeredCount / AUDIT_TOTAL) * 100;

  return (
    <div
      ref={cardRef}
      className="relative rounded-md border border-line bg-surface p-6 shadow-sm scroll-mt-24 sm:p-10"
    >
      <SoundToggle on={sfxOn} toggle={toggleSfx} />

      {licenceReference ? (
        <p className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
          <CheckIcon className="h-3.5 w-3.5 text-accent" />
          Free copy active in your account
          <span className="spec text-ink-4">{licenceReference}</span>
        </p>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* INTRO                                                         */}
      {/* ------------------------------------------------------------ */}
      {stage === "intro" ? (
        <div className="mx-auto max-w-xl text-center">
          <p className="text-eyebrow">Free · Active in your account</p>
          <h2 className="text-display-1 mt-4">
            How does your client growth actually run?
          </h2>
          <p className="mt-5 text-lead">
            18 questions, about three minutes, scored across the six phases of
            client growth. Your full report is yours to keep — it lives in
            your library with its own licence.
          </p>

          <dl className="mx-auto mt-8 grid max-w-md gap-px overflow-hidden rounded-md border border-line bg-line text-left sm:grid-cols-3">
            {[
              { t: "18 questions", d: "~3 minutes" },
              { t: "Six phases", d: "Build → Grow" },
              { t: "Yours to keep", d: "Report + licence in your library" },
            ].map((row) => (
              <div key={row.t} className="bg-paper px-4 py-3.5">
                <dt className="text-sm font-medium text-ink">{row.t}</dt>
                <dd className="mt-0.5 text-xs leading-snug text-ink-3">
                  {row.d}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8">
            <Button variant="accent" size="lg" arrow onClick={start} onMouseEnter={hover}>
              Start the audit
            </Button>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-ink-4">
            Nothing is sold here. The report maps your gaps to the systems
            that fix them — you decide what&rsquo;s worth doing.
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* QUIZ                                                          */}
      {/* ------------------------------------------------------------ */}
      {stage === "quiz" ? (
        <div className="mx-auto max-w-2xl">
          {/* Phase stepper: 18 segments, grouped three per phase. */}
          <div
            className="flex items-center gap-2.5"
            aria-label={`Question ${index + 1} of ${AUDIT_TOTAL}`}
          >
            {PHASE_ORDER.map((phase, pi) => (
              <div key={phase} className="flex flex-1 gap-1">
                {[0, 1, 2].map((k) => {
                  const qi = pi * 3 + k;
                  const done = answers[qi] !== null;
                  const current = qi === index;
                  return (
                    <span
                      key={qi}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        done
                          ? "bg-accent"
                          : current
                            ? "bg-accent/35"
                            : "bg-line"
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-baseline justify-between gap-4">
            <p className="text-eyebrow">{phaseMeta[q.phase].label}</p>
            <p className="spec text-ink-4 tnum" aria-live="polite">
              Question {index + 1} of {AUDIT_TOTAL}
            </p>
          </div>

          {/* Smooth overall progress bar under the stepper row. */}
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div
            key={q.id}
            className={dir === "fwd" ? "animate-slide-in mt-8" : "animate-slide-in-back mt-8"}
          >
            <h2 className="text-display-2 max-w-xl">{q.prompt}</h2>

            <div role="radiogroup" aria-label={q.prompt} className="mt-6 space-y-3">
              {q.options.map((opt, oi) => {
                const selected = answers[index] === oi;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={0}
                    onClick={() => choose(oi)}
                    onMouseEnter={hover}
                    className={`flex w-full items-center justify-between gap-4 rounded-sm border px-4 py-3.5 text-left text-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      selected
                        ? "border-accent bg-accent-soft text-ink"
                        : "border-line-strong bg-surface text-ink-2 hover:translate-x-0.5 hover:border-accent/50 hover:bg-accent-soft/50"
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <span className="spec pt-0.5 text-ink-4">
                        {LETTERS[oi]}
                      </span>
                      <span>{opt.label}</span>
                    </span>
                    <CheckIcon
                      className={`h-4 w-4 shrink-0 text-accent transition-opacity duration-200 ${
                        selected ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              {index > 0 ? (
                <Button variant="ghost" size="sm" onClick={goBack} onMouseEnter={hover}>
                  ← Back
                </Button>
              ) : (
                <span />
              )}
              <p className="text-xs text-ink-4">
                Keys 1–4 work too. Honest answers only.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* SCORING — a beat of suspense before the number lands          */}
      {/* ------------------------------------------------------------ */}
      {stage === "scoring" ? (
        <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
          <span className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-accent animate-pulse-soft"
                style={{ animationDelay: `${i * 180}ms` }}
              />
            ))}
          </span>
          <p className="mt-6 text-display-2">Scoring your system…</p>
          <p className="mt-2 text-sm text-ink-3">
            Six phases, 54 points, one honest number.
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* GATE (defensive fallback) — an entitlement always skips this;  */}
      {/* if one is ever missing, the fix is the claim, not an email.    */}
      {/* ------------------------------------------------------------ */}
      {stage === "gate" && result ? (
        <div className="mx-auto max-w-xl">
          <ScoreHeadline result={result} reduced={!!reduced} active />
          <p className="mt-5 text-center text-lead">{result.band.verdict}</p>

          <div className="mt-8 rounded-md border border-line bg-paper p-5 text-sm leading-relaxed text-ink-2">
            <span className="font-medium text-ink">
              Your weakest phase:{" "}
            </span>
            <span className="text-accent-ink font-medium">
              {result.gaps[0].label} ({result.gaps[0].percent}%)
            </span>
            . {PHASE_FIX[result.gaps[0].phase].fix}
          </div>

          <div className="mt-8 text-center">
            <h3 className="text-display-2 text-[1.25rem]">
              Keep the full report
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-3">
              The audit is a free product — claiming it into your account
              gives you the phase-by-phase report, the fix-first priority
              list, and a licence reference in your library. One claim per
              account, no card, ever.
            </p>
            <div className="mt-6">
              <Button href="/products/growth-audit" variant="accent" size="lg" arrow onMouseEnter={hover}>
                Claim your free copy
              </Button>
            </div>
            <p className="mt-5 text-xs text-ink-4">
              Takes seconds — you&rsquo;ll be brought straight back here.
            </p>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ */}
      {/* RESULTS                                                       */}
      {/* ------------------------------------------------------------ */}
      {stage === "results" && result ? (
        <Results
          result={result}
          barsShown={barsShown}
          reduced={!!reduced}
          hover={hover}
          retake={retake}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function SoundToggle({ on, toggle }: { on: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn interface sounds off" : "Turn interface sounds on"}
      title={on ? "Sound on" : "Sound off"}
      className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-sm border border-line bg-paper text-ink-3 transition-colors duration-200 hover:border-ink/25 hover:text-ink"
    >
      {on ? (
        <SoundOnIcon className="h-4 w-4" />
      ) : (
        <SoundOffIcon className="h-4 w-4" />
      )}
    </button>
  );
}

function ScoreHeadline({
  result,
  reduced,
  active,
}: {
  result: AuditResult;
  reduced: boolean;
  active: boolean;
}) {
  const shown = useCountUp(result.overall, active, reduced);
  return (
    <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2">
      <span className="text-display-hero tnum text-ink">
        {shown}
        <span className="text-3xl text-ink-4">/100</span>
      </span>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-medium ${bandClasses[result.band.key]}`}
      >
        {result.band.label}
      </span>
    </div>
  );
}

function Results({
  result,
  barsShown,
  reduced,
  hover,
  retake,
}: {
  result: AuditResult;
  barsShown: boolean;
  reduced: boolean;
  hover: () => void;
  retake: () => void;
}) {
  const weakest = result.gaps[0];
  return (
    <div className="max-w-2xl">
      <p className="text-eyebrow text-center">Your growth audit</p>
      <div className="mt-4">
        <ScoreHeadline result={result} reduced={reduced} active />
      </div>
      <p className="mt-4 text-center text-lead">{result.band.verdict}</p>

      {/* Phase bars */}
      <section aria-label="Phase scores" className="mt-10">
        <h3 className="text-display-2 text-[1.25rem]">Phase by phase</h3>
        <ul role="list" className="stagger-rise mt-5 space-y-4">
          {result.phases.map((p, i) => (
            <li key={p.phase}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink-2">
                  {p.label}
                </span>
                <span className="spec tnum text-ink-3">
                  {p.percent}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${barColor(p.percent)}`}
                  style={{
                    width: barsShown ? `${p.percent}%` : "0%",
                    transitionDelay: reduced ? "0ms" : `${i * 90}ms`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Strengths */}
      <section aria-label="Strengths" className="mt-10">
        <h3 className="text-display-2 text-[1.25rem]">What holds up</h3>
        <ul role="list" className="mt-4 space-y-2.5">
          {result.strengths.map((s) => (
            <li key={s.phase} className="flex items-start gap-3 text-sm text-ink-2">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>
                <span className="font-medium text-ink">{s.label}</span>{" "}
                ({s.percent}%) — holding up. Keep the cadence.
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Fix-first list */}
      <section aria-label="Fix first" className="mt-10">
        <h3 className="text-display-2 text-[1.25rem]">Fix first</h3>
        <ul role="list" className="stagger-rise mt-5 space-y-4">
          {result.gaps.map((g) => {
            const fix = PHASE_FIX[g.phase];
            return (
              <li key={g.phase} className="rounded-sm border border-line bg-paper p-5">
                <p className="spec text-ink-4">
                  {g.label} · {g.percent}%
                </p>
                <h4 className="text-display-2 mt-2 text-[1.125rem]">
                  {fix.headline}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                  {fix.fix}
                </p>
                <p className="spec mt-3 text-ink-4">
                  Covered by: {fix.modules.join(" · ")}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* The one change */}
      <section
        aria-label="The one change this week"
        className="mt-10 rounded-md border border-accent/30 bg-accent-soft/60 p-6"
      >
        <p className="text-eyebrow text-accent-ink">The one change this week</p>
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink">
          Before anything else: write down{" "}
          {PHASE_FIRST_ACTION[weakest.phase]}
        </p>
        <p className="mt-2 text-sm text-ink-2">
          It takes twenty minutes and it&rsquo;s worth more than reading
          another post about growth.
        </p>
      </section>

      {/* Product CTA */}
      <section aria-label="The Client Growth System" className="mt-10">
        <div className="rounded-md bg-ink p-7 text-paper sm:p-8">
          <p className="spec text-paper/60">The complete system</p>
          <h3 className="text-display-2 mt-3 text-paper">
            Fix all six phases with the Client Growth System
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-paper/75">
            Every module named in your report lives in one connected system —
            twelve modules across the same six phases you just scored.
            One-time purchase, instant digital delivery, every future
            revision included.
          </p>
          <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <span className="text-3xl font-medium tnum text-paper">
              {formatPrice(FOUNDING_PRICE)}
            </span>
            <span className="text-sm line-through tnum text-paper/40">
              {formatPrice(REGULAR_PRICE)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-paper/25 px-3 py-1 text-xs">
              <SparkIcon className="h-3 w-3" />
              Founding price
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button
              href="/products/client-growth-system"
              size="lg"
              arrow
              onMouseEnter={hover}
              className="bg-paper text-ink hover:bg-accent-soft active:bg-accent-soft"
            >
              See the Client Growth System
            </Button>
            <Link
              href="/account/library/growth-audit"
              className="text-xs text-paper/70 underline-offset-4 hover:text-paper hover:underline"
            >
              View it in your library — licence included →
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button variant="outline" size="sm" onClick={retake} onMouseEnter={hover}>
          Retake the audit
        </Button>
        <Link
          href="/resources"
          className="text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          Back to resources
        </Link>
      </div>
    </div>
  );
}
