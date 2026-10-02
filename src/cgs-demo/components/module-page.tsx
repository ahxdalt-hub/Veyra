"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { MODULES, MODULE_ORDER, ModuleId } from "@/cgs-demo/lib/stages";
import { useBuildProgress, useStore } from "@/cgs-demo/lib/store";
import { BlockCard } from "@/cgs-demo/components/fields";
import { Button, Reveal, SectionTitle, StatusBadge } from "@/cgs-demo/components/ui";

function nextOf(id: ModuleId): ModuleId | null {
  const i = MODULE_ORDER.indexOf(id);
  return i >= 0 && i < MODULE_ORDER.length - 1 ? MODULE_ORDER[i + 1] : null;
}

export default function ModulePage({ moduleId }: { moduleId: ModuleId }) {
  const meta = MODULES[moduleId];
  const { data, completeModule, reopenModule, setLastModule } = useStore();
  const { modules } = useBuildProgress();
  const progress = modules.find((m) => m.id === moduleId)!;
  const moduleData = data.modules[moduleId];

  const [showErrors, setShowErrors] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Route changes remount this component per module, so local state resets with it.
  useEffect(() => {
    setLastModule(moduleId);
    topRef.current?.scrollIntoView({ block: "start" });
  }, [moduleId, setLastModule]);

  const isComplete = progress.status === "complete";
  const needsReview = progress.status === "needs-review";
  const next = nextOf(moduleId);

  // Shared context from earlier modules, shown as a quiet header line.
  const foundationName = data.modules.foundation.fields.name;
  const contextLine = useMemo(() => {
    if (moduleId === "positioning" && foundationName)
      return `Positioning for ${foundationName}.`;
    if (moduleId === "offer") {
      const p = data.modules.positioning.fields.why;
      return typeof p === "string" && p ? `The offer that proves your positioning claim.` : null;
    }
    if (moduleId === "ideal-client") {
      const t = data.modules.positioning.fields.target;
      return typeof t === "string" && t
        ? `Profiled from who you already serve: “${t}”.`
        : null;
    }
    return null;
  }, [moduleId, foundationName, data]);

  const attemptComplete = () => {
    if (progress.missing.length > 0) {
      setShowErrors(true);
      setFlash(`${progress.missing.length} required item${progress.missing.length === 1 ? "" : "s"} still empty.`);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => setFlash(null), 2600);
      return;
    }
    completeModule(moduleId);
    setJustCompleted(true);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-[860px] px-6 py-7 md:px-9" ref={topRef}>
      {/* Header */}
      <Reveal>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
              <Link href="/build" className="hover:text-cgs-muted transition-colors">
                Build
              </Link>
              <span aria-hidden>·</span>
              <span className="tabular-nums">Step {meta.step} of 4</span>
            </div>
            <h2 className="mt-1.5 font-cgs-display text-[27px] font-semibold leading-tight text-cgs-ink">{meta.title}</h2>
            <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-cgs-ink-soft">{meta.intro}</p>
            {contextLine && <p className="mt-2 text-[12.5px] italic text-cgs-muted">{contextLine}</p>}
          </div>
          <StatusBadge status={progress.status} className="mt-1" />
        </div>
      </Reveal>

      {/* Why it matters */}
      <Reveal delay={0.05}>
        <div className="mt-6 rounded-xl border border-cgs-line bg-cgs-inset/50 px-5 py-4">
          <SectionTitle>What completing this unlocks</SectionTitle>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-1">
            {meta.unlocks.map((u) => (
              <li key={u} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-cgs-ink-soft">
                <svg width="13" height="13" viewBox="0 0 16 16" className="mt-1 shrink-0 text-cgs-accent" aria-hidden>
                  <path d="M2 8h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {u}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* Blocks */}
      <div className="mt-6 space-y-5">
        {meta.blocks.map((block, i) => (
          <Reveal key={block.id} delay={0.08 + i * 0.03}>
            <BlockCard moduleId={moduleId} block={block} data={moduleData} showErrors={showErrors} />
          </Reveal>
        ))}
      </div>

      {/* Sticky completion bar */}
      <div className="sticky bottom-0 z-20 -mx-6 mt-7 border-t border-cgs-line bg-cgs-surface/90 px-6 py-3.5 backdrop-blur-sm md:-mx-9 md:px-9">
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-cgs-ink px-3.5 py-1.5 text-[12.5px] font-medium text-cgs-canvas shadow-cgs-pop"
              role="status"
            >
              {flash}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <motion.div
              key={progress.status + justCompleted}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
                <div className="text-[13px] font-medium text-cgs-ink">
                  {isComplete
                    ? "Module complete"
                    : needsReview
                      ? "Needs refinement"
                      : progress.filled === 0
                        ? "Not started"
                        : `${progress.filled} of ${progress.total} required items done`}
                </div>
                <div className="text-[12px] text-cgs-muted">
                  {isComplete
                    ? "Your work here feeds every later stage."
                    : needsReview
                      ? `Missing: ${progress.missing.slice(0, 3).join(", ")}${progress.missing.length > 3 ? "…" : ""}.`
                      : progress.missing.length > 0
                        ? `Still required: ${progress.missing.slice(0, 3).join(", ")}${progress.missing.length > 3 ? "…" : ""}`
                        : "Everything required is filled."}
                </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-2.5">
            {isComplete && !justCompleted ? (
              <Button variant="secondary" size="sm" onClick={() => reopenModule(moduleId)}>
                Reopen to edit
              </Button>
            ) : (
              !isComplete && (
                <Button
                  variant="primary"
                  onClick={attemptComplete}
                  aria-disabled={progress.missing.length > 0 || undefined}
                  className={progress.missing.length > 0 ? "opacity-60" : undefined}
                >
                  Mark module complete
                </Button>
              )
            )}
            {next && (
              <Link href={MODULES[next].href}>
                <Button variant="ghost" size="sm">
                  Next: {MODULES[next].title}
                  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
                    <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Completion celebration */}
      <AnimatePresence>
        {justCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-cgs-ink/25 p-6"
            onClick={() => setJustCompleted(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Module complete"
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-cgs-line bg-cgs-surface p-7 shadow-cgs-pop"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cgs-complete-soft text-cgs-complete">
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-cgs-display text-[19px] font-semibold text-cgs-ink">{meta.title} is complete</h3>
                  <p className="text-[12.5px] text-cgs-muted">Saved locally. You can reopen it any time.</p>
                </div>
              </div>
              <p className="mt-4 text-[13.5px] leading-relaxed text-cgs-ink-soft">
                {next
                  ? `Next, ${MODULES[next].title.toLowerCase()} builds directly on what you just wrote:`
                  : `BUILD is complete. Acquire reads this foundation directly — start with your acquisition strategy:`}
              </p>
              <ul className="mt-2 space-y-1.5">
                {meta.unlocks.map((u) => (
                  <li key={u} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-cgs-ink-soft">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cgs-accent/60" aria-hidden />
                    {u}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex justify-end gap-2.5">
                <Button variant="ghost" onClick={() => setJustCompleted(false)}>
                  Stay here
                </Button>
                {next ? (
                  <Link href={MODULES[next].href} onClick={() => setJustCompleted(false)}>
                    <Button variant="primary">Go to {MODULES[next].title}</Button>
                  </Link>
                ) : (
                  <Link href="/acquire/strategy" onClick={() => setJustCompleted(false)}>
                    <Button variant="primary">Open Acquisition Strategy</Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

