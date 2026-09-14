import { NextResponse } from "next/server";
import { getOrder, publicOrder } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import { getSessionUser } from "@/lib/supabase/server";

/**
 * GET /api/orders/[id] — order status for client polling.
 *
 * Returns a safe projection (no Razorpay identifiers). Used by the result
 * page while an order's verification is still pending.
 *
 * Ownership: guest orders (user_id null) are pollable by anyone holding
 * the order's unguessable uuid — that is the guest receipt mechanism the
 * result page relies on. Account-linked orders are visible only to the
 * owning user; any other caller gets a 404 that doesn't reveal whether
 * the order exists.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 422 });
  }

  let order;
  try {
    order = await getOrder(id);
  } catch (err) {
    console.error("[orders] fetch failed:", err);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.user_id) {
    const user = await getSessionUser();
    if (!user || user.id !== order.user_id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
  }

  const product = getProduct(order.product_slug);
  return NextResponse.json({
    ...publicOrder(order),
    productName: product?.name ?? order.product_slug,
  });
}
