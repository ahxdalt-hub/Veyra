import { NextResponse } from "next/server";
import {
  getOrderByRazorpayOrderId,
  updateOrderStatus,
} from "@/lib/orders";
import { getProduct } from "@/lib/products";
import {
  razorpayWebhookConfigured,
  verifyWebhookSignature,
} from "@/lib/razorpay";
import { grantPurchaseForOrder } from "@/lib/fulfillment";
import { notifyNewSale, notifyPaymentFailed } from "@/lib/admin/notifications";

/**
 * POST /api/webhooks/razorpay — durable payment confirmation.
 *
 * CONFIGURATION-DEPENDENT: this endpoint is inert until
 * RAZORPAY_WEBHOOK_SECRET is set and the webhook URL is registered in the
 * Razorpay dashboard (Settings → Webhooks). Until then it answers 503 and
 * trusts nothing — there is no local/test event path.
 *
 * Verification model (Razorpay's documented scheme):
 *   1. HMAC-SHA256 over the raw request body with RAZORPAY_WEBHOOK_SECRET,
 *      timing-safe compared against the x-razorpay-signature header.
 *   2. The order is resolved by razorpay_order_id; only pending orders can
 *      transition, so replays and duplicate deliveries are no-ops.
 *   3. A 'captured' event additionally must match the stored amount and
 *      currency before an order becomes paid.
 *
 * Events handled: payment.captured, payment.failed. Other documented
 * events (order.paid, refund.processed, …) are acknowledged and left for
 * the fulfillment phase.
 */

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        currency?: string;
        error_description?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  if (!razorpayWebhookConfigured()) {
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 503 }
    );
  }

  // The signature covers the raw bytes — read before any JSON parsing.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  // Razorpay's per-delivery event id (unique per event). Recorded for
  // duplicate tracing only — idempotency is enforced by the database
  // (conditional status transitions + the 0002 unique constraints), which
  // is what makes a replay safe even if this header is missing.
  const eventId = request.headers.get("x-razorpay-event-id") ?? "unknown";

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    // Genuine mismatches are a security signal; log server-side only.
    console.warn("[webhook] rejected: invalid or missing signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const eventName = event.event ?? "";
  const payment = event.payload?.payment?.entity;

  if (eventName !== "payment.captured" && eventName !== "payment.failed") {
    // Acknowledge so Razorpay stops retrying; nothing to do yet.
    return NextResponse.json({ received: true });
  }

  if (!payment?.order_id || !payment.id) {
    return NextResponse.json({ error: "Incomplete payment payload." }, { status: 400 });
  }

  let order;
  try {
    order = await getOrderByRazorpayOrderId(payment.order_id);
  } catch (err) {
    console.error("[webhook] order lookup failed:", err);
    // 500 → Razorpay retries the delivery later.
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }

  if (!order) {
    // Not one of ours (or created after this delivery). Acknowledge —
    // retrying can never make an unknown order exist.
    console.warn(`[webhook] no order for razorpay_order_id ${payment.order_id}`);
    return NextResponse.json({ received: true });
  }

  try {
    if (eventName === "payment.captured") {
      // Event ↔ payment-statement consistency: a 'captured' event must
      // actually carry a captured (or authorized) payment. An event whose
      // payment status says otherwise is acknowledged and ignored — it is
      // never allowed to move an order to paid.
      if (
        payment.status !== undefined &&
        payment.status !== "captured" &&
        payment.status !== "authorized"
      ) {
        console.warn(
          `[webhook] ${eventId}: ignoring payment.captured carrying status ` +
            `"${payment.status}" for order ${order.id}`
        );
        return NextResponse.json({ received: true });
      }
      // Re-delivery of an already-confirmed order. NOT an early return:
      // grantPurchaseForOrder is idempotent end-to-end (unique constraints
      // on entitlement/licence/seat + the email_events ledger), so replaying
      // here also HEALS a first delivery that died mid-fulfillment — a paid
      // order whose licence or receipt email never completed — without ever
      // producing duplicate records or duplicate emails.
      if (
        payment.amount !== order.amount ||
        payment.currency !== order.currency
      ) {
        // Never transition on a mismatch — surface it for investigation.
        console.error(
          `[webhook] amount/currency mismatch for order ${order.id}: ` +
            `expected ${order.amount} ${order.currency}, ` +
            `got ${payment.amount} ${payment.currency}`
        );
        return NextResponse.json({ received: true });
      }
      const updated = await updateOrderStatus(order.id, "paid", {
        expectedCurrent: "pending",
        razorpayPaymentId: payment.id,
      });
      // Reconciliation: money was CAPTURED (amount + signature verified).
      // A cancelled or failed status here means the browser raced us (modal
      // dismissed, or a premature failure report) — the authoritative event
      // wins, so reconcile the row into 'paid' from any non-paid state.
      // 'refunded' stays untouched (that needs refund.processed handling).
      let reconciled = updated;
      if (!reconciled && order.status !== "paid" && order.status !== "refunded") {
        reconciled = await updateOrderStatus(order.id, "paid", {
          expectedCurrent: order.status,
          razorpayPaymentId: payment.id,
        });
        if (reconciled) {
          console.warn(
            `[webhook] reconciled ${order.status}→paid for order ${order.id} ` +
              `(captured payment ${payment.id} overrides earlier ${order.status})`
          );
        }
      }
      // Durable confirmation → fulfillment. Idempotent; safe even when
      // the verify route already granted (or will grant) the same order.
      // A duplicate delivery of this same event re-runs the grant as a
      // no-op: entitlements/licences/seats are unique-keyed and the receipt
      // ledger is unique on (order_id, email_type).
      console.log(
        `[webhook] ${eventId}: payment.captured for order ${order.id} ` +
          `(order was ${order.status} before this delivery)`
      );
      await grantPurchaseForOrder({ ...order, status: "paid" });
      // Command-center toast — only when THIS delivery made the flip
      // (a null row from the conditional update means the verify route
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
    }

    // payment.failed — only ever from pending; a verified payment cannot
    // be failed by a late event (conditional update enforces it). The event
    // must also carry a genuinely failed payment: a captured payment
    // under a 'failed' event is ignored (the captured branch owns it).
    if (payment.status !== undefined && payment.status !== "failed") {
      console.warn(
        `[webhook] ${eventId}: ignoring payment.failed carrying status ` +
          `"${payment.status}" for order ${order.id}`
      );
      return NextResponse.json({ received: true });
    }
    const failed = await updateOrderStatus(order.id, "failed", {
      expectedCurrent: "pending",
      razorpayPaymentId: payment.id,
    });
    if (failed) {
      console.warn(
        `[webhook] payment failed for order ${order.id} (${order.email}) — event ${eventId}`
      );
      notifyPaymentFailed({
        orderId: order.id,
        email: order.email,
        productName: getProduct(order.product_slug)?.name ?? order.product_slug,
        amountMinor: order.amount,
        currency: order.currency,
      });
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] order update failed:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
