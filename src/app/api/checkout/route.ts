import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { resolvePurchasableProduct } from "@/lib/products";
import { CURRENCY } from "@/lib/site";
import {
  createRazorpayOrder,
  razorpayConfigured,
} from "@/lib/razorpay";
import { insertOrder } from "@/lib/orders";

/**
 * POST /api/checkout — create a payment order.
 *
 * Security model:
 *  - The client sends ONLY slugs, quantities, and an email. No prices,
 *    no totals — the amount is computed here from the catalog and is the
 *    sole number trusted by Razorpay and the orders table.
 *  - Products must be currently purchasable (coming-soon slugs are
 *    rejected) and Stage 02 supports a single distinct product per order.
 *  - The Razorpay order is created server-side; the response exposes only
 *    public data (key id, razorpay order id, amount, currency).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_QTY = 5;

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
    unitPriceRupees: number;
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
    // Integer quantity, clamped to a sane range.
    const qty = Math.floor(Number(rawQty ?? 1));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY) {
      return NextResponse.json(
        { error: `Quantity must be between 1 and ${MAX_QTY}.` },
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
      unitPriceRupees: product.price,
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

  const line = resolved[0];
  const amountPaise = line.unitPriceRupees * 100 * line.qty;

  // --- Guard: payments must be configured -------------------------------
  if (!razorpayConfigured()) {
    return NextResponse.json(
      {
        error:
          "Payments are not configured on this deployment yet. Nothing was charged.",
        code: "payments_not_configured",
      },
      { status: 503 }
    );
  }

  // --- Create the Razorpay order, then record ours ----------------------
  const orderId = randomUUID();
  try {
    const rzpOrder = await createRazorpayOrder({
      amountPaise,
      currency: CURRENCY,
      receipt: orderId,
      notes: {
        internal_order_id: orderId,
        product_slug: line.slug,
      },
    });

    const order = await insertOrder({
      id: orderId,
      razorpay_order_id: rzpOrder.id,
      razorpay_payment_id: null,
      email,
      product_slug: line.slug,
      quantity: line.qty,
      amount: amountPaise,
      currency: CURRENCY,
      status: "pending",
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      productName: line.name,
      quantity: line.qty,
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
