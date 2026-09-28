import { createClient } from "@supabase/supabase-js";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";
import { updateOrderStatus } from "@/lib/orders";
import type { Order } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import { notifyLicenceEvent, notifyRefund } from "@/lib/admin/notifications";
import { sendRefundEmail } from "@/lib/email/purchase";

/**
 * Refunds — the paid → refunded half of the lifecycle.
 *
 * A refund can be issued from the Lemon Squeezy dashboard (and the API), so
 * the ONLY durable signal Veyra gets is the `order_refunded` webhook. This
 * module is what makes the advertised refund window honest: when money comes
 * back, access goes away in the same breath.
 *
 * Revocation order matters (all server-side, service role):
 *   1. licence_activations → 'deactivated' (reason 'revoked') — releases the
 *      machines; the activation engine already refuses revoked licences, and
 *      the revalidation path (0008) checks licence status, so a stale offline
 *      token dies at the next opportunistic online check.
 *   2. licences + entitlements → 'revoked' — download (active entitlement)
 *      and activation (active licence) both fail closed immediately.
 *   3. seat_assignments deleted — the team-seat pool belongs to an active
 *      purchase; a refunded one holds none.
 *
 * Idempotent: every write is conditional on the current status, so replays
 * of the same refund event are no-ops after the first revoke. The refund
 * email goes through the same at-most-once ledger as the receipt (type
 * 'refund_confirmation').
 *
 * Note: the founding allocation re-reads paid orders (src/lib/founding.ts),
 * so a refund automatically releases its founding slot once the order stops
 * counting as paid — no extra work here.
 */

function adminClient() {
  return createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Revoke everything the order granted. Returns true when THIS call
 * performed the revocation (order flipped to 'refunded' by us), false when
 * it was already revoked or the database isn't configured. Never throws
 * into the webhook path.
 */
export async function revokeAccessForOrder(order: Order): Promise<boolean> {
  if (!supabaseAdminConfigured()) return false;

  const db = adminClient();

  // 1. Find the entitlement chain first (ids needed for the writes below).
  const { data: entitlement } = await db
    .from("entitlements")
    .select("id, status")
    .eq("order_id", order.id)
    .maybeSingle();
  if (entitlement && entitlement.status === "revoked") {
    // Already revoked by an earlier delivery — still make sure the order
    // row itself says refunded (a half-failed earlier pass).
    if (order.status !== "refunded") {
      await updateOrderStatus(order.id, "refunded", { expectedCurrent: "paid" });
    }
    return false;
  }

  // 2. Flip the order to refunded FIRST (conditional paid→refunded so
  //    concurrent deliveries of the same refund event can't both proceed:
  //    the loser's update returns nothing and stops here). The helper also
  //    keeps the founding-allocation cache honest — a refunded flagship
  //    order releases its founding slot.
  if (order.status !== "refunded") {
    const flipped = await updateOrderStatus(order.id, "refunded", {
      expectedCurrent: "paid",
    });
    if (!flipped) {
      console.warn(
        `[refund] order ${order.id} was ${order.status}, not paid — revocation skipped`
      );
      return false;
    }
  }

  if (entitlement) {
    // 3. Release machines first (keeps device history, marks why).
    const { data: licences } = await db
      .from("licences")
      .select("id, licence_reference, status")
      .eq("entitlement_id", entitlement.id)
      .maybeSingle();

    if (licences) {
      await db
        .from("licence_activations")
        .update({
          status: "deactivated",
          deactivated_reason: "revoked",
          deactivated_at: new Date().toISOString(),
        })
        .eq("licence_id", licences.id)
        .eq("status", "active");

      await db
        .from("licences")
        .update({ status: "revoked" })
        .eq("id", licences.id)
        .eq("status", "active");

      notifyLicenceEvent({
        licenceId: licences.id,
        email: order.email,
        productName: getProduct(order.product_slug)?.name ?? order.product_slug,
        event: "revoked",
      });
    }

    // 4. Entitlement off (download route + activation engine fail closed on
    //    this), then seats back to the pool (deleted — nothing to hold).
    await db
      .from("entitlements")
      .update({ status: "revoked" })
      .eq("id", entitlement.id)
      .eq("status", "active");

    await db.from("seat_assignments").delete().eq("entitlement_id", entitlement.id);

    // 5. Customer copy — same ledger discipline as the receipt.
    await sendRefundEmail({
      toEmail: order.email,
      productName: getProduct(order.product_slug)?.name ?? order.product_slug,
      orderId: order.id,
      amountMinor: order.amount,
      currency: order.currency,
    });
  }

  notifyRefund({
    orderId: order.id,
    email: order.email,
    productName: getProduct(order.product_slug)?.name ?? order.product_slug,
    amountMinor: order.amount,
    currency: order.currency,
  });

  console.warn(
    `[refund] order ${order.id} refunded — entitlement, licence and seats revoked`
  );
  return true;
}
