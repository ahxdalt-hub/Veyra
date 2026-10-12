"use client";

import { useEffect, useRef, useState } from "react";
import { CountUp } from "@/components/admin/metric";
import type { LivePresence } from "@/lib/presence";

/**
 * LiveVisitors — the "LIVE NOW" box at the top of the Command Center.
 *
 * Answers the one question the dashboard never used to: is anyone on the
 * site right now? The number is real visitors — distinct anonymous sessions
 * whose heartbeat landed in the last 60 seconds (see src/lib/presence.ts).
 *
 * The Overview already polls /api/admin/live every ~10s and threads `presence`
 * through, so this box simply re-renders as each new figure arrives; it keeps
 * a short rolling history to draw the sparkline, so the shape shows the trend
 * across the last couple of minutes at a glance. CountUp re-eases the numeral
 * whenever it moves, matching every other figure on the page.
 *
 * Honest by default: when presence is unavailable (no Supabase on this
 * deployment, or a read error) it shows "—" with a quiet note — never a
 * fabricated count.
 */

const SPARK_MAX = 24; // ~4 minutes at the 10s poll cadence

export function LiveVisitors({
  presence,
  live,
}: {
  presence: LivePresence | null;
  /** True once at least one live sync has landed (drives the pulse color). */
  live: boolean;
}) {
  const now = presence?.now ?? null;
  const last5m = presence?.last5m ?? null;

  // Rolling history of the "now" figure for the sparkline. Kept in a ref +
  // state pair so repeated identical values still advance the series.
  const [spark, setSpark] = useState<number[]>([]);
  const lastPushed = useRef<number | null>(null);

  useEffect(() => {
    if (now === null) return;
    if (lastPushed.current === now) return;
    lastPushed.current = now;
    setSpark((prev) => [...prev, now].slice(-SPARK_MAX));
  }, [now]);

  const active = now !== null && now > 0;

  return (
    <section
      className="relative overflow-hidden rounded-md border"
      style={{
        borderColor: "var(--cc-line)",
        background:
          "linear-gradient(180deg, var(--cc-accent-dim) 0%, var(--cc-bg-2) 62%)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-6 p-5">
        {/* Left — the number */}
        <div className="flex items-center gap-4">
          <PulsingOrb active={active} live={live} />
          <div>
            <p className="cc-label flex items-center gap-2" style={{ color: "var(--cc-text-3)" }}>
              Viewing the site now
              {live ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    color: active ? "var(--cc-success)" : "var(--cc-text-4)",
                    backgroundColor: active ? "var(--cc-success-dim)" : "transparent",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: active ? "var(--cc-success)" : "var(--cc-text-4)" }}
                  />
                  Live
                </span>
              ) : null}
            </p>
            <p
              className="cc-figure mt-1 text-[40px] font-semibold leading-none tnum"
              style={{ color: "var(--cc-text)" }}
            >
              {now === null ? (
                <span style={{ color: "var(--cc-text-4)" }}>—</span>
              ) : (
                <CountUp value={now} kind="number" />
              )}
            </p>
            <p className="mt-1.5 text-xs tnum" style={{ color: "var(--cc-text-4)" }}>
              {now === null
                ? "Presence unavailable — connect Supabase to see live visitors."
                : now === 1
                  ? "1 visitor on the site in the last minute"
                  : `${now} visitors on the site in the last minute`}
              {last5m !== null ? ` · ${last5m} in the last 5 min` : ""}
            </p>
          </div>
        </div>

        {/* Right — trend */}
        <div className="flex min-w-[160px] flex-1 flex-col items-end gap-1 sm:max-w-[280px]">
          <span className="cc-label" style={{ color: "var(--cc-text-4)" }}>
            Last few minutes
          </span>
          <Sparkline values={spark} active={active} />
        </div>
      </div>
    </section>
  );
}

/** A breathing dot: solid calm when idle/live-off, a soft pulse when live
 *  traffic is present. Colors come from the command-center tokens. */
function PulsingOrb({ active, live }: { active: boolean; live: boolean }) {
  const color = !live ? "var(--cc-text-4)" : active ? "var(--cc-success)" : "var(--cc-warning)";
  return (
    <span aria-hidden="true" className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center">
      {live && active ? (
        <span
          className="cc-live-pulse absolute inset-0 rounded-full"
          style={{ backgroundColor: color, opacity: 0.35 }}
        />
      ) : null}
      <span
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--cc-surface-2)", border: "1px solid var(--cc-line-strong)" }}
      >
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      </span>
    </span>
  );
}

/** Minimal area sparkline — no axis, no library; just the shape of recent
 *  activity. Draws a flat baseline until there are at least two points. */
function Sparkline({ values, active }: { values: number[]; active: boolean }) {
  const w = 240;
  const h = 44;
  const pad = 3;

  if (values.length < 2) {
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          stroke="var(--cc-line-strong)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  const stepX = (w - pad * 2) / (values.length - 1);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);

  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(pad + i * stepX).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${(pad + (values.length - 1) * stepX).toFixed(1)},${h - pad} L${pad},${h - pad} Z`;

  const stroke = active ? "var(--cc-success)" : "var(--cc-info)";

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={stroke} opacity="0.12" />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

