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
import {
  notifyOrderPaid,
  notifyOrderRefunded,
  parseReferralToken,
} from "@/lib/partner-attribution";

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
 *      (meta.custom_data.veyra_order_id, with custom_event_data as a
 *      legacy fallback), which rides along on every order event. Only
 *      pending orders can transition, so replays and duplicate deliveries
 *      are no-ops.
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
  // LS puts event_name and custom data in the payload's TOP-LEVEL meta, never
  // under data. Genuine LS webhooks carry the checkout's custom data as
  // meta.custom_data (per docs.lemonsqueezy.com/help/webhooks/webhook-requests
  // — verified against live deliveries); custom_event_data is accepted as a
  // legacy fallback so hand-built/replayed payloads keep working.
  const meta = event.meta;
  const eventName = meta?.event_name ?? "";
  // LS order payloads carry the human order number as `order_number` (an
  // integer); `order_id` is not a field the API ever sends, so reading it
  // alone resolved to "unknown" on every real delivery — which silently
  // disabled both LS-reference stamping and partner attribution.
  const lsOrderId =
    attrs?.order_number != null ? String(attrs.order_number) : "unknown";

  const custom = (meta?.custom_data ?? meta?.custom_event_data ?? {}) as Record<string, unknown>;
  const veyraOrderId =
    typeof custom.veyra_order_id === "string" ? custom.veyra_order_id : null;
  // Opaque Caelmont partner marker, if this checkout was entered through a
  // partner link. Veyra never decodes it — it just hands it back, signed, so
  // Caelmont can verify the HMAC and credit the right partner. Absent for
  // every direct buyer, which is the normal case.
  const cmRef = parseReferralToken(custom.cm_ref);

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
      //
      // The partner void runs BEFORE the status split on purpose: a retried
      // delivery always lands in the non-paid branch, so notifying only in
      // the paid branch would strand a void that failed transiently.
      // Caelmont keys the void on order_id and answers 200 for an order it
      // never credited, so re-attempting on replay is always safe.
      let voidNeedsRetry = false;
      if (cmRef && lsOrderId !== "unknown") {
        try {
          const outcome = await notifyOrderRefunded({ lsOrderId, token: cmRef });
          console.log(`[ls-webhook] partner refund void ${lsOrderId}: ${outcome}`);
          voidNeedsRetry = outcome === "retry";
        } catch (err) {
          console.error(`[ls-webhook] partner refund void threw for ${lsOrderId}:`, err);
          voidNeedsRetry = true;
        }
      }
      if (order.status !== "paid") {
        // An unpaid order cannot be refunded — mark it refunded anyway so
        // the ledger mirrors Lemon Squeezy, but skip the revocation writes.
        await updateOrderStatus(order.id, "refunded", {
          expectedCurrent: order.status,
        });
        console.warn(
          `[ls-webhook] refund for non-paid order ${order.id} (${order.status}) — recorded, nothing to revoke`
        );
        if (voidNeedsRetry) {
          return NextResponse.json(
            { error: "Partner void not delivered; retrying." },
            { status: 500 }
          );
        }
        return NextResponse.json({ received: true });
      }
      const revoked = await revokeAccessForOrder(order);
      console.log(
        `[ls-webhook] refund ${lsOrderId} for order ${order.id} — ` +
          `${revoked ? "access revoked" : "already handled (no-op)"}`
      );
      if (voidNeedsRetry) {
        // Revocation is durable; only the Caelmont void needs another pass.
        // LS re-delivery replays this branch idempotently until it lands.
        return NextResponse.json(
          { error: "Partner void not delivered; retrying." },
          { status: 500 }
        );
      }
      return NextResponse.json({ received: true });
    }

    // --- order_created ---------------------------------------------------
    // The event must carry a genuinely placed (paid) order: anything else
    // under 'order_created' is ignored — never allowed to move an order
    // to paid.
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
      lemonSqueezyOrderId: lsOrderId !== "unknown" ? lsOrderId : null,
      lemonSqueezyPaymentId: event.data?.id ?? null,
    });
    const reconciled = updated;
    // No other reconcile path: the order state machine is pending → paid →
    // refunded (0026), and the conditional update above is the only legal
    // pending→paid transition. A late event on a paid/refunded order is an
    // idempotent no-op for the row (grantPurchaseForOrder below still
    // heals a fulfillment that died mid-grant).
    console.log(
      `[ls-webhook] order_created ${lsOrderId} for order ${order.id} ` +
        `(order was ${order.status} before this delivery)`
    );
    await grantPurchaseForOrder({ ...order, status: "paid" });
    // Partner attribution — AFTER the sale is durably fulfilled, and a
    // transient failure now fails the delivery on purpose: the customer's
    // grant is already committed (replay heals idempotently), so a 5xx here
    // makes Lemon Squeezy re-deliver and the commission lands on the next
    // attempt instead of being silently lost. Caelmont dedupes on order_id,
    // so repeats can never double-pay. A permanent 4xx ("rejected") or an
    // unconfigured secret still returns 200 — retrying can't fix those, and
    // they must never hold up the customer's purchase.
    let attributionNeedsRetry = false;
    if (cmRef && lsOrderId !== "unknown") {
      try {
        const outcome = await notifyOrderPaid({
          lsOrderId,
          token: cmRef,
          amountMinor: order.amount,
          currency: order.currency,
        });
        console.log(`[ls-webhook] partner attribution ${lsOrderId}: ${outcome}`);
        attributionNeedsRetry = outcome === "retry";
      } catch (err) {
        console.error(`[ls-webhook] partner attribution POST threw for ${lsOrderId}:`, err);
        attributionNeedsRetry = true;
      }
    }
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
    if (attributionNeedsRetry) {
      return NextResponse.json(
        { error: "Partner credit not delivered; retrying." },
        { status: 500 }
      );
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[ls-webhook] order update failed:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
