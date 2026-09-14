import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/orders";

/**
 * POST /api/checkout/cancel — customer dismissed the Razorpay modal.
 *
 * Only transitions pending → cancelled; a verified payment can never be
 * cancelled by this route (the conditional update enforces it).
 */

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const orderId = (body as { orderId?: unknown }).orderId;
  if (typeof orderId !== "string") {
    return NextResponse.json({ error: "Missing order id." }, { status: 422 });
  }

  try {
    const order = await getOrder(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const updated = await updateOrderStatus(orderId, "cancelled", {
      expectedCurrent: "pending",
    });
    return NextResponse.json({
      status: updated?.status ?? order.status,
      orderId,
    });
  } catch (err) {
    console.error("[cancel] failed:", err);
    return NextResponse.json({ error: "Could not update order." }, { status: 500 });
  }
}
