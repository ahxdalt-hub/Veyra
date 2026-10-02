import { NextResponse } from "next/server";
import {
  getOrderByRazorpayOrderId,
  getOrderByRazorpayPaymentId,
  updateOrderStatus,
} from "@/lib/orders";
import {
  razorpayWebhookConfigured,
  verifyWebhookSignature,
  type RazorpayWebhookEvent,
} from "@/lib/razorpay";
import { grantPurchaseForOrder } from "@/lib/fulfillment";
import { revokeAccessForOrder } from "@/lib/refunds";
import { notifyNewSale } from "@/lib/admin/notifications";
import { getProduct } from "@/lib/products";

/**
 * POST /api/webhooks/razorpay — durable payment confirmation for the
 * Razorpay TEST provider (0022).
 *
 * CONFIGURATION-DEPENDENT: inert until RAZORPAY_WEBHOOK_SECRET is set and
 * the webhook URL is registered in the Razorpay dashboard. Until then it
 * answers 503 and trusts nothing. Local dev confirms orders through
 * /api/checkout/razorpay/verify instead (localhost can't receive
 * webhooks) — this endpoint is the belt-and-braces confirmation for any
 * deployment reachable from Razorpay, mirroring the Lemon Squeezy webhook.
 *
 * Verification model (Razorpay's documented scheme): HMAC-SHA256 over the
 * RAW request body with RAZORPAY_WEBHOOK_SECRET, timing-safe compared
 * against the x-razorpay-signature header. Only pending orders can
 * transition, so replays and duplicate deliveries are no-ops.
 *
 * Events handled: order.paid (→ paid + fulfillment), refund.processed
 * (→ access revoked, mirroring the Lemon Squeezy order_refunded path and
 * the advertised refund window). Everything else is acknowledged, inert.
 */

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
    console.error("[razorpay-webhook] signature verification failed");
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 400 }
    );
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const eventName = event.event ?? "";

  // --- order.paid: the durable confirmation ------------------------------
  if (eventName === "order.paid") {
    const rpOrderId = event.payload?.order?.entity?.id ?? "";
    const payment = event.payload?.payment?.entity;
    if (!rpOrderId) {
      return NextResponse.json({ received: true });
    }

    const order = await getOrderByRazorpayOrderId(rpOrderId);
    if (!order) {
      // Not ours (or not yet created) — acknowledge so Razorpay stops
      // retrying; log for reconciliation.
      console.warn(`[razorpay-webhook] order.paid for unknown rp order ${rpOrderId}`);
      return NextResponse.json({ received: true });
    }
    if (order.status !== "pending") {
      // Replay or late delivery after resolve — already handled elsewhere.
      return NextResponse.json({ received: true });
    }
    // Amount discipline: the webhook's payment must be for exactly the
    // amount we asked for (same number we set on the Razorpay order).
    if (payment?.amount !== undefined && payment.amount !== order.amount) {
      console.error(
        `[razorpay-webhook] amount mismatch for order ${order.id}: ` +
          `${payment.amount} ≠ ${order.amount} — NOT confirming`
      );
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const paid = await updateOrderStatus(order.id, "paid", {
      expectedCurrent: "pending",
      razorpayPaymentId: payment?.id ?? null,
    });
    const paidOrder =
      paid ??
      ({
        ...order,
        status: "paid" as const,
        paid_at: new Date().toISOString(),
      } as typeof order);

    await grantPurchaseForOrder(paidOrder);

    if (paid?.status === "paid") {
      const product = getProduct(order.product_slug);
      notifyNewSale({
        orderId: order.id,
        email: order.email,
        productName: product?.name ?? order.product_slug,
        amountMinor: order.amount,
        currency: order.currency,
        seats: order.quantity,
      });
    }
    return NextResponse.json({ received: true });
  }

  // --- refund.processed: money came back, access goes away ---------------
  if (eventName === "refund.processed") {
    const rpPaymentId = event.payload?.payment?.entity?.id ?? "";
    if (!rpPaymentId) {
      return NextResponse.json({ received: true });
    }
    const order = await getOrderByRazorpayPaymentId(rpPaymentId);
    if (!order || order.status === "refunded") {
      return NextResponse.json({ received: true });
    }
    if (order.status !== "paid") {
      return NextResponse.json({ received: true });
    }
    await updateOrderStatus(order.id, "refunded", {
      expectedCurrent: "paid",
    });
    const revoked = await revokeAccessForOrder(order);
    console.log(
      `[razorpay-webhook] refund.processed for ${order.id}: access ${revoked ? "revoked" : "revoke FAILED"}`
    );
    return NextResponse.json({ received: true });
  }

  // Everything else — acknowledged, left inert.
  return NextResponse.json({ received: true });
}
