import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/orders";
import {
  fetchRazorpayPayment,
  verifyPaymentSignature,
} from "@/lib/razorpay";

/**
 * POST /api/checkout/verify — confirm a payment server-side.
 *
 * The browser returns from Razorpay's modal with a signature; we treat it
 * as a *claim*, not a fact. Trust is established by:
 *   1. The signature check (HMAC with the server-held key secret).
 *   2. The order existing in our table with a matching razorpay_order_id.
 *   3. The payment's authoritative status fetched from Razorpay's API.
 *
 * Only then does an order become 'paid'. A failed/invalid verification
 * marks the order 'failed'.
 *
 * /api/webhooks/razorpay is the durable twin of this route: the same
 * pending→paid transition keyed on razorpay_order_id, triggered by a
 * signature-verified webhook instead of the returning browser.
 */

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    body as Record<string, unknown>;

  if (
    typeof orderId !== "string" ||
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing payment confirmation details." },
      { status: 422 }
    );
  }

  let order;
  try {
    order = await getOrder(orderId);
  } catch (err) {
    console.error("[verify] order fetch failed:", err);
    return NextResponse.json({ error: "Order lookup failed." }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // The claimed Razorpay order must be the one we created.
  if (order.razorpay_order_id !== razorpay_order_id) {
    await updateOrderStatus(order.id, "failed", {
      expectedCurrent: "pending",
    }).catch(() => null);
    return NextResponse.json(
      { error: "Payment could not be verified." },
      { status: 400 }
    );
  }

  // Already resolved? Idempotent — return the known state.
  if (order.status === "paid") {
    return NextResponse.json({ status: "paid", orderId: order.id });
  }

  // 1. Signature check.
  const signatureValid = verifyPaymentSignature({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!signatureValid) {
    console.warn(
      `[verify] signature mismatch for order ${order.id} — marking failed`
    );
    await updateOrderStatus(order.id, "failed", {
      expectedCurrent: "pending",
    }).catch(() => null);
    return NextResponse.json(
      { error: "Payment could not be verified. If you were charged, contact us." },
      { status: 400 }
    );
  }

  // 2. Authoritative payment state from Razorpay.
  try {
    const payment = await fetchRazorpayPayment(razorpay_payment_id);

    if (payment.status === "captured" || payment.status === "authorized") {
      const updated = await updateOrderStatus(order.id, "paid", {
        expectedCurrent: "pending",
        razorpayPaymentId: payment.id,
      });
      return NextResponse.json({
        status: updated?.status ?? "paid",
        orderId: order.id,
      });
    }

    // Any other state (failed / refunded / created-stuck) is not a purchase.
    await updateOrderStatus(order.id, "failed", {
      expectedCurrent: "pending",
      razorpayPaymentId: payment.id,
    }).catch(() => null);
    return NextResponse.json(
      {
        status: "failed",
        error:
          payment.error_description ??
          "The payment did not complete. You have not been charged.",
      },
      { status: 402 }
    );
  } catch (err) {
    // Signature was valid but Razorpay's API couldn't confirm right now.
    // Leave the order pending — verification stays genuinely unresolved,
    // and the result page communicates that honestly (webhooks later make
    // this durable).
    console.error("[verify] payment fetch failed:", err);
    return NextResponse.json(
      {
        status: "pending",
        error:
          "Your payment went through, but we couldn't confirm it yet. Your order is being verified — please check the result page in a moment.",
      },
      { status: 502 }
    );
  }
}
