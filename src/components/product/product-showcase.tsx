"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, PlayIcon } from "@/components/ui/icons";

/**
 * ProductShowcase — the hero's product visual.
 *
 * Cycles through REAL screenshots of the running Client Growth System
 * (captured from the live demo) with a gentle cross-fade, scene tabs, and a
 * progress bar. A sharper, lighter, fully-responsive alternative to a GIF.
 * Below it, a "Try the live demo" CTA sends visitors straight into the
 * interactive product — the strongest no-install conversion path for a
 * no-trial desktop app.
 *
 * Reduced-motion users get a single static frame with the demo CTA.
 */

const SCENE_MS = 3800;
const EASE = [0.16, 1, 0.3, 1] as const;

/** Presentation-style slide/fade/scale, driven by travel direction. */
const STAGE_VARIANTS = {
  enter: (d: number) => ({ opacity: 0, scale: 1.06, x: d * 52 }),
  center: { opacity: 1, scale: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, scale: 0.97, x: d * -52 }),
};

const SCENES = [
  { id: "dashboard", label: "Dashboard", caption: "One dashboard — what to work on right now", src: "/product/01-dashboard.png" },
  { id: "pipeline", label: "Pipeline", caption: "Drag deals across stages — value per stage, live", src: "/product/02-pipeline.png" },
  { id: "deal", label: "Deal record", caption: "Every deal: next action, proposals, notes, history", src: "/product/03-deal.png" },
  { id: "outreach", label: "Outreach", caption: "Your outreach log — who to contact, when to follow up", src: "/product/04-outreach.png" },
  { id: "contact", label: "Contact detail", caption: "Relationship history and a next step for every contact", src: "/product/05-contact.png" },
  { id: "reviews", label: "Growth", caption: "Growth reviews to grow revenue from clients you already have", src: "/product/06-reviews.png" },
];

export function ProductShowcase({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  // Move to a scene, setting slide direction by travel direction.
  const goTo = (next: number) => {
    setDir(next > index ? 1 : next < index ? -1 : dir);
    setIndex(next);
  };

  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => {
      setDir(1);
      setIndex((i) => (i + 1) % SCENES.length);
    }, SCENE_MS);
    return () => window.clearInterval(t);
  }, [reduced]);

  const active = SCENES[index];

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-md">
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="spec truncate text-ink-4">Client Growth System</span>
        </div>

        {/* image stage */}
        <div className="relative aspect-[3000/1577] w-full overflow-hidden bg-paper">
          {reduced ? (
            <Image src={SCENES[0].src} alt="Client Growth System dashboard" fill sizes="(max-width:1024px) 100vw, 1000px" className="object-cover object-left-top" priority />
          ) : (
            <AnimatePresence initial={false} custom={dir}>
              <motion.div
                key={active.id}
                className="absolute inset-0"
                custom={dir}
                variants={STAGE_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.72, ease: EASE }}
              >
                <Image src={active.src} alt={active.caption} fill sizes="(max-width:1024px) 100vw, 1000px" className="object-cover object-left-top" priority={index === 0} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* caption + tabs + progress */}
        <div className="relative border-t border-line bg-paper px-4 py-2.5">
          <div className="mb-2 min-h-[1.25rem]">
            {reduced ? (
              <p className="truncate text-center text-xs text-ink-3">{active.caption}</p>
            ) : (
              <AnimatePresence mode="wait">
                <motion.p
                  key={active.id}
                  className="truncate text-center text-xs text-ink-3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.34, ease: EASE }}
                >
                  {active.caption}
                </motion.p>
              </AnimatePresence>
            )}
          </div>
          <div className="flex items-center gap-1">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show ${s.label}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
                className="relative flex-1 overflow-hidden rounded-xs py-1.5 text-[0.625rem] text-ink-3 transition-colors hover:text-ink"
              >
                {i === index ? <motion.span layoutId="showcase-tab" transition={{ duration: 0.4, ease: EASE }} className="absolute inset-0 -z-10 rounded-xs bg-accent-soft" /> : null}
                <span className={i === index ? "font-medium text-accent-ink" : ""}>{s.label}</span>
              </button>
            ))}
            <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
              {reduced ? null : (
                <motion.span
                  key={active.id}
                  className="block h-full bg-accent/50"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: SCENE_MS / 1000, ease: "linear" }}
                />
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Link
          href="/demo/client-growth-system"
          className="group inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-4 py-2 text-xs font-medium text-accent-ink transition-colors hover:bg-accent hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <PlayIcon className="h-3.5 w-3.5" />
          Try the live demo
        </Link>
        <Link
          href="/products/client-growth-system"
          className="group inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-ink-3 transition-colors hover:text-accent-ink"
        >
          See full details
          <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
