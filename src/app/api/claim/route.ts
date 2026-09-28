import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getProduct, isFreeProduct } from "@/lib/products";
import { CURRENCY } from "@/lib/site";
import {
  getFreeClaimOrder,
  insertOrder,
  updateOrderStatus,
} from "@/lib/orders";
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
 *
 * One claim per account is a database rule (0019 unique index on
 * free-claim orders per user+slug), not just the pre-check below: a lost
 * race surfaces as a 23505, which is handled as "already claimed" — with
 * a fulfillment heal on the winning order in case it died mid-grant.
 * The audit itself is only reachable by owners; the /audit page renders
 * nothing for anyone without an active entitlement.
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

/* ------------------------------------------------------------------ */
/* Best-effort rate limit: 10 POSTs / 10 min / client IP              */
/* (same shape as /api/subscribe — cheap protection against scripted  */
/* claim spam; the 0019 unique index is the real one-per-account cap) */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
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

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests — please try again in a few minutes." },
      { status: 429 }
    );
  }

  const email = user.email.trim().toLowerCase();

  // The winning claim order, whether we just created it or lost the race
  // to an identical one (0019 unique index) / an earlier interrupted
  // attempt. `fresh` only gates the admin sale notification — fulfillment
  // itself is idempotent either way.
  let order: Order;
  let fresh = false;

  try {
    // Fast path: an existing active entitlement makes this a no-op.
    const existing = await ownedEntitlement(slug, user.id);
    if (existing) {
      return NextResponse.json({ ok: true, already: true });
    }

    const orderId = randomUUID();
    order = await insertOrder({
      id: orderId,
      lemon_squeezy_order_id: null,
      lemon_squeezy_payment_id: null,
      email,
      user_id: user.id,
      product_slug: slug,
      quantity: 1,
      amount: 0,
      currency: CURRENCY,
      status: "pending",
      provider: "free-claim",
    });
    fresh = true;
  } catch (err) {
    if (/23505/.test(String(err))) {
      // Unique violation on (user_id, product_slug) for free-claim
      // orders: this account already owns this claim — possibly a
      // concurrent request whose grant hasn't landed yet, or an old
      // attempt that died before fulfillment. Re-read the winning
      // order, and heal below rather than creating a second one.
      try {
        const prior = await getFreeClaimOrder(user.id, slug);
        if (!prior) {
          // The violation was real but the row is gone (racing
          // delete); the entitlement check above covers the normal
          // case, so report the claim as done.
          return NextResponse.json({ ok: true, already: true });
        }
        order = prior;
      } catch {
        return NextResponse.json(
          {
            error:
              "We couldn’t complete your claim. Nothing was charged — please try again.",
          },
          { status: 502 }
        );
      }
    } else {
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

  try {
    // pending → paid through the conditional update — the same call the
    // free-coupon checkout makes. The DB trigger stamps paid_at. A
    // conflict-recovered order that's already paid short-circuits here.
    const paid =
      order.status === "paid"
        ? order
        : (await updateOrderStatus(order.id, "paid")) ??
          ({
            ...order,
            status: "paid" as const,
            paid_at: new Date().toISOString(),
          } as Order);

    // Official fulfillment — entitlement + licence + seat + delivery
    // email. Idempotent; never throws into this response path. Re-running
    // it here is exactly what heals a claim that lost its grant midway.
    await grantPurchaseForOrder(paid);

    if (fresh) {
      notifyNewSale({
        orderId: order.id,
        email,
        productName: product.name,
        amountMinor: 0,
        currency: CURRENCY,
        seats: 1,
      });
    }

    return NextResponse.json({ ok: true, already: !fresh });
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
