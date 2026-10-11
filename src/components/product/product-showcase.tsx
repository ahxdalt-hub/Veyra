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

const SCENE_MS = 4200;
const EASE = [0.16, 1, 0.3, 1] as const;

const SCENES = [
  { id: "journey", label: "Dashboard", caption: "One dashboard — what to work on right now", src: "/product/demo-journey.png" },
  { id: "pipeline", label: "Pipeline", caption: "Drag deals across stages — value per stage, live", src: "/product/demo-sell.png" },
  { id: "outreach", label: "Outreach", caption: "Your outreach log — who to contact, when to follow up", src: "/product/demo-acquire.png" },
  { id: "delivery", label: "Delivery", caption: "Repeatable onboarding checklist for every client", src: "/product/demo-deliver.png" },
];

export function ProductShowcase({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % SCENES.length), SCENE_MS);
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
        <div className="relative aspect-[1280/712] w-full bg-paper">
          {reduced ? (
            <Image src={SCENES[0].src} alt="Client Growth System dashboard" fill sizes="(max-width:1024px) 100vw, 1000px" className="object-cover object-left-top" priority />
          ) : (
            <AnimatePresence initial={false}>
              <motion.div
                key={active.id}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <Image src={active.src} alt={active.caption} fill sizes="(max-width:1024px) 100vw, 1000px" className="object-cover object-left-top" priority={index === 0} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* caption + tabs + progress */}
        <div className="relative border-t border-line bg-paper px-4 py-2.5">
          <p className="mb-2 truncate text-center text-xs text-ink-3">{active.caption}</p>
          <div className="flex items-center gap-1">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Show ${s.label}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className="relative flex-1 overflow-hidden rounded-xs py-1.5 text-[0.625rem] text-ink-3 transition-colors hover:text-ink"
              >
                {i === index ? <span className="absolute inset-0 -z-10 bg-accent-soft" /> : null}
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
