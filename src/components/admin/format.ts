import type { OrderStatus } from "@/lib/orders";
import { CURRENCY } from "@/lib/site";

/**
 * Formatting helpers for the command center. Single source of truth for
 * currency/date/number rendering so no page invents its own locale
 * formatting.
 */

/** Smallest unit → "$79.00" in the storefront currency (src/lib/site.ts).
 *  Legacy orders still carry INR, so the locale follows the currency code. */
export function money(cents: number, currency = CURRENCY): string {
  const code = currency || CURRENCY;
  return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: code,
  }).format(cents / 100);
}

/** Smallest unit → compact "$12k" for chart axes and tight columns. */
export function moneyCompact(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return dateShort(iso);
}

export function n(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  refunded: "Refunded",
};

/**
 * orders.provider is free text ('dodo' / 'free-claim', plus 'razorpay' and
 * 'lemon-squeezy' on rows written before the Dodo switch), stamped per order
 * at checkout. It — not this deployment's current PAYMENT_PROVIDER — is what
 * says which processor a historical order went through.
 */
export function providerLabel(provider: string | null): string {
  if (provider === "free-claim") return "Free claim";
  if (provider === "razorpay") return "Razorpay (legacy)";
  if (provider === "lemon-squeezy") return "Lemon Squeezy (legacy)";
  return "Dodo Payments";
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
