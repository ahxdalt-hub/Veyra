"use client";

/**
 * Shared desktop-workspace primitives for Stage 2: toolbars, data tables,
 * pickers and the detail drawer. Dense, keyboard-friendly, and consistent
 * with the warm visual system established in Stage 1.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Search, X } from "lucide-react";

/* --------------------------------- toolbar -------------------------------- */

export function Toolbar({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  ariaLabel = "Search records",
  autoFocusKey = true,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  autoFocusKey?: boolean;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  // "/" focuses search from anywhere on the page — a fast desktop habit.
  useEffect(() => {
    if (!autoFocusKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [autoFocusKey]);
  return (
    <div className={`relative min-w-44 flex-1 sm:max-w-64 ${className}`}>
      <Search
        size={13}
        aria-hidden
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-cgs-faint"
      />
      <input
        id={id}
        ref={ref}
        type="search"
        role="searchbox"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${placeholder} (press /)`}
        className="h-8 w-full rounded-lg border border-cgs-line-strong bg-cgs-raised pl-7.5 pr-7 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-cgs-faint hover:bg-cgs-inset hover:text-cgs-ink"
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </div>
  );
}

/* ------------------------------- select / input --------------------------- */

const controlCls =
  "h-8 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2 text-[13px] text-cgs-ink focus:border-cgs-accent";

export function Select({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <span aria-hidden className="text-[11.5px] text-cgs-muted">
        {label}
      </span>
      <select
        aria-label={`${label} filter`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${controlCls} cursor-pointer`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

export function DateField({
  label,
  value,
  onChange,
  error,
  allowClear = true,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  error?: string;
  allowClear?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[12px] font-medium text-cgs-ink">
          {label}
        </label>
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] text-cgs-faint underline-offset-2 hover:text-cgs-danger hover:underline"
          >
            clear
          </button>
        )}
      </div>
      <input
        id={id}
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink focus:border-cgs-accent ${
          error ? "border-cgs-danger/60" : "border-cgs-line-strong"
        }`}
      />
      {error && <p className="text-[11.5px] text-cgs-danger" role="alert">{error}</p>}
    </div>
  );
}

export function TextFieldLite({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[12px] font-medium text-cgs-ink">
        {label}
        {required && <span className="ml-1 text-cgs-accent" aria-hidden>*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-lg border bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent ${
          error ? "border-cgs-danger/60" : "border-cgs-line-strong"
        }`}
      />
      {error && <p className="text-[11.5px] text-cgs-danger" role="alert">{error}</p>}
    </div>
  );
}

export function TextAreaLite({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[12px] font-medium text-cgs-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] leading-relaxed text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
      />
    </div>
  );
}

/* --------------------------- channel combobox ----------------------------- */

/** Free-text input backed by a suggestion list (strategy channels + history). */
export function ComboInput({
  label,
  value,
  onChange,
  suggestions,
  placeholder,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const pool = q ? suggestions.filter((s) => s.toLowerCase().includes(q) && s !== value) : suggestions.filter((s) => s !== value);
    return pool.slice(0, 8);
  }, [value, suggestions]);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[12px] font-medium text-cgs-ink">
        {label}
        {required && <span className="ml-1 text-cgs-accent" aria-hidden>*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open && filtered.length > 0}
          aria-controls={`${id}-list`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              document.getElementById(`${id}-list`)?.querySelector("button")?.focus();
            }
          }}
          aria-invalid={error ? true : undefined}
          className={`w-full rounded-lg border bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent ${
            error ? "border-cgs-danger/60" : "border-cgs-line-strong"
          }`}
        />
        {open && filtered.length > 0 && (
          <ul
            id={`${id}-list`}
            role="listbox"
            className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-cgs-line bg-cgs-raised py-1 shadow-cgs-pop"
          >
            {filtered.map((s) => (
              <li key={s} role="option" aria-selected={s === value}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s);
                    setOpen(false);
                  }}
                  className="block w-full px-2.5 py-1 text-left text-[13px] text-cgs-ink-soft hover:bg-cgs-accent-faint hover:text-cgs-accent-deep"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-[11.5px] text-cgs-danger" role="alert">{error}</p>}
    </div>
  );
}

/* ----------------------------- empty state -------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cgs-line-strong bg-cgs-surface/60 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-cgs-faint">{icon}</div>}
      <p className="font-cgs-display text-[16px] text-cgs-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-cgs-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------- pagination ------------------------------- */

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cgs-line px-3 py-2 text-[12px] text-cgs-muted">
      <span aria-live="polite">
        {total === 0 ? "No records" : `${from}–${to} of ${total.toLocaleString()}`}
      </span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5">
          <span className="text-[11.5px]">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            aria-label="Rows per page"
            className="h-7 cursor-pointer rounded-md border border-cgs-line-strong bg-cgs-raised px-1.5 text-[12px]"
          >
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Previous page"
            className="h-7 rounded-md border border-cgs-line-strong bg-cgs-raised px-2 text-[12px] hover:bg-cgs-inset disabled:opacity-40 disabled:pointer-events-none"
          >
            ←
          </button>
          <span className="min-w-16 text-center tabular-nums" aria-label={`Page ${page} of ${pages}`}>
            {page} / {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
            aria-label="Next page"
            className="h-7 rounded-md border border-cgs-line-strong bg-cgs-raised px-2 text-[12px] hover:bg-cgs-inset disabled:opacity-40 disabled:pointer-events-none"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- drawer --------------------------------- */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  width = "max-w-xl",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape closes; focus moves into the drawer on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  const variants = {
    hidden: { x: "100%" },
    show: { x: 0 },
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Details"}>
          <motion.div
            className="absolute inset-0 bg-cgs-ink/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className={`absolute inset-y-0 right-0 flex w-full ${width} flex-col border-l border-cgs-line bg-cgs-surface shadow-cgs-pop outline-none`}
            initial={reduce ? { opacity: 0 } : variants.hidden}
            animate={reduce ? { opacity: 1 } : variants.show}
            exit={reduce ? { opacity: 0 } : variants.hidden}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <header className="flex items-start justify-between gap-3 border-b border-cgs-line px-5 py-3.5">
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-semibold text-cgs-ink">{title}</div>
                {subtitle && <div className="mt-0.5 truncate text-[12px] text-cgs-muted">{subtitle}</div>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="shrink-0 rounded-lg p-1.5 text-cgs-faint transition-colors hover:bg-cgs-inset hover:text-cgs-ink"
              >
                <X size={15} aria-hidden />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <footer className="border-t border-cgs-line bg-cgs-surface/90 px-5 py-3 backdrop-blur-sm">{footer}</footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------ status pill ------------------------------- */

export function Pill({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "complete" | "refine" | "danger";
  title?: string;
}) {
  const tones = {
    neutral: "bg-cgs-inset text-cgs-muted border-cgs-line-strong",
    accent: "bg-cgs-accent-faint text-cgs-accent-deep border-cgs-accent/30",
    complete: "bg-cgs-complete-soft text-cgs-complete border-[#cfdcc8]",
    refine: "bg-cgs-refine-soft text-cgs-refine border-[#e4d2a8]",
    danger: "bg-cgs-danger-soft text-cgs-danger border-[#e8c7c0]",
  }[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-px text-[11px] font-medium whitespace-nowrap ${tones}`}
    >
      {children}
    </span>
  );
}

/* ----------------------------- table shell -------------------------------- */

export function TableShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card ${className}`}>
      {children}
    </div>
  );
}

export const thCls =
  "sticky top-0 z-10 bg-cgs-inset/95 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-cgs-muted backdrop-blur-sm";
export const tdCls = "px-3 py-2 text-[13px] text-cgs-ink-soft align-middle";

/** Sortable column header button. */
export function SortHeader({
  label,
  active,
  dir,
  onClick,
  className = "",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  className?: string;
}) {
  return (
    <th scope="col" className={`${thCls} ${className}`} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-cgs-ink ${active ? "text-cgs-accent-deep" : ""}`}
      >
        {label}
        {active && <span aria-hidden className="text-[9px]">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
