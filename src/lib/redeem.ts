/**
 * Marketplace redemption — turning an AppSumo code into a Veyra licence.
 *
 * A redemption is NOT a discounted purchase. The buyer already paid the full
 * price, to AppSumo, who are the merchant of record; Veyra was never in that
 * transaction. So the order we create carries the real amount ($79), zero
 * discount, and `provider` set to the channel that sold it — it is a revenue
 * event to report, not a freebie. Coupons stay what they always were:
 * discounts applied at our own checkout.
 *
 * The claim itself is one guarded UPDATE inside `redeem_code_claim` (0029),
 * serialised by Postgres row locking, so two buyers submitting the same code
 * in the same millisecond cannot both get a copy. Everything after the claim
 * is fulfillment; if it fails, the claim is released so the code is not
 * burned by our own error.
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { insertOrder, updateOrderStatus } from "@/lib/orders";
import { grantPurchaseForOrder } from "@/lib/fulfillment";
import { notifyNewSale } from "@/lib/admin/notifications";
import { getProduct } from "@/lib/products";

export type RedeemReason =
  | "not_found"
  | "already_redeemed"
  | "email_invalid"
  | "not_configured"
  | "fulfilment_failed"
  | "server_error";

export type RedeemResult =
  | {
      ok: true;
      orderId: string;
      email: string;
      productSlug: string;
      productName: string;
      amountMinor: number;
      currency: string;
    }
  | { ok: false; reason: RedeemReason };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Claim = {
  code: string;
  product_slug: string;
  value_cents: number;
  currency: string;
  channel: string;
  email: string;
};

/** Return a claimed code to the pool after our own fulfillment failed. */
async function releaseClaim(code: string): Promise<void> {
  const admin = supabaseAdminClient();
  if (!admin) return;
  const { error } = await admin
    .from("redeem_codes")
    .update({
      status: "available",
      redeemed_email: null,
      redeemed_order_id: null,
      redeemed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("status", "redeemed");
  if (error) {
    // Loud, because the code is now spent with nothing delivered: a human
    // has to reissue it. The buyer's email is on the row either way.
    console.error(`[redeem] release failed for ${code}:`, error.message);
  }
}

/**
 * Redeem one code for one copy.
 *
 * `userId` links the order to a signed-in Veyra account when there is one;
 * a guest order is still fully granted and later attaches to the account
 * that verifies the same email (claimPurchasesForUser).
 */
export async function redeemCode(input: {
  code: string;
  email: string;
  userId?: string | null;
}): Promise<RedeemResult> {
  const admin = supabaseAdminClient();
  if (!admin) return { ok: false, reason: "not_configured" };

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, reason: "email_invalid" };

  const { data, error } = await admin.rpc("redeem_code_claim", {
    p_code: input.code.trim().toLowerCase(),
    p_email: email,
  });
  if (error) {
    console.error("[redeem] redeem_code_claim failed:", error.message);
    return { ok: false, reason: "server_error" };
  }

  const verdict = (data ?? {}) as Record<string, unknown> & { ok?: boolean };
  if (!verdict.ok) {
    return {
      ok: false,
      reason: (typeof verdict.reason === "string" ? verdict.reason : "not_found") as RedeemReason,
    };
  }

  const claim: Claim = {
    code: String(verdict.code),
    product_slug: String(verdict.product_slug),
    value_cents: Number(verdict.value_cents),
    currency: String(verdict.currency),
    channel: String(verdict.channel),
    email: String(verdict.email),
  };

  const product = getProduct(claim.product_slug);
  if (!product) {
    await releaseClaim(claim.code);
    console.error(`[redeem] unknown product_slug "${claim.product_slug}" for ${claim.code}`);
    return { ok: false, reason: "fulfilment_failed" };
  }

  try {
    /* The order walks the same pending → paid path a card payment does, so
     * the DB's own triggers stamp paid_at and every consumer of a paid order
     * (fulfillment, rollups, activity feed) sees a normal sale. */
    const orderId = randomUUID();
    const inserted = await insertOrder({
      id: orderId,
      provider_session_id: null,
      provider_payment_id: null,
      email: claim.email,
      user_id: input.userId ?? null,
      product_slug: claim.product_slug,
      quantity: 1,
      amount: claim.value_cents,
      currency: claim.currency,
      status: "pending",
      provider: claim.channel,
      // No discount to record: the marketplace collected the full price.
      redemption_code: claim.code,
    });

    const paid = await updateOrderStatus(inserted.id, "paid");
    const paidOrder =
      paid ??
      ({
        ...inserted,
        status: "paid" as const,
        paid_at: new Date().toISOString(),
      } as typeof inserted);

    await grantPurchaseForOrder(paidOrder);

    /* Now the code points at the order that proves it, which is also the
     * handle a marketplace refund uses to revoke the right licence. */
    const link = await admin
      .from("redeem_codes")
      .update({ redeemed_order_id: paidOrder.id, updated_at: new Date().toISOString() })
      .eq("code", claim.code)
      .eq("status", "redeemed");
    if (link.error) {
      console.error(`[redeem] order link failed for ${claim.code}:`, link.error.message);
    }

    if (paid?.status === "paid") {
      notifyNewSale({
        orderId: paidOrder.id,
        email: claim.email,
        productName: product.name,
        amountMinor: claim.value_cents,
        currency: claim.currency,
        seats: 1,
      });
    }

    return {
      ok: true,
      orderId: paidOrder.id,
      email: claim.email,
      productSlug: claim.product_slug,
      productName: product.name,
      amountMinor: claim.value_cents,
      currency: claim.currency,
    };
  } catch (err) {
    await releaseClaim(claim.code);
    console.error(`[redeem] fulfilment failed for ${claim.code}:`, err);
    return { ok: false, reason: "fulfilment_failed" };
  }
}
