/**
 * Seat-based pricing — the single source of truth for Veyra commerce.
 *
 * The Client Growth System is a genuine one-time purchase (no subscription):
 *   - REGULAR_PRICE is the intended normal retail price ($149).
 *   - FOUNDING_PRICE is the founding-customer launch price ($79) per seat.
 *   - Team pricing steps the per-seat price down slightly as seats are
 *     added, capped at 5 seats (~10% off the founding price).
 *
 * Every surface — product page, cart, checkout, orders, account, admin,
 * receipts, licensing, and delivery — resolves amounts through this module.
 * The checkout API recomputes the payable amount here server-side; client
 * displays are convenience only and never trusted.
 *
 * Tier structure (per-seat founding price by quantity):
 *   1 seat → $79   2 → $77 (2.5%)   3 → $75 (5%)
 *   4 → $73 (7.5%) 5 → $71 (10%)
 */

/** Intended normal retail price per seat, USD. */
export const REGULAR_PRICE = 149;

/** Founding-customer launch price per seat, USD. */
export const FOUNDING_PRICE = 79;

/** Per-seat founding price indexed by quantity (index = seats − 1). */
const SEAT_TIER_PRICES = [79, 77, 75, 73, 71] as const;

/** Purchases support individuals and small teams: 1–5 licensed seats. */
export const MIN_SEATS = 1;
export const MAX_SEATS = 5;

export type SeatTier = {
  /** Number of seats (clamped to a valid purchase size). */
  seats: number;
  /** Per-seat founding price for this tier, whole dollars. */
  perSeat: number;
  /** Per-seat regular price for display strikethrough. */
  regularPerSeat: number;
  /** Team discount vs the 1-seat founding price, percentage points. */
  discountPercent: number;
  /** founding price × seats, before the team discount. */
  subtotal: number;
  /** Team savings vs the 1-seat founding price, whole dollars. */
  teamSavings: number;
  /** Payable total, whole dollars: perSeat × seats. */
  total: number;
  /** True when another seat can still be added. */
  hasNextTier: boolean;
  /** The next tier's per-seat price, when one exists. */
  nextPerSeat: number | null;
};

/** Clamp any quantity to a valid seat count (defensive on both client and server). */
export function clampSeats(qty: number): number {
  if (!Number.isFinite(qty)) return MIN_SEATS;
  return Math.min(Math.max(Math.floor(qty), MIN_SEATS), MAX_SEATS);
}

/** Round to the nearest half percentage point — the published tier labels. */
function tierDiscountPercent(perSeat: number): number {
  const exact = ((FOUNDING_PRICE - perSeat) / FOUNDING_PRICE) * 100;
  return Math.max(0, Math.round(exact * 2) / 2);
}

/**
 * Resolve the pricing tier for a seat quantity. Accepts any number;
 * clamps to 1–5 so an out-of-range value can never produce a price.
 */
export function seatTier(qty: number): SeatTier {
  const seats = clampSeats(qty);
  const perSeat = SEAT_TIER_PRICES[seats - 1];
  const subtotal = FOUNDING_PRICE * seats;
  const total = perSeat * seats;
  const hasNextTier = seats < MAX_SEATS;
  return {
    seats,
    perSeat,
    regularPerSeat: REGULAR_PRICE,
    discountPercent: tierDiscountPercent(perSeat),
    subtotal,
    teamSavings: subtotal - total,
    total,
    hasNextTier,
    nextPerSeat: hasNextTier ? SEAT_TIER_PRICES[seats] : null,
  };
}

/**
 * The payable amount in the smallest currency unit (cents) — the only
 * amount form the checkout API and the orders table ever handle.
 */
export function checkoutAmountMinor(qty: number): number {
  return seatTier(qty).total * 100;
}

/** Format a percentage label without trailing zeros: 2.5, 5, 7.5, 10. */
export function formatDiscountPercent(percent: number): string {
  return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(1)}%`;
}
