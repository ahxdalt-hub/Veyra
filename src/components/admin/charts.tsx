"use client";

import { useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * RevenueChart — a hand-built SVG line/area chart in the command
 * center's register: a calm champagne line on a faint grid, exact
 * tooltips, animated draw-in, and honest empty states. No chart library,
 * no casino gradients — one soft wash under the line, nothing else.
 *
 * Sizing is a callback ref onto a ResizeObserver (not a setState-in-
 * effect): the observer is the external system; React just re-renders
 * when the width changes.
 */

export type SeriesPoint = {
  label: string; // axis label (short)
  full: string; // tooltip title
  revenue: number; // cents
  orders: number;
  paid: number;
};

const HEIGHT = 260;
const PAD = { top: 18, right: 8, bottom: 26, left: 56 };

/** Attaches a ResizeObserver; reports width via setState in the callback
 *  (an external-system sync — the sanctioned effect-free pattern). */
function useElementWidth(): [React.RefCallback<HTMLDivElement>, number] {
  const [width, setWidth] = useState(0);
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallbackLikeRef(setWidth, observer);
  return [ref, width];
}

function useCallbackLikeRef(
  setWidth: (n: number) => void,
  store: React.RefObject<ResizeObserver | null>
): React.RefCallback<HTMLDivElement> {
  return (node) => {
    if (store.current) {
      store.current.disconnect();
      store.current = null;
    }
    if (!node) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.max(w, 240));
    });
    ro.observe(node);
    store.current = ro;
  };
}

export function RevenueChart({ points }: { points: SeriesPoint[] }) {
  const [ref, width] = useElementWidth();
  const reduced = useReducedMotion();
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    if (width === 0 || points.length === 0) return null;
    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const max = Math.max(...points.map((p) => p.revenue), 1);
    // A readable axis: round the top up to a friendly number.
    const step = niceStep(max / 4);
    const top = Math.ceil(max / step) * step;
    const x = (i: number) =>
      points.length === 1 ? PAD.left + innerW / 2 : PAD.left + (i / (points.length - 1)) * innerW;
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.revenue).toFixed(1)}`)
      .join(" ");
    const area = `${line} L${x(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;
    const gridLines = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
    return { innerW, innerH, top, x, y, line, area, gridLines };
  }, [width, points]);

  if (points.length === 0) {
    return (
      <div
        ref={ref}
        className="flex flex-col items-center justify-center py-16 text-center"
        style={{ color: "var(--cc-text-3)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--cc-text-2)" }}>
          No revenue in this period yet
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--cc-text-4)" }}>
          Your first Veyra sale will appear here the moment it&rsquo;s confirmed.
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative select-none" style={{ height: HEIGHT }}>
      {model && width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Revenue over time"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = e.clientX - rect.left;
            if (points.length === 1) return setHover(0);
            const idx = Math.round(((px - PAD.left) / model.innerW) * (points.length - 1));
            setHover(Math.min(points.length - 1, Math.max(0, idx)));
          }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--cc-accent)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--cc-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {model.gridLines.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={model.y(v)}
                y2={model.y(v)}
                stroke="var(--cc-line)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={model.y(v) + 3.5}
                textAnchor="end"
                fontSize="10"
                fill="var(--cc-text-4)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {axisMoney(v)}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            const every = Math.ceil(points.length / 8);
            if (i % every !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={i}
                x={model.x(i)}
                y={HEIGHT - 8}
                textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
                fontSize="10"
                fill="var(--cc-text-4)"
              >
                {p.label}
              </text>
            );
          })}

          <motion.path
            d={model.area}
            fill={`url(#${gradId})`}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          />
          <motion.path
            d={model.line}
            fill="none"
            stroke="var(--cc-accent)"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />

          {hover !== null && points[hover] && (
            <g>
              <line
                x1={model.x(hover)}
                x2={model.x(hover)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="var(--cc-line-strong)"
                strokeDasharray="3 3"
              />
              <circle
                cx={model.x(hover)}
                cy={model.y(points[hover].revenue)}
                r="3.5"
                fill="var(--cc-bg)"
                stroke="var(--cc-accent)"
                strokeWidth="1.75"
              />
            </g>
          )}
        </svg>
      )}

      {hover !== null && points[hover] && model && width > 0 && (
        <div
          className="pointer-events-none absolute rounded-md border px-3 py-2 shadow-lg"
          style={{
            backgroundColor: "var(--cc-surface)",
            borderColor: "var(--cc-line-strong)",
            left: Math.min(Math.max(model.x(hover) - 70, 4), width - 148),
            top: 4,
          }}
        >
          <p className="text-[11px]" style={{ color: "var(--cc-text-4)" }}>
            {points[hover].full}
          </p>
          <p className="mt-0.5 text-sm font-medium tnum" style={{ color: "var(--cc-text)" }}>
            {moneyFull(points[hover].revenue)}
          </p>
          <p className="text-[11px] tnum" style={{ color: "var(--cc-text-3)" }}>
            {points[hover].paid} paid · {points[hover].orders} order
            {points[hover].orders === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}

/* — helpers — */

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / pow;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return mult * pow;
}

function axisMoney(cents: number): string {
  const d = cents / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(d % 1000 === 0 ? 0 : 1)}k`;
  if (d === 0) return "$0";
  return `$${Math.round(d)}`;
}

export function moneyFull(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/* — BarRows: horizontal bars for breakdowns (products, top customers). — */
export function BarRows({
  rows,
}: {
  rows: { label: string; value: number; sub?: string }[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const reduced = useReducedMotion();
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm" style={{ color: "var(--cc-text-2)" }}>
              {r.label}
            </span>
            <span className="shrink-0 text-sm font-medium tnum" style={{ color: "var(--cc-text)" }}>
              {r.sub ?? moneyFull(r.value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--cc-surface-2)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: "var(--cc-accent)", opacity: 0.8 }}
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* — Donut: status distributions — used sparingly, as the spec asks. — */
export function Donut({
  slices,
  center,
}: {
  slices: { label: string; value: number; color: string }[];
  center?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={center ?? "distribution"}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--cc-surface-2)" strokeWidth="14" />
        {total > 0 &&
          slices.map((s) => {
            const frac = s.value / total;
            const dash = `${(frac * c).toFixed(2)} ${((1 - frac) * c).toFixed(2)}`;
            const offset = -acc * c;
            acc += frac;
            return (
              <circle
                key={s.label}
                cx="66"
                cy="66"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={dash}
                strokeDashoffset={offset}
                transform="rotate(-90 66 66)"
                strokeLinecap="butt"
              />
            );
          })}
        {center && (
          <text
            x="66"
            y="70"
            textAnchor="middle"
            fontSize="15"
            fontWeight="500"
            fill="var(--cc-text)"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {center}
          </text>
        )}
      </svg>
      <ul className="space-y-1.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-xs" style={{ color: "var(--cc-text-3)" }}>
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
            <span className="tnum" style={{ color: "var(--cc-text-2)" }}>
              {s.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
