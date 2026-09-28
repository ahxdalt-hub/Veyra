import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import {
  lemonSqueezyWebhookConfigured,
  verifyWebhookSignature,
  type LemonSqueezyOrderEvent,
} from "@/lib/lemon-squeezy";
import { grantPurchaseForOrder } from "@/lib/fulfillment";
import { revokeAccessForOrder } from "@/lib/refunds";
import { notifyNewSale } from "@/lib/admin/notifications";

/**
 * POST /api/webhooks/lemonsqueezy — durable payment confirmation.
 *
 * CONFIGURATION-DEPENDENT: this endpoint is inert until
 * LEMONSQUEEZY_WEBHOOK_SECRET is set and the webhook URL is registered in
 * the Lemon Squeezy dashboard (Store → Settings → Webhooks, event
 * "Order created" — plus "Order refunded" for the refund window). Until
 * then it answers 503 and trusts nothing.
 *
 * This is the ONLY confirmation path: Lemon Squeezy's hosted checkout has
 * no browser-side signature callback, so the redirect back to
 * /checkout/complete is decoration — the order becomes paid here, or not
 * at all.
 *
 * Verification model (Lemon Squeezy's documented scheme):
 *   1. HMAC-SHA256 over the raw request body with LEMONSQUEEZY_WEBHOOK_SECRET,
 *      timing-safe compared against the signature header.
 *   2. The order is resolved through the checkout's custom data
 *      (meta.custom_event_data.veyra_order_id), which rides along on every
 *      order event. Only pending orders can transition, so replays and
 *      duplicate deliveries are no-ops.
 *   3. An order must carry a genuinely placed status and a subtotal that
 *      matches the amount we set as custom_price before it becomes paid.
 *
 * Events handled: order_created (→ paid + fulfillment), order_refunded
 * (→ revoked access via src/lib/refunds.ts — the advertised refund window
 * in code). Everything else is acknowledged and left inert.
 */

export async function POST(request: Request) {
  if (!lemonSqueezyWebhookConfigured()) {
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 503 }
    );
  }

  // The signature covers the raw bytes — read before any JSON parsing.
  const rawBody = await request.text();
  // Lemon Squeezy documents X-Signature; some deliveries have used the
  // fully-qualified name — accept either, never both-at-once ambiguity.
  const signature =
    request.headers.get("x-signature") ??
    request.headers.get("x-lemonsqueezy-signature") ??
    "";

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    // Genuine mismatches are a security signal; log server-side only.
    console.warn("[ls-webhook] rejected: invalid or missing signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: LemonSqueezyOrderEvent;
  try {
    event = JSON.parse(rawBody) as LemonSqueezyOrderEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const attrs = event.data?.attributes;
  const meta = event.data?.meta;
  const eventName = meta?.event_name ?? "";
  const lsOrderId = attrs?.order_id ?? "unknown";

  const custom = (meta?.custom_event_data ?? {}) as Record<string, unknown>;
  const veyraOrderId =
    typeof custom.veyra_order_id === "string" ? custom.veyra_order_id : null;

  if (eventName !== "order_created" && eventName !== "order_refunded") {
    // Acknowledge so Lemon Squeezy stops retrying; nothing to do yet.
    return NextResponse.json({ received: true });
  }

  if (!veyraOrderId) {
    // Not one of ours (a checkout created without our custom data).
    // Acknowledge — retrying can never make an unknown order exist.
    console.warn(`[ls-webhook] ${eventName} for ${lsOrderId} carries no veyra_order_id`);
    return NextResponse.json({ received: true });
  }

  let order;
  try {
    order = await getOrder(veyraOrderId);
  } catch (err) {
    console.error("[ls-webhook] order lookup failed:", err);
    // 500 → Lemon Squeezy retries the delivery later.
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }

  if (!order) {
    console.warn(
      `[ls-webhook] no order ${veyraOrderId} for ${eventName} (${lsOrderId})`
    );
    return NextResponse.json({ received: true });
  }

  try {
    if (eventName === "order_refunded") {
      // Money came back, so access goes away. revokeAccessForOrder flips
      // the order paid → refunded conditionally, so event replays and
      // follow-up deliveries are safe no-ops after the first revocation.
      // Policy: ANY refund on an order revokes the whole order's access.
      if (order.status !== "paid") {
        // An unpaid order cannot be refunded — mark it refunded anyway so
        // the ledger mirrors Lemon Squeezy, but skip the revocation writes.
        await updateOrderStatus(order.id, "refunded", {
          expectedCurrent: order.status,
        });
        console.warn(
          `[ls-webhook] refund for non-paid order ${order.id} (${order.status}) — recorded, nothing to revoke`
        );
        return NextResponse.json({ received: true });
      }
      const revoked = await revokeAccessForOrder(order);
      console.log(
        `[ls-webhook] refund ${lsOrderId} for order ${order.id} — ` +
          `${revoked ? "access revoked" : "already handled (no-op)"}`
      );
      return NextResponse.json({ received: true });
    }

    // --- order_created ---------------------------------------------------
    // The event must carry a genuinely placed (paid) order: a pending or
    // failed order under 'order_created' is ignored — never allowed to
    // move an order to paid.
    if (attrs?.status && attrs.status !== "paid") {
      console.warn(
        `[ls-webhook] ignoring order_created carrying status ` +
          `"${attrs.status}" for order ${order.id}`
      );
      return NextResponse.json({ received: true });
    }

    // Amount consistency: our custom_price must equal the order subtotal
    // (cents, pre-tax — Lemon Squeezy adds tax on top of subtotal).
    const expectedNet = order.amount;
    const paidNet = (attrs?.subtotal ?? 0) - (attrs?.discount_total ?? 0);
    if (
      attrs?.subtotal === undefined ||
      paidNet !== expectedNet ||
      (attrs.currency && attrs.currency.toUpperCase() !== order.currency)
    ) {
      // Never transition on a mismatch — surface it for investigation.
      console.error(
        `[ls-webhook] amount/currency mismatch for order ${order.id}: ` +
          `expected ${expectedNet} ${order.currency}, ` +
          `got subtotal ${attrs?.subtotal} discount ${attrs?.discount_total} ` +
          `currency ${attrs?.currency} (${lsOrderId})`
      );
      return NextResponse.json({ received: true });
    }

    // Re-delivery of an already-confirmed order is NOT an early return:
    // grantPurchaseForOrder is idempotent end-to-end (unique constraints
    // on entitlement/licence/seat + the email_events ledger), so replaying
    // here also HEALS a first delivery that died mid-fulfillment — without
    // ever producing duplicate records or duplicate emails.
    const updated = await updateOrderStatus(order.id, "paid", {
      expectedCurrent: "pending",
      lemonSqueezyOrderId: attrs?.order_id ?? null,
      lemonSqueezyPaymentId: event.data?.id ?? null,
    });
    let reconciled = updated;
    if (!reconciled && order.status !== "paid" && order.status !== "refunded") {
      // The browser may have raced us (a cancelled marker from an abandoned
      // checkout) — a verified Lemon Squeezy payment is authoritative, so
      // reconcile the row into 'paid' from any non-paid state.
      reconciled = await updateOrderStatus(order.id, "paid", {
        expectedCurrent: order.status,
        lemonSqueezyOrderId: attrs?.order_id ?? null,
        lemonSqueezyPaymentId: event.data?.id ?? null,
      });
      if (reconciled) {
        console.warn(
          `[ls-webhook] reconciled ${order.status}→paid for order ${order.id} ` +
            `(placed order ${lsOrderId} overrides earlier ${order.status})`
        );
      }
    }
    console.log(
      `[ls-webhook] order_created ${lsOrderId} for order ${order.id} ` +
        `(order was ${order.status} before this delivery)`
    );
    await grantPurchaseForOrder({ ...order, status: "paid" });
    // Command-center toast — only when THIS delivery made the flip
    // (a null row from the conditional update means an earlier delivery
    // already confirmed it and notified).
    if (reconciled?.status === "paid") {
      notifyNewSale({
        orderId: order.id,
        email: order.email,
        productName: getProduct(order.product_slug)?.name ?? order.product_slug,
        amountMinor: order.amount,
        currency: order.currency,
        seats: order.quantity,
      });
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[ls-webhook] order update failed:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
