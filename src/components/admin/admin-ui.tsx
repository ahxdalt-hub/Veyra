"use client";

import Link from "next/link";
import { useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckIcon, CopyIcon, XIcon } from "@/components/admin/icons";
import { useState } from "react";

/**
 * Command-center UI kit — the surfaces every admin page shares. One
 * restrained visual voice: hairline borders, warm-neutral panels, a
 * champagne accent used sparingly, motion that's quick and quiet.
 */

/* — Panel — the base surface. Not a card factory: sections that hold
   data sit inside one panel, not a grid of floating cards. — */
export function Panel({
  title,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`overflow-hidden rounded-md border ${className}`}
      style={{
        borderColor: "var(--cc-line)",
        backgroundColor: "var(--cc-bg-2)",
      }}
    >
      {title ? (
        <header
          className="flex h-11 items-center justify-between border-b px-4"
          style={{ borderColor: "var(--cc-line)" }}
        >
          <h2 className="cc-label">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={padded ? "p-4" : undefined}>{children}</div>
    </section>
  );
}

/* — Page heading — title + meta line + actions row. — */
export function PageHeading({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-display-2" style={{ color: "var(--cc-text)" }}>
          {title}
        </h1>
        {meta ? (
          <p className="mt-1 text-sm" style={{ color: "var(--cc-text-3)" }}>
            {meta}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* — Buttons (cc register; the storefront Button isn't used here) — */
export function CcButton({
  variant = "ghost",
  size = "md",
  href,
  onClick,
  disabled,
  children,
  className = "",
  type = "button",
}: {
  variant?: "primary" | "accent" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
}) {
  const tones: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "var(--cc-surface-2)",
      color: "var(--cc-text)",
      border: "1px solid var(--cc-line-strong)",
    },
    accent: { backgroundColor: "var(--cc-accent)", color: "#141007", border: "1px solid transparent" },
    outline: { border: "1px solid var(--cc-line-strong)", color: "var(--cc-text-2)" },
    ghost: { color: "var(--cc-text-3)" },
    danger: { border: "1px solid var(--cc-error)", color: "var(--cc-error)" },
  };
  const cls = `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-medium transition-all duration-150 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 ${
    size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3.5 text-sm"
  } ${className}`;
  const style = tones[variant];
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} style={style}>
      {children}
    </button>
  );
}

/* — Status pill — */
export function StatusPill({
  status,
}: {
  status:
    | "pending"
    | "paid"
    | "failed"
    | "cancelled"
    | "refunded"
    | "active"
    | "revoked"
    | "invited"
    | "deactivated"
    | "available"
    | "coming-soon"
    | string;
}) {
  const tone: Record<string, string> = {
    paid: "var(--cc-success)",
    active: "var(--cc-success)",
    available: "var(--cc-success)",
    connected: "var(--cc-success)",
    healthy: "var(--cc-success)",
    configured: "var(--cc-success)",
    pending: "var(--cc-warning)",
    invited: "var(--cc-warning)",
    comingsoon: "var(--cc-warning)",
    pendingconfig: "var(--cc-warning)",
    attention: "var(--cc-warning)",
    degraded: "var(--cc-warning)",
    failed: "var(--cc-error)",
    revoked: "var(--cc-error)",
    error: "var(--cc-error)",
    cancelled: "var(--cc-text-4)",
    deactivated: "var(--cc-text-4)",
    unavailable: "var(--cc-text-4)",
    refunded: "var(--cc-info)",
  };
  const key = status.toLowerCase().replace(/[^a-z]/g, "");
  const color = tone[key] ?? "var(--cc-text-3)";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ borderColor: "var(--cc-line)", color }}
    >
      <span aria-hidden="true" className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}

/* — Copy-to-clipboard with feedback — */
export function CopyChip({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked — no feedback is honest feedback */
        }
      }}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-xs transition-colors"
      style={{ borderColor: "var(--cc-line-strong)", color: "var(--cc-text-2)" }}
      title="Copy to clipboard"
    >
      <span className="truncate">{label ?? value}</span>
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="ok"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ color: "var(--cc-success)" }}
          >
            <CheckIcon className="h-3 w-3" />
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="opacity-50 group-hover:opacity-90"
          >
            <CopyIcon className="h-3 w-3" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/* — Empty state — beautiful honesty when the database is genuinely empty — */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-full border font-display text-lg italic"
        style={{ borderColor: "var(--cc-line-strong)", color: "var(--cc-text-4)" }}
      >
        V
      </span>
      <p className="mt-4 text-sm font-medium" style={{ color: "var(--cc-text-2)" }}>
        {title}
      </p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed" style={{ color: "var(--cc-text-4)" }}>
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* — Loading skeleton — */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`cc-skeleton ${className}`} />;
}

/* — Drawer — the right-side detail surface (orders, customers, licences) — */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60]"
            style={{ backgroundColor: "rgba(10, 9, 7, 0.5)" }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={reduced ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduced ? undefined : { x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.9 }}
            className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-[560px] flex-col border-l shadow-2xl"
            style={{ backgroundColor: "var(--cc-bg-2)", borderColor: "var(--cc-line-strong)" }}
          >
            <header
              className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4"
              style={{ borderColor: "var(--cc-line)" }}
            >
              <div className="min-w-0">
                <div className="text-display-2 truncate text-lg" style={{ color: "var(--cc-text)" }}>
                  {title}
                </div>
                {subtitle ? (
                  <div className="mt-0.5 text-sm" style={{ color: "var(--cc-text-3)" }}>
                    {subtitle}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors"
                style={{ color: "var(--cc-text-3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--cc-surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              >
                <XIcon className="h-4 w-4" />
              </button>
            </header>
            <div
              className="flex-1 overflow-y-auto px-5 py-4"
              data-lenis-prevent=""
            >
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* — Confirmation dialog for destructive actions. Strong by design:
   explains the consequence and requires an explicit confirm click. — */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  pendingLabel = "Applying…",
  danger = true,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  danger?: boolean;
}) {
  const [pending, start] = useTransition();
  const reduced = useReducedMotion();
  const busy = pending;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[75]"
            style={{ backgroundColor: "rgba(10, 9, 7, 0.6)" }}
            onClick={busy ? undefined : onClose}
          />
          <div className="fixed inset-0 z-[76] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label={title}
              initial={reduced ? false : { opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full max-w-sm rounded-lg border p-5 shadow-2xl"
              style={{ backgroundColor: "var(--cc-surface)", borderColor: "var(--cc-line-strong)" }}
            >
              <h3 className="text-base font-medium" style={{ color: "var(--cc-text)" }}>
                {title}
              </h3>
              <div className="mt-2 text-sm leading-relaxed" style={{ color: "var(--cc-text-3)" }}>
                {body}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <CcButton variant="outline" size="md" onClick={onClose} disabled={busy}>
                  Cancel
                </CcButton>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => start(async () => void (await onConfirm()))}
                  className="inline-flex h-9 items-center rounded-sm px-3.5 text-sm font-medium transition-all disabled:opacity-60"
                  style={
                    danger
                      ? { backgroundColor: "var(--cc-error)", color: "#1a0f0c" }
                      : { backgroundColor: "var(--cc-accent)", color: "#141007" }
                  }
                >
                  {busy ? pendingLabel : confirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* — Segmented control (time ranges, tabs) — */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex h-8 items-center rounded-sm border p-0.5"
      style={{ borderColor: "var(--cc-line-strong)", backgroundColor: "var(--cc-bg-2)" }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            type="button"
            onClick={() => onChange(o.value)}
            className="relative h-7 shrink-0 rounded-sm px-2.5 text-xs font-medium transition-colors"
            style={{
              color: on ? "var(--cc-text)" : "var(--cc-text-3)",
              backgroundColor: on ? "var(--cc-surface-2)" : undefined,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* — Field for compact forms (create/edit) — */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="cc-label mb-1.5 block">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs" style={{ color: "var(--cc-error)" }}>
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs" style={{ color: "var(--cc-text-4)" }}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "h-9 w-full rounded-sm border bg-transparent px-2.5 text-sm outline-none transition-colors placeholder:text-[var(--cc-text-4)] focus:border-[var(--cc-accent-line)]";
export const inputStyle: React.CSSProperties = {
  borderColor: "var(--cc-line-strong)",
  color: "var(--cc-text)",
};

/* — KV row — the detail-view workhorse — */
export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--cc-line)" }}>
      <span className="shrink-0 text-xs" style={{ color: "var(--cc-text-4)" }}>
        {k}
      </span>
      <span className="min-w-0 text-right text-sm" style={{ color: "var(--cc-text-2)" }}>
        {v}
      </span>
    </div>
  );
}

/* — Inline success feedback after a server action mutation — */
export function ActionFeedback({ message }: { message: string | null }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {message ? (
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--cc-success)" }}
        >
          <CheckIcon className="h-3 w-3" />
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
