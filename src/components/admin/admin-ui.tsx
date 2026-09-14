import type { OrderStatus } from "@/lib/orders";
import { CopyButton } from "./copy-button";
import { AdminCheckIcon } from "./admin-icons";

/**
 * Admin presentation primitives — server-safe (no client hooks beyond
 * CopyButton), shared by every command-center screen.
 */

/* ------------------------------------------------------------------ */
/* Status badges — color + label + shape, never color alone            */
/* ------------------------------------------------------------------ */

const badgeBase =
  "inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-[0.6875rem] font-medium tracking-wide whitespace-nowrap";

export function dot(className: string) {
  return (
    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${className}`} />
  );
}

export function OrderStatusBadgeCC({ status }: { status: OrderStatus }) {
  const map: Record<
    OrderStatus,
    { label: string; cls: string; dotCls: string; glyph: string }
  > = {
    paid: {
      label: "Paid",
      cls: "border-cc-good/40 bg-cc-good-soft text-cc-good",
      dotCls: "bg-cc-good",
      glyph: "✓",
    },
    pending: {
      label: "Pending",
      cls: "border-cc-info/40 bg-cc-info-soft text-cc-info",
      dotCls: "bg-cc-info",
      glyph: "•",
    },
    failed: {
      label: "Failed",
      cls: "border-cc-bad/40 bg-cc-bad-soft text-cc-bad",
      dotCls: "bg-cc-bad",
      glyph: "✕",
    },
    cancelled: {
      label: "Cancelled",
      cls: "border-cc-line-strong bg-cc-panel-3 text-cc-text-2",
      dotCls: "bg-cc-text-4",
      glyph: "—",
    },
    refunded: {
      label: "Refunded",
      cls: "border-cc-accent/40 bg-cc-accent-soft text-cc-accent",
      dotCls: "bg-cc-accent",
      glyph: "↺",
    },
  };
  const m = map[status];
  return (
    <span className={`${badgeBase} ${m.cls}`}>
      <span aria-hidden="true" className="text-[0.625rem] leading-none">{m.glyph}</span>
      {m.label}
    </span>
  );
}

export function AccessBadge({ status }: { status: "active" | "revoked" }) {
  return status === "active" ? (
    <span className={`${badgeBase} border-cc-good/40 bg-cc-good-soft text-cc-good`}>
      <span aria-hidden="true" className="text-[0.625rem] leading-none">✓</span>
      Active
    </span>
  ) : (
    <span className={`${badgeBase} border-cc-bad/40 bg-cc-bad-soft text-cc-bad`}>
      <span aria-hidden="true" className="text-[0.625rem] leading-none">✕</span>
      Revoked
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Formatting                                                           */
/* ------------------------------------------------------------------ */

/** Format a minor-units amount for the admin (USD unless stated). */
export function formatMinorAmount(
  minor: number,
  currency = "USD"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateOnly(iso);
}

/** Compact order reference for tables/drawers. */
export function orderRef(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Copyable ID — clean UUID display with one-click copy                 */
/* ------------------------------------------------------------------ */

export function CopyableId({
  value,
  label,
  display,
}: {
  value: string;
  label: string;
  /** Short display form; defaults to first 12 chars + ellipsis. */
  display?: string;
}) {
  const short = display ?? `${value.slice(0, 12)}…`;
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="truncate font-mono text-xs text-cc-text-2" title={value}>
        {short}
      </span>
      <CopyButton value={value} label={label} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Panels                                                               */
/* ------------------------------------------------------------------ */

export function PanelHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cc-line px-5 py-3.5">
      <div>
        <h2 className="font-display text-[0.9375rem] font-medium tracking-[-0.01em] text-cc-text">
          {title}
        </h2>
        {hint ? <p className="mt-0.5 text-xs text-cc-text-3">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-14 text-center">
      <span className="spec text-cc-text-4">{title}</span>
      {hint ? <p className="max-w-sm text-xs text-cc-text-3">{hint}</p> : null}
    </div>
  );
}

export function SuccessRow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-cc-good">
      <AdminCheckIcon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}
