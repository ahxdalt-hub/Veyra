import { NextResponse } from "next/server";
import {
  getOrderByRazorpayOrderId,
  updateOrderStatus,
} from "@/lib/orders";
import {
  razorpayWebhookConfigured,
  verifyWebhookSignature,
} from "@/lib/razorpay";

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
      // Idempotent replay of an already-confirmed order.
      if (order.status === "paid") {
        return NextResponse.json({ received: true });
      }
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
      await updateOrderStatus(order.id, "paid", {
        expectedCurrent: "pending",
        razorpayPaymentId: payment.id,
      });
      return NextResponse.json({ received: true });
    }

    // payment.failed — only ever from pending; a verified payment cannot
    // be failed by a late event (conditional update enforces it).
    await updateOrderStatus(order.id, "failed", {
      expectedCurrent: "pending",
      razorpayPaymentId: payment.id,
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook] order update failed:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
