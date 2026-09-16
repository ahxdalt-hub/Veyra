import { NextResponse } from "next/server";
import { couponErrorMessage, validateCoupon } from "@/lib/coupons";
import { checkoutAmountMinor, MAX_SEATS } from "@/lib/pricing";

/**
 * POST /api/coupons/validate — coupon preview at checkout.
 *
 * Returns ONLY the human-safe result (valid + discount in dollars, or a
 * reason). The authoritative re-validation still happens inside
 * /api/checkout when the order is created — this endpoint exists so the
 * UI can show the discount before payment starts, never to be trusted.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { code, email, qty } = (body ?? {}) as Record<string, unknown>;

  if (typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 422 });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    // Per-customer limits depend on the email — ask for it first.
    return NextResponse.json(
      { valid: false, reason: "email_required" },
      { status: 422 }
    );
  }
  const seats = Math.floor(Number(qty ?? 1));
  if (!Number.isFinite(seats) || seats < 1 || seats > MAX_SEATS) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 422 });
  }

  const subtotalDollars = Math.round(checkoutAmountMinor(seats) / 100);
  const verdict = await validateCoupon(code, email.trim().toLowerCase(), subtotalDollars);
  if (!verdict) {
    return NextResponse.json(
      { error: "We couldn't check that code right now.", code: "coupon_validation_unavailable" },
      { status: 503 }
    );
  }
  if (!verdict.ok) {
    return NextResponse.json({
      valid: false,
      reason: verdict.reason,
      message: couponErrorMessage(verdict.reason),
    });
  }
  return NextResponse.json({
    valid: true,
    code: verdict.code,
    label: verdict.label,
    discountDollars: verdict.discount_dollars,
    newTotal: Math.max(0, subtotalDollars - verdict.discount_dollars),
  });
}
