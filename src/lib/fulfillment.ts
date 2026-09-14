import { createClient } from "@supabase/supabase-js";
import { getProduct } from "@/lib/products";
import { clampSeats } from "@/lib/pricing";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";
import type { Order } from "@/lib/orders";
import { notifyNewSale } from "@/lib/admin/notifications";

/**
 * Fulfillment — the payment→entitlement→licence chain.
 *
 * Runs ONLY server-side with the service-role key. An entitlement is
 * granted strictly after an order reaches status 'paid', and only for
 * slugs the catalog currently sells; the unique constraint on
 * entitlements.order_id (and licences.entitlement_id) makes every grant
 * idempotent, so the verify route, the Razorpay webhook, and the claim
 * routine can all call this safely and at most one row ever exists.
 *
 * Guest purchases: rows carry the purchase email with user_id null. When
 * the customer signs in/up, claimPurchasesForUser links them — keyed on
 * the Supabase-authenticated (verified) email, never on a client-supplied
 * address.
 *
 * Licence model: Veyra products are one-time purchases with a perpetual,
 * per-seat licence — the entitlement carries the number of licensed seats
 * purchased (1–5), and seat assignments record who occupies them. The
 * purchaser takes seat 1 at grant time. Deliberately no expiry/renewal
 * fields. The human-readable reference is derived deterministically from
 * the entitlement id, so re-grants reproduce the same reference.
 */

function adminClient() {
  return createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** VY-XXXX-XXXX-XXXX — deterministic, derived from the entitlement id. */
function licenceReference(entitlementId: string): string {
  const hex = entitlementId.replace(/-/g, "").slice(0, 12).toUpperCase();
  return `VY-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

async function grantForOrder(db: ReturnType<typeof adminClient>, order: Order) {
  // Only catalog products can be fulfilled; an unknown slug is a data
  // error worth surfacing, not something to silently entitle.
  const product = getProduct(order.product_slug);
  if (!product || product.status !== "available") {
    throw new Error(
      `[fulfillment] refusing to grant non-catalog product "${order.product_slug}"`
    );
  }

  // 1. Entitlement — unique on order_id.
  let entitlementId: string;
  const existing = await db
    .from("entitlements")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    entitlementId = existing.data.id;
  } else {
    const inserted = await db
      .from("entitlements")
      .insert({
        order_id: order.id,
        user_id: order.user_id,
        email: order.email,
        product_slug: order.product_slug,
        seats: clampSeats(order.quantity),
        status: "active",
      })
      .select("id")
      .single();
    if (inserted.error) {
      // Lost an insert race with the webhook/verify twin — re-read.
      const reread = await db
        .from("entitlements")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();
      if (reread.error || !reread.data) throw inserted.error;
      entitlementId = reread.data.id;
    } else {
      entitlementId = inserted.data.id;
    }
  }

  // 2. Licence — unique on entitlement_id, derived from it.
  const existingLicence = await db
    .from("licences")
    .select("id")
    .eq("entitlement_id", entitlementId)
    .maybeSingle();
  if (existingLicence.error) throw existingLicence.error;
  if (existingLicence.data) return;

  const licence = await db.from("licences").insert({
    entitlement_id: entitlementId,
    user_id: order.user_id,
    email: order.email,
    product_slug: order.product_slug,
    licence_reference: licenceReference(entitlementId),
    status: "active",
  });
  if (licence.error) throw licence.error;

  // 3. Seat 1 — the purchaser. Remaining seats stay in the pool for the
  //    owner to assign from the account area; the seat ceiling is enforced
  //    by the schema and RLS (0007_seats.sql), never by the client.
  const seat = await db
    .from("seat_assignments")
    .insert({
      entitlement_id: entitlementId,
      seat_number: 1,
      email: order.email,
      user_id: order.user_id,
      status: "active",
    });
  if (seat.error && seat.error.code !== "23505") throw seat.error; // unique = already seated
}

/**
 * Grant the entitlement + licence for a paid order. Safe to call
 * repeatedly (idempotent) and for legacy paid orders that predate
 * entitlements. Never throws into the payment path — failures are logged
 * so a payment is never reported as failed because fulfillment hiccuped;
 * webhook retries and the sign-in claim routine heal any gap.
 */
export async function grantPurchaseForOrder(order: Order): Promise<void> {
  if (order.status !== "paid") return;
  if (!supabaseAdminConfigured()) {
    console.log(
      `[fulfillment] dev-store: would grant ${order.product_slug} for order ${order.id}`
    );
    return;
  }
  try {
    await grantForOrder(adminClient(), order);
  } catch (err) {
    console.error(`[fulfillment] grant failed for order ${order.id}:`, err);
  }
  // Admin notification — the one event the command center never misses.
  // Fire-and-forget: a notification failure must never affect the
  // payment path (notifyNewSale swallows its own errors).
  const product = getProduct(order.product_slug);
  await notifyNewSale({
    orderId: order.id,
    productSlug: order.product_slug,
    productName: product?.name ?? order.product_slug,
    email: order.email,
    amount: order.amount,
    currency: order.currency,
  });
}

/**
 * Link guest purchases to an account. Called after sign-in/sign-up with
 * the Supabase-authenticated user — the email here has been verified by
 * Supabase's auth flow, which is what makes email-keyed linking sound.
 * Also grants entitlements for paid orders that predate the fulfillment
 * system, so every legitimate historical purchase appears in the account.
 */
export async function claimPurchasesForUser(
  userId: string,
  email: string
): Promise<void> {
  if (!supabaseAdminConfigured()) {
    console.log(`[fulfillment] dev-store: would claim purchases for ${email}`);
    return;
  }

  const db = adminClient();
  const normalized = email.trim().toLowerCase();

  try {
    // Link orders + entitlements + licences + seat assignments still
    // sitting on email only. Seat rows keyed by email become properly
    // user-linked (e.g. a purchaser who paid before creating an account).
    for (const table of [
      "orders",
      "entitlements",
      "licences",
      "seat_assignments",
    ] as const) {
      const res = await db
        .from(table)
        .update({ user_id: userId })
        .eq("email", normalized)
        .is("user_id", null);
      if (res.error) throw res.error;
    }

    // Legacy paid orders that never got an entitlement (purchases made
    // before this system existed) — grant now that the owner is known.
    const paid = await db
      .from("orders")
      .select("*")
      .eq("email", normalized)
      .eq("status", "paid");
    if (paid.error) throw paid.error;
    for (const order of paid.data) {
      await grantForOrder(db, order);
    }
  } catch (err) {
    console.error(`[fulfillment] claim failed for ${email}:`, err);
  }
}
