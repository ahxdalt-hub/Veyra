/**
 * Seat-pricing tests — run with:
 *   node --test src/lib/pricing.test.ts
 *
 * These guard the one rule the commerce surface exists to keep: the amount
 * charged comes from the ladder the founding allocation selects, and no
 * display default can quietly bill a founding price after allocation #30.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  FOUNDING_PRICE,
  MAX_SEATS,
  REGULAR_PRICE,
  checkoutAmountMinor,
  clampSeats,
  seatTier,
} from "./pricing.ts";

test("founding ladder is the published dollar ladder", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((n) => seatTier(n, true).perSeat),
    [79, 75, 71, 67, 63]
  );
});

test("regular ladder keeps the same team steps at the higher anchor", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((n) => seatTier(n, false).perSeat),
    [149, 141, 134, 127, 119]
  );
});

test("one seat costs exactly the ladder's anchor", () => {
  assert.equal(seatTier(1, true).total, FOUNDING_PRICE);
  assert.equal(seatTier(1, false).total, REGULAR_PRICE);
});

test("payable total is per-seat × seats on both ladders", () => {
  for (const active of [true, false]) {
    for (let seats = 1; seats <= MAX_SEATS; seats++) {
      const t = seatTier(seats, active);
      assert.equal(t.total, t.perSeat * seats);
      assert.equal(t.subtotal, (active ? FOUNDING_PRICE : REGULAR_PRICE) * seats);
      assert.equal(t.teamSavings, t.subtotal - t.total);
    }
  }
});

test("team discount is measured against the active anchor, not founding", () => {
  // Whole-dollar tiers cannot land on exact percentages, so the published
  // labels are the half-point rounding of what is actually charged.
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((n) => seatTier(n, true).discountPercent),
    [0, 5, 10, 15, 20.5]
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((n) => seatTier(n, false).discountPercent),
    [0, 5.5, 10, 15, 20]
  );
});

test("checkout amount is cents and follows the allocation", () => {
  assert.equal(checkoutAmountMinor(3, true), 71 * 3 * 100);
  assert.equal(checkoutAmountMinor(3, false), 134 * 3 * 100);
});

test("the default is the open allocation, so an omitted flag cannot overcharge", () => {
  assert.equal(seatTier(2).total, 75 * 2);
  assert.equal(checkoutAmountMinor(2), 75 * 2 * 100);
});

test("founding undercuts regular at every seat count, and by less than the full spread", () => {
  for (let seats = 1; seats <= MAX_SEATS; seats++) {
    const founding = seatTier(seats, true);
    const regular = seatTier(seats, false);
    assert.ok(founding.total < regular.total, `${seats} seats: founding must be cheaper`);
    assert.ok(founding.perSeat < REGULAR_PRICE);
  }
  // The launch offer is roughly half the standard anchor — real, not a
  // token discount, and it is the price that buys the scarce 30 slots.
  assert.equal(
    Math.round(((REGULAR_PRICE - FOUNDING_PRICE) / REGULAR_PRICE) * 100),
    47
  );
});

test("quantities outside 1–5 clamp instead of producing a price", () => {
  assert.equal(clampSeats(0), 1);
  assert.equal(clampSeats(99), MAX_SEATS);
  assert.equal(clampSeats(Number.NaN), 1);
  assert.equal(seatTier(99, false).seats, MAX_SEATS);
  // A clamped quantity bills the clamped tier, never a 99-seat total.
  assert.equal(seatTier(99, false).total, 119 * MAX_SEATS);
});

test("the fifth seat has no next tier on either ladder", () => {
  assert.equal(seatTier(MAX_SEATS, true).hasNextTier, false);
  assert.equal(seatTier(MAX_SEATS, false).nextPerSeat, null);
  assert.equal(seatTier(4, false).nextPerSeat, 119);
});

test("the tier carries its allocation so surfaces can drop founding framing", () => {
  assert.equal(seatTier(1, true).foundingActive, true);
  assert.equal(seatTier(1, false).foundingActive, false);
  // The strike-through anchor stays the regular price for founding display.
  assert.equal(seatTier(1, true).regularPerSeat, REGULAR_PRICE);
});
