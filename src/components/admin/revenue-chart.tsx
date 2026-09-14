"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * RevenueChart — SVG area chart for paid revenue per day.
 *
 * Honest plotting: the y-axis always starts at zero and every point is a
 * real aggregated day total. When a period has no sales, the chart
 * renders its true zero line rather than an invented shape. The draw
 * animation reveals the actual path only; hover snaps to the nearest
 * real point with a precise readout.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export type ChartPoint = { date: string; revenueMinor: number; orders: number };

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMoney(minor: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function RevenueChart({
  points,
  currency = "USD",
  height = 240,
}: {
  points: ChartPoint[];
  currency?: string;
  height?: number;
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const W = 800;
  const H = height;
  const PAD_L = 52;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 28;

  const max = useMemo(
    () => Math.max(1, ...points.map((p) => p.revenueMinor)),
    [points]
  );
  // Round ticks up to a clean value so labels stay readable.
  const yMax = useMemo(() => {
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const step = magnitude / 2;
    return Math.max(step, Math.ceil(max / step) * step);
  }, [max]);

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const x = (i: number) =>
    PAD_L + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD_T + innerH - (v / yMax) * innerH;

  const path = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.revenueMinor).toFixed(1)}`)
      .join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, yMax]);

  const areaPath = path ? `${path} L${x(points.length - 1).toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z` : "";

  const yTicks = useMemo(() => {
    const ticks: { value: number; y: number }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = (yMax / steps) * i;
      ticks.push({ value: v, y: y(v) });
    }
    return ticks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yMax]);

  const xTickEvery = Math.max(1, Math.ceil(points.length / 7));

  const total = points.reduce((s, p) => s + p.revenueMinor, 0);
  const hasAny = total > 0;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(x(i) - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        role="img"
        aria-label={`Daily revenue, USD. ${hasAny ? `Total ${formatMoney(total)} across the period.` : "No paid revenue in this period."}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-cc-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-cc-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {yTicks.map((t) => (
          <g key={t.value}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={t.y}
              y2={t.y}
              stroke="var(--color-cc-line)"
              strokeWidth="1"
              strokeDasharray={t.value === 0 ? undefined : "2 4"}
            />
            <text
              x={PAD_L - 8}
              y={t.y + 3.5}
              textAnchor="end"
              className="fill-cc-text-4"
              style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            >
              {t.value === 0 ? "0" : formatMoney(t.value)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {points.map((p, i) =>
          i % xTickEvery === 0 || i === points.length - 1 ? (
            <text
              key={p.date}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-cc-text-4"
              style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
            >
              {formatDay(p.date)}
            </text>
          ) : null
        )}

        {hasAny ? (
          <>
            {/* Area fill */}
            <motion.path
              d={areaPath}
              fill="url(#rev-fill)"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            {/* Line draw */}
            <motion.path
              d={path}
              fill="none"
              stroke="var(--color-cc-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduced ? 0 : 0.9, ease: EASE }}
            />
            {/* End dot */}
            <motion.circle
              cx={x(points.length - 1)}
              cy={y(points[points.length - 1].revenueMinor)}
              r="3.5"
              fill="var(--color-cc-accent)"
              initial={reduced ? false : { opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reduced ? 0 : 0.85, duration: 0.25 }}
            />
          </>
        ) : (
          /* True zero state — the honest flat line */
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={PAD_T + innerH}
            y2={PAD_T + innerH}
            stroke="var(--color-cc-line-strong)"
            strokeWidth="1.5"
            strokeDasharray="3 5"
          />
        )}

        {/* Hover indicator */}
        {hover !== null && points[hover] ? (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD_T}
              y2={PAD_T + innerH}
              stroke="var(--color-cc-text-4)"
              strokeWidth="1"
            />
            <circle
              cx={x(hover)}
              cy={y(points[hover].revenueMinor)}
              r="4"
              fill="var(--color-cc-bg)"
              stroke="var(--color-cc-accent)"
              strokeWidth="2"
            />
          </g>
        ) : null}
      </svg>

      {/* Hover tooltip */}
      {hover !== null && points[hover] ? (
        <div
          className="pointer-events-none absolute top-2 rounded-sm border border-cc-line bg-cc-panel-2 px-2.5 py-1.5 shadow-md"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > points.length / 2 ? "-105%" : "5%"})`,
          }}
        >
          <p className="spec text-cc-text-4">{formatDay(points[hover].date)}</p>
          <p className="tnum text-[0.8125rem] font-medium text-cc-text">
            {formatMoney(points[hover].revenueMinor)}
            <span className="ml-1 text-[0.625rem] text-cc-text-3">{currency}</span>
          </p>
          <p className="text-[0.625rem] text-cc-text-3">
            {points[hover].orders} {points[hover].orders === 1 ? "order" : "orders"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
