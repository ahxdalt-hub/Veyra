"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * CountUp — mounts once, eases to the value; re-animates (quietly) when
 * the value changes after a range switch. Big dashboard numerals are the
 * typographic focus of the command center, so this gets its own piece.
 *
 * `kind` (not a format function) is the server→client contract: server
 * components can't serialize closures, so formatting is chosen by name.
 */
export function CountUp({
  value,
  kind = "money",
  durationMs = 900,
}: {
  value: number;
  kind?: "money" | "number" | "percent";
  durationMs?: number;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    // Reduced motion renders the target directly (see below) — skip the
    // animation entirely so the effect only ever touches DOM timers.
    if (reduced) return;
    const from = fromRef.current;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 4); // ease-out quart — settles fast, no bounce
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else {
        setDisplay(value);
        fromRef.current = value;
      }
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      fromRef.current = value;
    };
  }, [value, durationMs, reduced]);

  return <>{render(kind, reduced ? value : display)}</>;
}

const moneyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function render(kind: "money" | "number" | "percent", v: number): string {
  if (kind === "money") return moneyFmt.format(Math.round(v) / 100);
  if (kind === "percent") return `${Math.round(v)}%`;
  return new Intl.NumberFormat("en-US").format(Math.round(v));
}

/**
 * MetricFigure — a labelled big number. `context` renders as small
 * supporting text (e.g. "of $1,204 total"), never as invented growth.
 */
export function MetricFigure({
  label,
  value,
  kind = "money",
  context,
  highlight = false,
  fallback,
}: {
  label: string;
  value: number | null;
  kind?: "money" | "number" | "percent";
  context?: string;
  highlight?: boolean;
  /** Rendered instead of the figure when value is null (never invented). */
  fallback?: string;
}) {
  return (
    <div className="animate-figure-in">
      <p className="cc-label" style={{ color: "var(--cc-text-4)" }}>
        {label}
      </p>
      <p
        className="cc-figure mt-2 text-[26px] font-medium"
        style={{ color: highlight ? "var(--cc-text)" : "var(--cc-text-2)" }}
      >
        {value === null ? (
          fallback ?? "—"
        ) : (
          <CountUp value={value} kind={kind} />
        )}
      </p>
      {context ? (
        <p className="mt-1.5 text-xs tnum" style={{ color: "var(--cc-text-4)" }}>
          {context}
        </p>
      ) : null}
    </div>
  );
}
