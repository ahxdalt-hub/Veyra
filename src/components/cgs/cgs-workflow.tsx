"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMotionPreference } from "@/components/motion/reveal";
import { Reveal } from "@/components/motion/reveal";
import type { Phase } from "@/lib/products";

/**
 * CgsWorkflow — the six connected stages.
 *
 * A single rail shows the whole journey at a glance; selecting a stage
 * opens its detail panel beneath. The rail is deliberately one connected
 * sequence — numbered nodes, hairline connectors, and a handoff line
 * between stages — so the six stages read as one system passing work
 * along, never as six unrelated products.
 *
 * Stage content arrives as props resolved from the catalog. Keyboard use
 * is native (buttons); motion follows prefers-reduced-motion.
 */

export type CgsStage = {
  phase: Phase;
  n: string;
  label: string;
  headline: string;
  detail: string;
  modules: { name: string; purpose: string }[];
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** What each stage hands to the next — the connective tissue of the system. */
export const STAGE_HANDOFFS: Record<Exclude<Phase, "grow">, string> = {
  build: "Positioning and the ideal-client profile decide exactly who you reach out to.",
  acquire: "Every live conversation carries its context forward into the sales process.",
  sell: "A signed proposal becomes an onboarding sequence — nothing is re-explained.",
  deliver: "The running engagement becomes the active client that retention watches.",
  retain: "Delivery and retention history feed the growth review’s next steps.",
};

export function CgsWorkflow({
  stages,
  id = "workflow",
}: {
  stages: CgsStage[];
  id?: string;
}) {
  const [selected, setSelected] = useState(0);
  const stage = stages[selected];
  const reduced = useMotionPreference();
  const next = stages[selected + 1];

  return (
    <section
      id={id}
      className="scroll-mt-24 border-b border-line bg-surface"
      aria-labelledby="workflow-heading"
    >
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <p className="text-eyebrow mb-4">The system</p>
          <h2 id="workflow-heading" className="text-display-1 max-w-3xl">
            One connected system.{" "}
            <span className="em-serif">Six stages of growth.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-lead">
            Build → Acquire → Sell → Deliver → Retain → Grow. Not six
            separate tools — one journey where the output of each stage
            becomes the input of the next. Select a stage to see what
            happens inside it.
          </p>
        </Reveal>

        {/* The rail — one connected sequence */}
        <Reveal delay={0.1}>
          <ol className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            {stages.map((s, i) => {
              const active = i === selected;
              return (
                <li key={s.phase} className="bg-surface">
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-pressed={active}
                    className={`group flex h-full w-full flex-col items-start gap-2 px-4 py-5 text-left transition-colors duration-200 ${
                      active
                        ? "bg-accent-soft/70"
                        : "hover:bg-accent-soft/30"
                    }`}
                  >
                    <span
                      className={`spec tnum ${
                        active ? "text-accent" : "text-ink-4"
                      }`}
                    >
                      {s.n}
                    </span>
                    <span
                      className={`font-display text-[1.0625rem] italic leading-none ${
                        active ? "text-accent-ink" : "text-ink"
                      }`}
                    >
                      {s.label}
                    </span>
                    {/* Connector — a gradient line with an arrowhead, so
                        each stage visibly feeds the next. The active
                        stage's connector carries a quiet travelling dot:
                        the one place the rail shows motion. The final
                        stage ends on a ringed amber diamond — a finish
                        mark, not another arrow. */}
                    <span className="mt-auto flex items-center" aria-hidden="true">
                      {i < stages.length - 1 ? (
                        <span
                          className={`relative flex h-3 w-9 items-center transition-opacity duration-200 ${
                            active ? "opacity-100" : "opacity-60"
                          }`}
                        >
                          <span
                            className={`h-px flex-1 bg-gradient-to-r ${
                              active
                                ? "from-accent/10 to-accent/70"
                                : "from-line to-line-strong"
                            }`}
                          />
                          <span
                            className={`-ml-1 h-1.5 w-1.5 rotate-45 border-t border-r transition-colors duration-200 ${
                              active ? "border-accent/80" : "border-line-strong"
                            }`}
                          />
                          {active && !reduced ? (
                            <motion.span
                              className="absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-accent"
                              initial={{ left: "0%", opacity: 0 }}
                              animate={{
                                left: ["0%", "100%"],
                                opacity: [0, 1, 1, 0],
                              }}
                              transition={{
                                duration: 2.4,
                                repeat: Infinity,
                                ease: "easeInOut",
                                times: [0, 0.2, 0.8, 1],
                              }}
                            />
                          ) : null}
                        </span>
                      ) : (
                        <span className="relative flex h-3 w-9 items-center justify-center">
                          <AnimatePresence>
                            {active && !reduced ? (
                              <motion.span
                                className="absolute h-2 w-2 rounded-full border border-amber/40"
                                initial={{ scale: 0.4, opacity: 0.8 }}
                                animate={{ scale: 1.9, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                              />
                            ) : null}
                          </AnimatePresence>
                          <span
                            className={`h-2 w-2 rotate-45 border transition-colors duration-200 ${
                              active
                                ? "border-amber bg-amber"
                                : "border-line-strong bg-paper"
                            }`}
                          />
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Reveal>

        {/* The open stage — detail + handoff */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={stage.phase}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: EASE }}
              role="region"
              aria-label={`Stage ${stage.n}: ${stage.label}`}
            >
              <p className="spec text-ink-4">
                Stage {stage.n} of {String(stages.length).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-display-2">
                {stage.headline}
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-2 sm:text-[0.9375rem]">
                {stage.detail}
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {stage.modules.map((m) => (
                  <li
                    key={m.name}
                    className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink-2"
                    title={m.purpose}
                  >
                    {m.name}
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          {/* The handoff — how work moves to the next stage */}
          <div className="min-w-0 border-t border-line pt-8 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-1">
            {next ? (
              <p className="text-sm leading-relaxed text-ink-2">
                <span className="spec block text-accent">
                  Carried into {next.label}
                </span>
                <span className="mt-3 block max-w-sm leading-relaxed">
                  {handoffFor(stage.phase)}
                </span>
                <span className="mt-4 inline-flex items-center gap-2 text-xs text-ink-3">
                  <button
                    type="button"
                    onClick={() => setSelected(selected + 1)}
                    className="font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Follow the thread to {next.label} →
                  </button>
                </span>
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-ink-2">
                <span className="spec block text-accent">The whole loop</span>
                <span className="mt-3 block max-w-sm leading-relaxed">
                  Growth review decides what to repeat and what to scale —
                  and the decisions feed back into your positioning, so the
                  system keeps sharpening itself.
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function handoffFor(phase: Phase): ReactNode {
  return STAGE_HANDOFFS[phase as Exclude<Phase, "grow">];
}
