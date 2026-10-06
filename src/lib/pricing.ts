/**
 * Seat-based pricing — the single source of truth for Veyra commerce.
 *
 * The Client Growth System is a genuine one-time purchase (no subscription):
 *   - REGULAR_PRICE is the intended normal retail price ($149).
 *   - FOUNDING_PRICE is the founding-customer launch price ($79) per seat.
 *   - Team pricing steps the per-seat price down as seats are added, capped
 *     at 5 seats (~20% off that ladder's single-seat price).
 *
 * Every surface — product page, cart, checkout, orders, account, admin,
 * receipts, licensing, and delivery — resolves amounts through this module.
 * The checkout API recomputes the payable amount here server-side; client
 * displays are convenience only and never trusted.
 *
 * Currency is USD because checkout runs on Dodo Payments, a global merchant
 * of record (see src/lib/site.ts CURRENCY). Amounts are whole DOLLARS here;
 * checkoutAmountMinor converts to cents for the provider and the orders
 * table. Changing the provider means repricing this module, not relabelling
 * it — the number and the currency always move together.
 *
 * Tier structure (per-seat price by quantity, ~5/10/15/20% team steps):
 *   founding  1 → 79     2 → 75     3 → 71     4 → 67     5 → 63
 *   regular   1 → 149    2 → 141    3 → 134    4 → 127    5 → 119
 *
 * Once the founding allocation is genuinely spent (src/lib/founding.ts),
 * the regular ladder takes over, so the published scarcity promise becomes
 * true at the register rather than only in the banner.
 */

/** Intended normal retail price per seat, USD. */
export const REGULAR_PRICE = 149;

/** Founding-customer launch price per seat, USD. */
export const FOUNDING_PRICE = 79;

/** Per-seat founding price indexed by quantity (index = seats − 1). */
const FOUNDING_SEAT_TIER_PRICES = [79, 75, 71, 67, 63] as const;

/** Per-seat regular price by quantity — same steps, post-allocation. */
const REGULAR_SEAT_TIER_PRICES = [149, 141, 134, 127, 119] as const;

/** Purchases support individuals and small teams: 1–5 licensed seats. */
export const MIN_SEATS = 1;
export const MAX_SEATS = 5;

export type SeatTier = {
  /** Number of seats (clamped to a valid purchase size). */
  seats: number;
  /** Per-seat price for this tier, whole dollars. */
  perSeat: number;
  /** Per-seat regular price for display strikethrough. */
  regularPerSeat: number;
  /** False once the founding allocation is spent — no founding framing applies. */
  foundingActive: boolean;
  /** Team discount vs the 1-seat price of the active ladder, percentage points. */
  discountPercent: number;
  /** 1-seat price of the active ladder × seats, before the team discount. */
  subtotal: number;
  /** Team savings vs the 1-seat price of the active ladder, whole dollars. */
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
function tierDiscountPercent(perSeat: number, oneSeatPrice: number): number {
  const exact = ((oneSeatPrice - perSeat) / oneSeatPrice) * 100;
  return Math.max(0, Math.round(exact * 2) / 2);
}

/**
 * Resolve the pricing tier for a seat quantity. Accepts any number;
 * clamps to 1–5 so an out-of-range value can never produce a price.
 *
 * `foundingActive` selects the ladder. It must come from
 * getFoundingStatus() wherever money is charged or shown, so the banner's
 * claim and the register's amount can never disagree.
 */
export function seatTier(qty: number, foundingActive = true): SeatTier {
  const seats = clampSeats(qty);
  const ladder = foundingActive
    ? FOUNDING_SEAT_TIER_PRICES
    : REGULAR_SEAT_TIER_PRICES;
  const oneSeatPrice = foundingActive ? FOUNDING_PRICE : REGULAR_PRICE;
  const perSeat = ladder[seats - 1];
  const subtotal = oneSeatPrice * seats;
  const total = perSeat * seats;
  const hasNextTier = seats < MAX_SEATS;
  return {
    seats,
    perSeat,
    regularPerSeat: REGULAR_PRICE,
    foundingActive,
    discountPercent: tierDiscountPercent(perSeat, oneSeatPrice),
    subtotal,
    teamSavings: subtotal - total,
    total,
    hasNextTier,
    nextPerSeat: hasNextTier ? ladder[seats] : null,
  };
}

/**
 * The payable amount in the smallest currency unit (cents for USD) — the
 * only amount form the checkout API and the orders table ever handle.
 */
export function checkoutAmountMinor(qty: number, foundingActive = true): number {
  return seatTier(qty, foundingActive).total * 100;
}

/** Format a percentage label without trailing zeros: 2.5, 5, 7.5, 10. */
export function formatDiscountPercent(percent: number): string {
  return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(1)}%`;
}
