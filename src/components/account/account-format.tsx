import type { OrderStatus } from "@/lib/orders";

/**
 * Shared formatting + status presentation for the account area.
 * Server-safe (no client hooks) so pages and shells can use it.
 */

export const orderStatusMeta: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  paid: { label: "Paid", className: "border-accent/30 bg-accent-soft text-accent-ink" },
  pending: { label: "Verifying", className: "border-line-strong bg-surface text-ink-2" },
  failed: { label: "Failed", className: "border-clay/30 bg-clay-soft text-clay" },
  cancelled: { label: "Cancelled", className: "border-line-strong bg-surface text-ink-3" },
  refunded: { label: "Refunded", className: "border-line-strong bg-surface text-ink-2" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = orderStatusMeta[status];
  return (
    <span
      className={`inline-flex items-center rounded-xs border px-2 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

/** Short customer-facing order reference derived from the order id. */
export function shortOrderRef(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
