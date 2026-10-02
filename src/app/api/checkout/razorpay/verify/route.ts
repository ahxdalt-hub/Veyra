import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/orders";
import {
  fetchRazorpayPayment,
  razorpayConfigured,
  verifyPaymentSignature,
} from "@/lib/razorpay";
import { paymentProvider } from "@/lib/payments/provider";
import { takeRateLimit, clientIp } from "@/lib/rate-limit";
import { grantPurchaseForOrder } from "@/lib/fulfillment";
import { notifyNewSale } from "@/lib/admin/notifications";
import { getProduct } from "@/lib/products";

/**
 * POST /api/checkout/razorpay/verify — server-authoritative confirmation
 * for the Razorpay checkout callback (0022 test provider).
 *
 * The browser's Razorpay handler POSTs the callback triple here, but the
 * browser is NEVER trusted alone. In order, server-side:
 *   1. The checkout signature (HMAC over order_id|payment_id, keyed by the
 *      key secret, timing-safe) proves the callback came from Razorpay.
 *   2. The payment is fetched from the Payments API: it must belong to the
 *      Razorpay order we created for THIS internal order, be captured, and
 *      be for exactly the amount we asked for.
 *   3. Only then does the order go pending → paid and fulfillment run —
 *      the same idempotent grant (entitlement + licence + seat + receipt)
 *      the Lemon Squeezy webhook and free-order path use.
 *
 * Double-submits are no-ops: an already-paid order returns ok without
 * re-granting, and the pending→paid transition is conditional.
 */

export async function POST(request: Request) {
  // Razorpay confirmations are only legitimate when PAYMENT_PROVIDER
  // actually declares razorpay — a deployment running Lemon Squeezy must
  // never let this route mark orders paid, even with leftover keys set.
  if (!razorpayConfigured() || paymentProvider() !== "razorpay") {
    return NextResponse.json(
      { error: "Razorpay is not the configured payment provider on this deployment." },
      { status: 503 }
    );
  }

  // Shared throttle (src/lib/rate-limit.ts): this route re-verifies
  // signatures and hits the Payments API — keep scripted replay off it.
  if (!(await takeRateLimit(`checkout:verify:ip:${clientIp(request)}`, 30, 60)).allowed) {
    return NextResponse.json(
      { error: "Too many attempts — try again in a moment." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const payload = body as {
    orderId?: unknown;
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
  };

  const orderId =
    typeof payload.orderId === "string" ? payload.orderId : "";
  const razorpayOrderId =
    typeof payload.razorpay_order_id === "string" ? payload.razorpay_order_id : "";
  const razorpayPaymentId =
    typeof payload.razorpay_payment_id === "string" ? payload.razorpay_payment_id : "";
  const razorpaySignature =
    typeof payload.razorpay_signature === "string" ? payload.razorpay_signature : "";

  if (
    !orderId ||
    !razorpayOrderId ||
    !razorpayPaymentId ||
    !razorpaySignature
  ) {
    return NextResponse.json(
      { error: "Missing payment confirmation details." },
      { status: 400 }
    );
  }

  // 1. Callback authenticity — signature first, nothing else matters yet.
  const signatureValid = verifyPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!signatureValid) {
    console.error(
      "[razorpay-verify] signature mismatch for order " + orderId
    );
    return NextResponse.json(
      { error: "We couldn't verify this payment. Nothing has been confirmed." },
      { status: 400 }
    );
  }

  // 2. The order must be ours, Razorpay, still pending (or already paid —
  //    idempotent replay), and carry the same Razorpay order id.
  const order = await getOrder(orderId);
  if (!order || order.provider !== "razorpay") {
    return NextResponse.json(
      { error: "We couldn't find that order." },
      { status: 404 }
    );
  }
  if (order.razorpay_order_id !== razorpayOrderId) {
    console.error(
      `[razorpay-verify] razorpay order id mismatch: order ${orderId} expects ` +
        `${order.razorpay_order_id}, callback claims ${razorpayOrderId}`
    );
    return NextResponse.json(
      { error: "We couldn't match this payment to your order." },
      { status: 400 }
    );
  }
  if (order.status === "paid") {
    return NextResponse.json({ ok: true, orderId, status: "paid" });
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "This order can no longer be paid." },
      { status: 409 }
    );
  }

  // 3. Authoritative payment check — direct from the Payments API.
  let payment;
  try {
    payment = await fetchRazorpayPayment(razorpayPaymentId);
  } catch (err) {
    console.error("[razorpay-verify] payment fetch failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't confirm your payment right now. If money left your account it is safe — try again in a moment.",
      },
      { status: 502 }
    );
  }
  if (
    payment.order_id !== razorpayOrderId ||
    payment.status !== "captured" ||
    payment.amount !== order.amount
  ) {
    console.error(
      `[razorpay-verify] payment check failed for order ${orderId}: ` +
        `status=${payment.status} amount=${payment.amount}/${order.amount} ` +
        `order_id=${payment.order_id}/${razorpayOrderId}`
    );
    return NextResponse.json(
      { error: "We couldn't confirm this payment. Nothing was completed." },
      { status: 400 }
    );
  }

  // 4. pending → paid, then the standard fulfillment grant.
  const paid = await updateOrderStatus(order.id, "paid", {
    expectedCurrent: "pending",
    razorpayPaymentId,
  });
  const paidOrder =
    paid ??
    ({
      ...order,
      status: "paid" as const,
      paid_at: new Date().toISOString(),
    } as typeof order);

  try {
    await grantPurchaseForOrder(paidOrder);
  } catch (err) {
    // Fulfillment is idempotent and retried by support paths; a hiccup here
    // must not tell the customer their (verified) payment failed.
    console.error("[razorpay-verify] fulfillment failed:", err);
  }

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

  return NextResponse.json({ ok: true, orderId, status: "paid" });
}
