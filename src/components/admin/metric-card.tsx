"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { formatMinorAmount } from "./admin-ui";

/**
 * AnimatedNumber — counts up to its value on first view. The count is
 * driven entirely by rAF, so no setState happens in the effect body.
 * Reduced-motion renders the final value immediately (first frame).
 *
 * `format` is a serializable preset NAME, not a function — Server
 * Components cannot pass functions to client components, and every
 * metric in the command center is either money (USD) or a count.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export type NumberFormat = "money" | "integer" | "percent";

function formatValue(preset: NumberFormat, v: number): string {
  switch (preset) {
    case "money":
      return formatMinorAmount(Math.round(v));
    case "percent":
      return `${v >= 0 ? "" : "−"}${Math.abs(v).toFixed(1)}%`;
    default:
      return Math.round(v).toLocaleString("en-US");
  }
}

export function AnimatedNumber({
  value,
  format,
  duration = 900,
}: {
  value: number;
  format: NumberFormat;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = reduced
        ? 1
        : Math.min(1, (now - start) / duration);
      // expo-out
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className="tnum">
      {formatValue(format, display)}
    </span>
  );
}

/**
 * MetricCard — one KPI. The hierarchy comes from size and placement,
 * not decoration: revenue leads, the rest follow in a tighter grid.
 */
export function MetricCard({
  label,
  value,
  format,
  sub,
  accent = false,
  delay = 0,
}: {
  label: string;
  value: number;
  format: NumberFormat;
  sub?: string;
  accent?: boolean;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`cc-edge rounded-md border p-5 ${
        accent
          ? "border-cc-accent/30 bg-cc-panel-2"
          : "border-cc-line bg-cc-panel"
      }`}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <p className="spec text-cc-text-4">{label}</p>
      <p
        className={`mt-2 font-display font-medium tracking-[-0.02em] ${
          accent ? "text-[2rem] text-cc-accent" : "text-[1.5rem] text-cc-text"
        }`}
      >
        <AnimatedNumber value={value} format={format} />
      </p>
      {sub ? <p className="mt-1.5 text-xs text-cc-text-3">{sub}</p> : null}
    </motion.div>
  );
}
