import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { resolvePurchasableProduct } from "@/lib/products";
import { checkoutAmountMinor, MAX_SEATS, seatTier } from "@/lib/pricing";
import { CURRENCY } from "@/lib/site";
import {
  createLemonSqueezyCheckout,
  lemonSqueezyConfigured,
  lemonSqueezyMode,
} from "@/lib/lemon-squeezy";
import { site } from "@/lib/site";
import { insertOrder, updateOrderStatus } from "@/lib/orders";
import type { Order } from "@/lib/orders";
import { grantPurchaseForOrder } from "@/lib/fulfillment";
import { notifyNewSale } from "@/lib/admin/notifications";
import { couponErrorMessage, validateCoupon } from "@/lib/coupons";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";

/**
 * POST /api/checkout — create a payment order + hosted Lemon Squeezy checkout.
 *
 * Security model:
 *  - The client sends ONLY slugs, quantities, and an email. No prices,
 *    no totals — the amount is computed here from the catalog and is the
 *    sole number passed to Lemon Squeezy as custom_price, and the sole
 *    number trusted by the orders table.
 *  - Products must be currently purchasable (coming-soon slugs are
 *    rejected) and a single distinct product per order is supported.
 *  - The response exposes the hosted checkout URL only. The API key never
 *    leaves the server. Confirmation happens exclusively via the signed
 *    /api/webhooks/lemonsqueezy order_created event — the browser's return
 *    redirect is decoration, never proof.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const payload = body as {
    email?: unknown;
    items?: unknown;
    coupon?: unknown;
  };

  // --- Email -----------------------------------------------------------
  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 422 }
    );
  }

  // --- Items: server-side resolution, never client prices ---------------
  if (
    !Array.isArray(payload.items) ||
    payload.items.length === 0 ||
    payload.items.length > 10
  ) {
    return NextResponse.json(
      { error: "Your cart appears to be empty or invalid." },
      { status: 422 }
    );
  }

  const resolved: {
    slug: string;
    name: string;
    qty: number;
  }[] = [];

  for (const item of payload.items) {
    const slug =
      typeof item === "object" && item !== null
        ? (item as { slug?: unknown }).slug
        : undefined;
    const rawQty =
      typeof item === "object" && item !== null
        ? (item as { qty?: unknown }).qty
        : undefined;

    if (typeof slug !== "string") {
      return NextResponse.json({ error: "Invalid cart item." }, { status: 422 });
    }
    // Integer quantity, clamped to the seat range — quantity IS seats.
    const qty = Math.floor(Number(rawQty ?? 1));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_SEATS) {
      return NextResponse.json(
        {
          error: `Quantity must be between 1 and ${MAX_SEATS} seats.`,
        },
        { status: 422 }
      );
    }

    const product = resolvePurchasableProduct(slug);
    if (!product) {
      return NextResponse.json(
        {
          error:
            "One of the items in your cart is not available for purchase. Please remove it and try again.",
        },
        { status: 422 }
      );
    }

    resolved.push({
      slug: product.slug,
      name: product.name,
      qty,
    });
  }

  // Stage 02: orders carry a single product line (see 0002_orders.sql).
  const distinct = new Set(resolved.map((r) => r.slug));
  if (distinct.size > 1) {
    return NextResponse.json(
      { error: "Please purchase one product at a time." },
      { status: 422 }
    );
  }

  // Duplicate lines of the same product are merged — the customer's
  // intent is the combined seat count, and it must still fit 1–5 seats.
  const line = resolved[0];
  const combinedQty = resolved.reduce((sum, r) => sum + r.qty, 0);
  if (combinedQty > MAX_SEATS) {
    return NextResponse.json(
      {
        error: `A single purchase supports 1–${MAX_SEATS} seats.`,
      },
      { status: 422 }
    );
  }
  line.qty = combinedQty;

  // Team pricing resolves here, server-side — the per-seat tier, the
  // discount, and the payable amount are computed from the catalog's
  // pricing configuration. A client-sent total is never read.
  const tier = seatTier(line.qty);
  const subtotalMinor = checkoutAmountMinor(line.qty); // cents, pre-coupon

  // --- Coupon (0013): the client may PROPOSE a code; the database decides.
  // validate_coupon enforces active flag, date window, minimums, usage
  // caps, and per-customer limits. Amounts are recomputed here from the
  // returned discount — a tampered or stale proposal simply fails
  // validation and the order proceeds at full price only when no code
  // was sent at all.
  const proposedCoupon =
    typeof payload.coupon === "string" ? payload.coupon : undefined;
  let amountMinor = subtotalMinor;
  let couponApplied: { code: string; label: string; discountMinor: number } | null = null;
  // True when the validated coupon covers the entire subtotal — checkout
  // then completes without the gateway (see the free-order branch below).
  let freeOrder = false;
  if (proposedCoupon && proposedCoupon.trim()) {
    const verdict = await validateCoupon(
      proposedCoupon,
      email,
      Math.round(subtotalMinor / 100)
    );
    if (!verdict) {
      return NextResponse.json(
        {
          error:
            "We couldn't check that code right now. Try again — or continue without it.",
          code: "coupon_validation_unavailable",
        },
        { status: 503 }
      );
    }
    if (!verdict.ok) {
      return NextResponse.json(
        { error: couponErrorMessage(verdict.reason), code: "coupon_invalid" },
        { status: 422 }
      );
    }
    const rawDiscountMinor = verdict.discount_dollars * 100;
    freeOrder = rawDiscountMinor >= subtotalMinor;
    // Free orders take the full discount (nothing is charged). Partial
    // discounts keep the ≥1-cent floor payment gateways require —
    // a $0.00 charge would be rejected by Lemon Squeezy, so a fully-covered
    // order must skip the gateway rather than send it one cent.
    const discountMinor = freeOrder
      ? subtotalMinor
      : Math.min(rawDiscountMinor, subtotalMinor - 1);
    amountMinor = subtotalMinor - discountMinor;
    couponApplied = {
      code: verdict.code,
      label: verdict.label,
      discountMinor,
    };
  }

  // Signed-in customers get the order linked to their account directly;
  // guests stay unlinked until they claim it with their verified email.
  let userId: string | null = null;
  if (supabaseAuthConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      userId = null;
    }
  }

  // --- FREE CHECKOUT: the coupon covers everything ------------------------
  // No gateway, no modal, no charge. The order still walks the REAL
  // lifecycle — inserted as pending, then confirmed to paid — so the
  // database's own triggers stamp paid_at and increment the coupon's
  // used_count exactly as a card payment would. Fulfillment runs through
  // the same idempotent grant (entitlement + licence + seat + receipt
  // email) the verify route and webhook use.
  if (freeOrder) {
    const orderId = randomUUID();
    try {
      const order = await insertOrder({
        id: orderId,
        lemon_squeezy_order_id: null,
        lemon_squeezy_payment_id: null,
        email,
        user_id: userId,
        product_slug: line.slug,
        quantity: line.qty,
        amount: 0,
        currency: CURRENCY,
        status: "pending",
        ...(couponApplied
          ? {
              subtotal: subtotalMinor,
              discount: subtotalMinor,
              total: 0,
              coupon_code: couponApplied.code,
            }
          : {}),
      });

      // pending → paid: the DB triggers (0011/0014) are the authoritative
      // stampers for coupon usage and paid_at on this transition.
      const paid = await updateOrderStatus(order.id, "paid");
      const paidOrder =
        paid ??
        ({
          ...order,
          status: "paid" as const,
          paid_at: new Date().toISOString(),
        } as Order);

      // Official fulfillment — entitlement + licence + seat + receipt.
      // Idempotent; failures are logged, never surfaced as checkout errors.
      await grantPurchaseForOrder(paidOrder);

      // Command-center toast — only when THIS transition was ours.
      if (paid?.status === "paid") {
        notifyNewSale({
          orderId: order.id,
          email,
          productName: line.name,
          amountMinor: 0,
          currency: CURRENCY,
          seats: line.qty,
        });
      }

      return NextResponse.json({
        orderId: order.id,
        status: "paid",
        free: true,
        mode: lemonSqueezyMode(),
        gateway: "lemon-squeezy",
        productName: line.name,
        quantity: line.qty,
        seats: tier.seats,
        perSeat: tier.perSeat,
        discountPercent: tier.discountPercent,
        subtotal: tier.subtotal,
        total: 0,
        coupon: couponApplied
          ? {
              code: couponApplied.code,
              label: couponApplied.label,
              discountMinor: couponApplied.discountMinor,
            }
          : null,
      });
    } catch (err) {
      console.error("[checkout] free order failed:", err);
      return NextResponse.json(
        {
          error:
            "We couldn't complete your free order. Please try again — nothing was charged.",
        },
        { status: 502 }
      );
    }
  }

  // --- Guard: payments must be configured and usable --------------------
  // lemonSqueezyConfigured(slug) fails closed when the API key, store id,
  // or the variant mapping for this product is missing. Nothing is charged
  // either way.
  if (!lemonSqueezyConfigured(line.slug)) {
    console.error(
      "[checkout] refusing to charge: Lemon Squeezy is not configured for " +
        `product "${line.slug}" (LEMONSQUEEZY_API_KEY / LEMONSQUEEZY_STORE_ID / ` +
        "LEMONSQUEEZY_VARIANT_ID_… missing)."
    );
    return NextResponse.json(
      {
        error:
          "Payments are not configured on this deployment yet. Nothing was charged.",
        code: "payments_not_configured",
      },
      { status: 503 }
    );
  }

  // --- Create our order record, then the Lemon Squeezy checkout ---------
  // The order is inserted FIRST (pending) so the checkout's custom data can
  // carry our order id: the webhook resolves the payment back to this row
  // even if the customer never returns to the site.
  const orderId = randomUUID();

  try {
    const order = await insertOrder({
      id: orderId,
      lemon_squeezy_order_id: null,
      lemon_squeezy_payment_id: null,
      email,
      user_id: userId,
      product_slug: line.slug,
      quantity: line.qty,
      amount: amountMinor,
      currency: CURRENCY,
      status: "pending",
      provider: "lemon-squeezy",
      // Coupon trail — cents, alongside the charged amount. used_count is
      // maintained by the DB's pending→paid trigger, never here.
      ...(couponApplied
        ? {
            subtotal: subtotalMinor,
            discount: couponApplied.discountMinor,
            total: amountMinor,
            coupon_code: couponApplied.code,
          }
        : {}),
    });

    const checkout = await createLemonSqueezyCheckout({
      productSlug: line.slug,
      amountMinor,
      email,
      internalOrderId: orderId,
      productName: line.name,
      redirectUrl: `${site.url}/checkout/complete?order=${orderId}`,
    });

    return NextResponse.json({
      orderId: order.id,
      // The hosted Lemon Squeezy checkout the browser is redirected to.
      // The URL is public by design (signed, expiring) — the API key never
      // leaves the server.
      checkoutUrl: checkout.url,
      amount: amountMinor,
      currency: CURRENCY,
      // Safe public configuration: the resolved store mode. Display-only
      // fact, never a credential.
      mode: lemonSqueezyMode(),
      gateway: "lemon-squeezy",
      productName: line.name,
      quantity: line.qty,
      // Server-resolved team pricing, for display only.
      seats: tier.seats,
      perSeat: tier.perSeat,
      discountPercent: tier.discountPercent,
      subtotal: tier.subtotal,
      total: tier.total,
      // Coupon outcome, decided server-side (null when none applied).
      coupon: couponApplied
        ? {
            code: couponApplied.code,
            label: couponApplied.label,
            discountMinor: couponApplied.discountMinor,
          }
        : null,
    });
  } catch (err) {
    console.error("[checkout] order creation failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't start your payment. Please try again — you have not been charged.",
      },
      { status: 502 }
    );
  }
}
