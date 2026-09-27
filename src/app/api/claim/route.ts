import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getProduct, isFreeProduct } from "@/lib/products";
import { CURRENCY } from "@/lib/site";
import { insertOrder, updateOrderStatus } from "@/lib/orders";
import type { Order } from "@/lib/orders";
import { grantPurchaseForOrder } from "@/lib/fulfillment";
import { notifyNewSale } from "@/lib/admin/notifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";

/**
 * POST /api/claim — free-tool acquisition (the Growth Audit).
 * GET  /api/claim?slug=… — ownership status for the signed-in user.
 *
 * Free products deliberately do NOT go through cart/checkout:
 * resolvePurchasableProduct excludes them, so the seat-tier pricing path
 * can never see one. Claiming walks the REAL order lifecycle instead —
 * inserted as pending, confirmed to paid with amount 0 — so fulfillment
 * (entitlement + licence + seat + delivery email) is the exact same
 * idempotent chain the payment webhook runs. The DB trigger stamps
 * paid_at on the transition just as a card payment would.
 */

async function sessionUser() {
  if (!supabaseAuthConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/** The caller's active entitlement for a slug, if any (RLS-scoped read). */
async function ownedEntitlement(slug: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("entitlements")
    .select("id")
    .eq("product_slug", slug)
    .eq("status", "active")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  const product = getProduct(slug);
  if (!product || !isFreeProduct(product)) {
    return NextResponse.json({ error: "Unknown free product." }, { status: 404 });
  }

  const user = await sessionUser();
  if (!user) return NextResponse.json({ signedIn: false, owned: false });

  const owned = await ownedEntitlement(slug, user.id);
  return NextResponse.json({
    signedIn: true,
    owned: Boolean(owned),
    email: user.email ?? null,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawSlug =
    typeof body === "object" && body !== null
      ? (body as { slug?: unknown }).slug
      : undefined;

  const product = typeof rawSlug === "string" ? getProduct(rawSlug) : undefined;
  if (!product || !isFreeProduct(product) || product.status !== "available") {
    return NextResponse.json(
      { error: "That product can’t be claimed for free." },
      { status: 404 }
    );
  }
  const slug: string = product.slug;

  const user = await sessionUser();
  if (!user || !user.email) {
    return NextResponse.json(
      { error: "Please sign in first.", signInRequired: true },
      { status: 401 }
    );
  }

  const email = user.email.trim().toLowerCase();

  try {
    // Idempotency: a second claim is a no-op that reports the first.
    const existing = await ownedEntitlement(slug, user.id);
    if (existing) {
      return NextResponse.json({ ok: true, already: true });
    }

    const orderId = randomUUID();
    const order = await insertOrder({
      id: orderId,
      razorpay_order_id: null,
      razorpay_payment_id: null,
      email,
      user_id: user.id,
      product_slug: slug,
      quantity: 1,
      amount: 0,
      currency: CURRENCY,
      status: "pending",
      provider: "free-claim",
    });

    // pending → paid through the conditional update — the same call the
    // free-coupon checkout makes. The DB trigger stamps paid_at.
    const paid = await updateOrderStatus(order.id, "paid");
    const paidOrder =
      paid ??
      ({
        ...order,
        status: "paid" as const,
        paid_at: new Date().toISOString(),
      } as Order);

    // Official fulfillment — entitlement + licence + seat + delivery email.
    // Idempotent; never throws into this response path.
    await grantPurchaseForOrder(paidOrder);

    notifyNewSale({
      orderId: order.id,
      email,
      productName: product.name,
      amountMinor: 0,
      currency: CURRENCY,
      seats: 1,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[claim] free claim failed for ${slug}:`, err);
    return NextResponse.json(
      {
        error:
          "We couldn’t complete your claim. Nothing was charged — please try again.",
      },
      { status: 502 }
    );
  }
}
