"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ModuleStatus } from "@/cgs-demo/lib/stages";

/* --------------------------------- motion --------------------------------- */

export function Reveal({
  children,
  delay = 0,
  as: _as,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  as?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  void _as;
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: [0.2, 0.6, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* --------------------------------- badges --------------------------------- */

const STATUS_COPY: Record<ModuleStatus, { label: string; cls: string; dot: string }> = {
  "not-started": { label: "Not started", cls: "text-cgs-muted bg-cgs-inset border-cgs-line", dot: "bg-cgs-faint" },
  "in-progress": { label: "In progress", cls: "text-cgs-ink-soft bg-cgs-surface border-cgs-line-strong", dot: "bg-cgs-accent" },
  complete: { label: "Complete", cls: "text-cgs-complete bg-cgs-complete-soft border-[#cfdcc8]", dot: "bg-cgs-complete" },
  "needs-review": { label: "Needs refinement", cls: "text-cgs-refine bg-cgs-refine-soft border-[#e4d2a8]", dot: "bg-cgs-refine" },
};

export function StatusBadge({
  status,
  detail,
  className = "",
}: {
  status: ModuleStatus;
  detail?: string;
  className?: string;
}) {
  const s = STATUS_COPY[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight whitespace-nowrap ${s.cls} ${className}`}
      title={detail}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

/* -------------------------------- progress -------------------------------- */

export function StepRail({
  filled,
  total,
  status,
}: {
  filled: number;
  total: number;
  status: ModuleStatus;
}) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  const tone =
    status === "complete"
      ? "bg-cgs-complete"
      : status === "needs-review"
        ? "bg-cgs-refine"
        : "bg-cgs-accent";
  return (
    <div className="flex items-center gap-2" aria-label={`${filled} of ${total} required items complete`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-cgs-inset border border-cgs-line">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${tone}`}
          style={{ width: `${status === "complete" ? 100 : pct}%` }}
        />
      </div>
      <span className="text-[11px] tabular-nums text-cgs-muted">
        {status === "complete" ? "All done" : `${filled}/${total}`}
      </span>
    </div>
  );
}

/* -------------------------------- buttons --------------------------------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 select-none";
  const sizes = size === "sm" ? "h-8 px-3 text-[13px]" : "h-9.5 px-4 text-sm";
  const variants = {
    primary: "bg-cgs-accent text-[#fdf9f4] hover:bg-cgs-accent-deep shadow-cgs-card",
    secondary: "bg-cgs-raised text-cgs-ink border border-cgs-line-strong hover:bg-cgs-inset",
    ghost: "text-cgs-muted hover:text-cgs-ink hover:bg-cgs-inset",
    danger: "bg-cgs-danger text-[#fbf1ef] hover:bg-[#8a3127]",
  }[variant];
  return (
    <button type="button" className={`${base} ${sizes} ${variants} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ---------------------------------- chips --------------------------------- */

export function Chip({
  children,
  onRemove,
  ariaLabel,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  ariaLabel?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-cgs-line-strong bg-cgs-surface px-2 py-0.5 text-[12.5px] text-cgs-ink-soft"
      aria-label={ariaLabel}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-sm p-0.5 text-cgs-faint hover:text-cgs-danger hover:bg-cgs-danger-soft"
          aria-label={`Remove ${String(children)}`}
        >
          <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
}

/* -------------------------------- feedback -------------------------------- */

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-cgs-muted text-sm" role="status">
      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.2" />
        <path d="M22 12a10 10 0 0 1-10-10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <span>{label}…</span>
    </div>
  );
}

/* ---------------------------------- misc ---------------------------------- */

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cgs-faint">{children}</h2>
  );
}

export function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
