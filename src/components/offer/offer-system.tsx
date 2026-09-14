"use client";

import { Fragment, useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon } from "@/components/ui/icons";
import { useMotionPreference } from "@/components/motion/reveal";

/**
 * OfferSystem — the six-stage journey as one connected operating system.
 *
 * A rail of six stations (BUILD → ACQUIRE → SELL → DELIVER → RETAIN →
 * GROW) joined by a hairline track; selecting a station reveals what
 * happens inside it, including the modules that live there. The reveal
 * runs once; stage changes crossfade quietly. Reduced motion: everything
 * is static and instant (swapped post-hydration — see
 * useMotionPreference). All content comes from the catalog via props.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export type OfferStage = {
  phase: string;
  n: string;
  label: string;
  blurb: string;
  headline: string;
  detail: string;
  modules: { name: string; purpose: string }[];
};

export function OfferSystem({ stages }: { stages: OfferStage[] }) {
  const [active, setActive] = useState(0);
  const reduced = useMotionPreference();
  const baseId = useId();
  const stage = stages[active];

  return (
    <div>
      {/* ---------------------------------------------------------- */}
      {/* The connected rail                                          */}
      {/* ---------------------------------------------------------- */}
      {reduced ? (
        <div
          role="group"
          aria-label="The six stages of the Client Growth System"
        >
          <RailStations
            stages={stages}
            active={active}
            reduced
            onSelect={setActive}
            baseId={baseId}
          />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px 0px" }}
          transition={{ duration: 0.5 }}
          role="group"
          aria-label="The six stages of the Client Growth System"
        >
          <RailStations
            stages={stages}
            active={active}
            reduced={false}
            onSelect={setActive}
            baseId={baseId}
          />
        </motion.div>
      )}
      {/* ---------------------------------------------------------- */}
      {/* The selected stage                                          */}
      {/* ---------------------------------------------------------- */}
      <div
        id={`${baseId}-panel`}
        role="region"
        aria-live="polite"
        aria-labelledby={`${baseId}-stage-heading`}
        className="mt-10 rounded-lg border border-line bg-surface shadow-sm lg:mt-12"
      >
        {reduced ? (
          <StageContent stage={stage} baseId={baseId} />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stage.phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.26, ease: EASE }}
              className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10"
            >
              <StageInner stage={stage} baseId={baseId} />
            </motion.div>
          </AnimatePresence>
        )}

        {/* Connection note — the system stays one system */}
        <div className="border-t border-line bg-paper px-6 py-3.5 sm:px-8 lg:px-10">
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
            <span className="spec text-ink-4">
              Stage {stage.n} of {stages.length}
            </span>
            <span aria-hidden="true">·</span>
            {active < stages.length - 1 ? (
              <>
                Next: {stages[active + 1].label} — the output of this stage is
                its input.
              </>
            ) : (
              <>The journey closes here — and restarts at a higher level on
              the next review.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rail stations — desktop track + mobile grid, shared by both paths   */
/* ------------------------------------------------------------------ */

function RailStations({
  stages,
  active,
  reduced,
  onSelect,
  baseId,
}: {
  stages: OfferStage[];
  active: number;
  reduced: boolean;
  onSelect: (i: number) => void;
  baseId: string;
}) {
  return (
    <>
      {/* Desktop — stations on a drawn hairline track */}
      <div className="relative hidden lg:block">
        {reduced ? (
          <div
            aria-hidden="true"
            className="absolute left-[3rem] right-[3rem] top-[21px] h-px origin-left bg-line-strong"
          />
        ) : (
          <motion.div
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-60px 0px" }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            className="absolute left-[3rem] right-[3rem] top-[21px] h-px origin-left bg-line-strong"
          />
        )}
        <div className="flex items-start">
          {stages.map((s, i) => {
            const selected = i === active;
            return (
              <Fragment key={s.phase}>
                {i > 0 && (
                  <div aria-hidden="true" className="mt-[13px] flex-1">
                    <span className="relative mx-2 block h-px bg-transparent">
                      <ArrowRightIcon className="absolute -top-[5px] right-0 h-2.5 w-2.5 bg-surface text-ink-4" />
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-pressed={selected}
                  aria-controls={`${baseId}-panel`}
                  className="group flex w-[6.5rem] flex-col items-center gap-2.5 text-center"
                >
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full border shadow-xs transition-all duration-300 ease-out ${
                      selected
                        ? "border-accent bg-accent text-white"
                        : "border-line-strong bg-surface text-ink-3 group-hover:border-accent/50 group-hover:text-accent"
                    }`}
                  >
                    <span className="spec tnum">{s.n}</span>
                  </span>
                  <span
                    className={`spec transition-colors duration-200 ${
                      selected
                        ? "text-accent-ink"
                        : "text-ink-4 group-hover:text-ink-2"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile / tablet — compact station grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 lg:hidden">
        {stages.map((s, i) => {
          const selected = i === active;
          return (
            <button
              key={s.phase}
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={selected}
              aria-controls={`${baseId}-panel`}
              className={`flex flex-col items-center gap-1.5 rounded-sm border px-2 py-3 transition-colors duration-200 ${
                selected
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line bg-surface text-ink-3"
              }`}
            >
              <span className={`spec tnum ${selected ? "text-accent" : "text-ink-4"}`}>
                {s.n}
              </span>
              <span className="text-xs font-medium">{s.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Stage content                                                       */
/* ------------------------------------------------------------------ */

function StageInner({ stage, baseId }: { stage: OfferStage; baseId: string }) {
  return (
    <>
      {/* What happens inside */}
      <div>
        <p className="spec text-accent">
          Stage {stage.n} — {stage.label}
        </p>
        <h3 id={`${baseId}-stage-heading`} className="mt-3 text-display-2">
          {stage.headline}
        </h3>
        <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-ink-2">
          {stage.detail}
        </p>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-3">
          {stage.blurb}
        </p>
      </div>

      {/* The modules that live here */}
      <div>
        <p className="spec text-ink-4">
          Inside this stage — {stage.modules.length}{" "}
          {stage.modules.length === 1 ? "module" : "modules"}
        </p>
        <ul className="mt-3 divide-y divide-line/70 border-t border-line">
          {stage.modules.map((m) => (
            <li key={m.name} className="py-3.5">
              <p className="text-[0.9375rem] font-medium text-ink">{m.name}</p>
              <p className="mt-0.5 text-sm text-ink-3">{m.purpose}</p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function StageContent({ stage, baseId }: { stage: OfferStage; baseId: string }) {
  return (
    <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
      <StageInner stage={stage} baseId={baseId} />
    </div>
  );
}
