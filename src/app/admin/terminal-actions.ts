"use server";

import { createClient } from "@supabase/supabase-js";
import { requireAdmin, audit } from "@/lib/admin/auth";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import { getProduct } from "@/lib/products";
import { clampSeats } from "@/lib/pricing";
import { insertOrder, updateOrderStatus, type Order } from "@/lib/orders";
import { grantPurchaseForOrder } from "@/lib/fulfillment";
import { revokeAccessForOrder } from "@/lib/refunds";
import { refundLemonSqueezyOrder } from "@/lib/lemon-squeezy";
import { notifyLicenceEvent } from "@/lib/admin/notifications";
import { getCustomerProfile, getOrderDetail } from "@/lib/admin/data";
import type { Database } from "@/lib/supabase/types";

/**
 * Terminal — operational commands for the command center, one step past
 * the pages: the "payment arrived but delivery stalled", "comp a customer",
 * "refund and cut access" moments that don't deserve a whole new screen.
 *
 * Every command follows the mutations.ts contract (requireAdmin on every
 * call → validate → conditional/idempotent service-role writes → audit)
 * and reports back as a list of terminal lines so the UI can print what
 * actually happened, step by step, instead of one vague toast.
 */

export type TerminalLineTone = "ok" | "err" | "warn" | "info" | "dim";

export type TerminalLine = { text: string; tone?: TerminalLineTone };

export type TerminalResult = { ok: boolean; lines: TerminalLine[] };

function admin() {
  return createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ok(text: string): TerminalLine {
  return { text, tone: "ok" };
}
function err(text: string): TerminalLine {
  return { text, tone: "err" };
}
function warn(text: string): TerminalLine {
  return { text, tone: "warn" };
}
function info(text: string): TerminalLine {
  return { text, tone: "info" };
}
function dim(text: string): TerminalLine {
  return { text, tone: "dim" };
}

function fmtMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function shortRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Not-connected guard every command shares. */
function dbGuard(): TerminalResult | null {
  if (!supabaseAdminConfigured()) {
    return {
      ok: false,
      lines: [err("Database not connected — set the Supabase service credentials first.")],
    };
  }
  return null;
}

/**
 * Resolve an order from a pasted reference: the internal uuid, or Lemon
 * Squeezy's human order id (e.g. "VEYRA-ABCD1").
 */
async function resolveOrder(
  db: ReturnType<typeof admin>,
  query: string
): Promise<{ order: Order | null; error?: string }> {
  const q = query.trim();
  if (!q) return { order: null, error: "Enter an order reference — the internal id or the Lemon Squeezy order id (VEYRA-…)." };

  if (UUID_RE.test(q)) {
    const { data, error } = await db.from("orders").select("*").eq("id", q).maybeSingle();
    if (error) return { order: null, error: `Order lookup failed: ${error.message}` };
    return { order: (data as Order) ?? null };
  }

  const { data, error } = await db
    .from("orders")
    .select("*")
    .ilike("lemon_squeezy_order_id", q)
    .limit(2);
  if (error) return { order: null, error: `Order lookup failed: ${error.message}` };
  if (!data?.length) return { order: null, error: `No order found for "${q}".` };
  if (data.length > 1) return { order: null, error: `That reference matched ${data.length} orders — paste the full id.` };
  return { order: data[0] as Order };
}

function orderSummaryLines(order: Order): TerminalLine[] {
  const product = getProduct(order.product_slug);
  return [
    info(`order      ${shortRef(order.id)}  (${order.lemon_squeezy_order_id ?? "no LS ref"})`),
    info(`customer   ${order.email}`),
    info(`product    ${product?.name ?? order.product_slug}  ×${order.quantity}`),
    info(`status     ${order.status} · ${fmtMoney(order.amount, order.currency)} · ${order.created_at.slice(0, 10)}`),
  ];
}

/* ------------------------------------------------------------------ */
/* lookup — who is this, and what do they have?                        */
/* ------------------------------------------------------------------ */

export async function terminalLookupAction(query: string): Promise<TerminalResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, lines: [err("Your session expired. Sign in again.")] };
  const guard = dbGuard();
  if (guard) return guard;

  const q = query.trim();
  if (!q) return { ok: false, lines: [err("Enter an email or an order reference.")] };

  const db = admin();
  await audit(actor, "terminal.lookup", "orders", q.slice(0, 120), `Terminal lookup for ${q}`);

  // An email searches the customer view; anything else is an order ref.
  if (q.includes("@")) {
    if (!EMAIL_RE.test(q)) return { ok: false, lines: [err("That doesn't look like a valid email.")] };
    const profile = await getCustomerProfile(q.toLowerCase());
    if (!profile) return { ok: false, lines: [err("Customer lookup failed — try again.")] };

    const lines: TerminalLine[] = [info(`customer   ${q.toLowerCase()}`)];
    if (profile.profile?.full_name) lines[0] = info(`customer   ${profile.profile.full_name} <${q.toLowerCase()}>`);

    if (!profile.orders.length) {
      lines.push(warn("no orders on file"));
      return { ok: true, lines };
    }
    lines.push(dim(`orders (${profile.orders.length})`));
    for (const o of profile.orders.slice(0, 10)) {
      const product = getProduct(o.product_slug);
      lines.push(info(`  ${shortRef(o.id)}  ${product?.name ?? o.product_slug}  ${o.status}  ${fmtMoney(o.amount, o.currency)}  ${o.created_at.slice(0, 10)}`));
    }
    if (profile.entitlements.length) {
      lines.push(dim(`entitlements (${profile.entitlements.length})`));
      for (const e of profile.entitlements) {
        lines.push(info(`  ${e.product_slug}  ${e.status}  ${e.seats} seat${e.seats === 1 ? "" : "s"}  granted ${e.granted_at.slice(0, 10)}`));
      }
    }
    if (profile.licences.length) {
      lines.push(dim(`licences (${profile.licences.length})`));
      for (const l of profile.licences) {
        lines.push(ok(`  ${l.licence_reference}  ${l.status}  ${l.product_slug}`));
      }
    }
    return { ok: true, lines };
  }

  const { order, error } = await resolveOrder(db, q);
  if (error) return { ok: false, lines: [err(error)] };
  if (!order) return { ok: false, lines: [err(`No order found for "${q}".`)] };

  const lines = orderSummaryLines(order);
  const detail = await getOrderDetail(order.id);
  if (detail) {
    if (detail.licence) lines.push(ok(`licence    ${detail.licence.licence_reference}  ${detail.licence.status}`));
    else lines.push(dim("licence    none — not fulfilled yet"));
    if (detail.activations.length) {
      lines.push(dim(`devices (${detail.activations.length})`));
      for (const a of detail.activations) {
        lines.push(info(`  ${a.device_label ?? "device"}  ${a.activated_email}  ${a.status}  last seen ${a.last_seen_at.slice(0, 10)}`));
      }
    }
    lines.push(dim(`downloads  ${detail.downloads.length} recorded`));
  }
  return { ok: true, lines };
}

/* ------------------------------------------------------------------ */
/* grant-access — comp / manual fulfillment to an email                */
/* ------------------------------------------------------------------ */

/**
 * Give a product to an email without a checkout: creates a manual paid
 * order (provider 'manual-grant') and walks the real fulfillment chain —
 * entitlement, licence, seat, purchase email with the download
 * instructions. Idempotent per email+product: an existing active
 * entitlement short-circuits with its licence reference.
 */
export async function terminalGrantAccessAction(params: {
  email: string;
  productSlug: string;
  seats: number;
  amountDollars: number | null;
}): Promise<TerminalResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, lines: [err("Your session expired. Sign in again.")] };
  const guard = dbGuard();
  if (guard) return guard;

  const email = params.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, lines: [err("Enter a valid email address.")] };
  const product = getProduct(params.productSlug);
  if (!product || product.status !== "available") {
    return { ok: false, lines: [err("Pick a product that is currently available.")] };
  }
  const seats = clampSeats(Number(params.seats) || 1);
  const amount = params.amountDollars && params.amountDollars > 0 ? Math.round(params.amountDollars * 100) : 0;

  const db = admin();

  // Honest short-circuit: the customer already holds this product.
  const { data: existingEnt } = await db
    .from("entitlements")
    .select("id, status, granted_at")
    .eq("email", email)
    .eq("product_slug", params.productSlug)
    .eq("status", "active")
    .maybeSingle();
  if (existingEnt) {
    const { data: existingLic } = await db
      .from("licences")
      .select("licence_reference")
      .eq("entitlement_id", existingEnt.id)
      .maybeSingle();
    return {
      ok: false,
      lines: [
        warn(`${email} already has active access to ${product.name}.`),
        existingLic ? info(`licence    ${existingLic.licence_reference}`) : dim("licence    (unlisted)"),
        dim("Nothing was granted twice. Use resend-receipt if they never got the email."),
      ],
    };
  }

  // Link to the customer's account when we can see one on prior rows; guest
  // grants link themselves at the next sign-in via claimPurchasesForUser.
  const { data: priorRow } = await db
    .from("entitlements")
    .select("user_id")
    .eq("email", email)
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();
  const userId = priorRow?.user_id ?? null;

  const order = await insertOrder({
    id: crypto.randomUUID(),
    lemon_squeezy_order_id: null,
    lemon_squeezy_payment_id: null,
    razorpay_order_id: null,
    razorpay_payment_id: null,
    email,
    user_id: userId,
    product_slug: params.productSlug,
    quantity: seats,
    amount,
    currency: "USD",
    status: "paid",
    provider: "manual-grant",
  });
  // Stamp the payment instant explicitly — the insert path above doesn't
  // carry paid_at, and the receipt's date comes from the order row.
  await updateOrderStatus(order.id, "paid");

  // The real chain: entitlement → licence → seat 1 → purchase email. Never
  // throws (failures are logged server-side), so verify the outcome below.
  await grantPurchaseForOrder(order);

  const { data: ent } = await db.from("entitlements").select("id").eq("order_id", order.id).maybeSingle();
  if (!ent) {
    await audit(actor, "terminal.grant", "orders", order.id, `Manual grant FAILED to fulfill for ${email}`);
    return {
      ok: false,
      lines: [
        info(`order      ${shortRef(order.id)} created (manual-grant, ${fmtMoney(amount, "USD")})`),
        err("The order was recorded but fulfillment did not complete — check the server logs and re-run grant once fixed (it is idempotent)."),
      ],
    };
  }

  const { data: lic } = await db
    .from("licences")
    .select("licence_reference")
    .eq("entitlement_id", ent.id)
    .maybeSingle();

  await audit(
    actor,
    "terminal.grant",
    "orders",
    order.id,
    `Granted ${product.name} to ${email} (${seats} seat${seats === 1 ? "" : "s"}, ${fmtMoney(amount, "USD")})`
  );

  return {
    ok: true,
    lines: [
      info(`order      ${shortRef(order.id)}  manual-grant · ${fmtMoney(amount, "USD")}`),
      ok(`entitlement granted — ${product.name}, ${seats} seat${seats === 1 ? "" : "s"}`),
      lic ? ok(`licence    ${lic.licence_reference}`) : dim("licence    pending"),
      ok(`receipt emailed to ${email} with licence + download steps`),
      userId ? dim(`account    linked to existing Veyra account`) : dim("account    links automatically when the customer next signs in"),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* confirm-payment — the "paid but not delivered" heal                 */
/* ------------------------------------------------------------------ */

/**
 * A payment arrived (customer forward, bank statement, LS dashboard) but
 * the order is still pending — confirm it and run fulfillment now.
 */
export async function terminalConfirmPaymentAction(orderRef: string): Promise<TerminalResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, lines: [err("Your session expired. Sign in again.")] };
  const guard = dbGuard();
  if (guard) return guard;

  const db = admin();
  const { order, error } = await resolveOrder(db, orderRef);
  if (error) return { ok: false, lines: [err(error)] };
  if (!order) return { ok: false, lines: [err(`No order found for "${orderRef}".`)] };

  const lines = orderSummaryLines(order);
  if (order.status === "paid") {
    lines.push(warn("Order is already paid — fulfillment already ran. Use resend-receipt if the email never arrived."));
    return { ok: false, lines };
  }
  if (order.status !== "pending") {
    lines.push(err(`Order is ${order.status} — only a pending order can be confirmed manually.`));
    return { ok: false, lines };
  }

  const updated = await updateOrderStatus(order.id, "paid", { expectedCurrent: "pending" });
  if (!updated) {
    lines.push(err("Confirm failed — the order changed state just now. Look it up again."));
    return { ok: false, lines };
  }
  lines.push(ok("payment    confirmed → paid"));

  await grantPurchaseForOrder(updated);
  const { data: ent } = await db.from("entitlements").select("id").eq("order_id", order.id).maybeSingle();
  const { data: lic } = ent
    ? await db.from("licences").select("licence_reference").eq("entitlement_id", ent.id).maybeSingle()
    : { data: null };

  if (lic) lines.push(ok(`licence    ${lic.licence_reference} — receipt emailed to ${order.email}`));
  else lines.push(warn("Paid, but fulfillment hasn't completed yet — it will heal on the next webhook replay or sign-in. Re-run lookup to check."));

  await audit(actor, "terminal.confirm-payment", "orders", order.id, `Manually confirmed payment for ${order.email}`);
  return { ok: true, lines };
}

/* ------------------------------------------------------------------ */
/* resend-receipt — the email never arrived                            */
/* ------------------------------------------------------------------ */

/**
 * Re-send the purchase email for a paid order. The email ledger is
 * at-most-once by design, so a deliberate resend resets the ledger row
 * first and then re-runs the (idempotent) grant, which sends again.
 */
export async function terminalResendReceiptAction(orderRef: string): Promise<TerminalResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, lines: [err("Your session expired. Sign in again.")] };
  const guard = dbGuard();
  if (guard) return guard;

  const db = admin();
  const { order, error } = await resolveOrder(db, orderRef);
  if (error) return { ok: false, lines: [err(error)] };
  if (!order) return { ok: false, lines: [err(`No order found for "${orderRef}".`)] };

  const lines = orderSummaryLines(order);
  if (order.status !== "paid") {
    lines.push(err(`Order is ${order.status} — receipts are only re-sent for paid orders.`));
    return { ok: false, lines };
  }

  const { error: delError } = await db
    .from("email_events")
    .delete()
    .eq("order_id", order.id)
    .eq("email_type", "purchase_receipt");
  if (delError) {
    lines.push(err(`Couldn't reset the email ledger: ${delError.message}`));
    return { ok: false, lines };
  }

  await grantPurchaseForOrder(order);
  lines.push(ok(`receipt re-sent to ${order.email} — licence, download steps and all`));
  lines.push(dim("Without RESEND_API_KEY the email prints to the server console instead."));

  await audit(actor, "terminal.resend-receipt", "orders", order.id, `Re-sent receipt to ${order.email}`);
  return { ok: true, lines };
}

/* ------------------------------------------------------------------ */
/* refund — the money side AND the access side                         */
/* ------------------------------------------------------------------ */

/**
 * Refund an order: attempts the Lemon Squeezy refund API when the order
 * carries a provider payment reference (the webhook then re-confirms the
 * local revocation), and revokes the whole access chain locally either
 * way — devices released, licence + entitlement revoked, seats deleted,
 * refund email sent.
 */
export async function terminalRefundAction(
  orderRef: string,
  refundMoney: boolean
): Promise<TerminalResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, lines: [err("Your session expired. Sign in again.")] };
  const guard = dbGuard();
  if (guard) return guard;

  const db = admin();
  const { order, error } = await resolveOrder(db, orderRef);
  if (error) return { ok: false, lines: [err(error)] };
  if (!order) return { ok: false, lines: [err(`No order found for "${orderRef}".`)] };

  const lines = orderSummaryLines(order);
  if (order.status === "refunded") {
    lines.push(warn("Order is already refunded."));
    return { ok: false, lines };
  }
  if (order.status !== "paid") {
    lines.push(err(`Order is ${order.status} — only paid orders can be refunded. Use revoke-access to cut a pending/failed one.`));
    return { ok: false, lines };
  }

  if (refundMoney) {
    if (!order.lemon_squeezy_payment_id) {
      lines.push(dim("money      no Lemon Squeezy reference (manual grant) — nothing to charge back"));
    } else {
      const refund = await refundLemonSqueezyOrder({
        paymentId: order.lemon_squeezy_payment_id,
        amountMinor: order.amount,
      });
      if (!refund.ok) {
        lines.push(err(`Lemon Squeezy refund failed: ${refund.error}`));
        lines.push(dim("Nothing was revoked — refund in the dashboard; the webhook then revokes automatically, or run revoke-access after."));
        await audit(actor, "terminal.refund", "orders", order.id, `Refund API failed for ${order.email}: ${refund.error}`);
        return { ok: false, lines };
      }
      lines.push(ok(`money      refunded via Lemon Squeezy (refund ${refund.refundId ?? "queued"})`));
    }
  }

  const revoked = await revokeAccessForOrder(order);
  if (revoked) {
    lines.push(ok("access     revoked — devices released, licence + entitlement closed, seats freed"));
    lines.push(ok(`email      refund confirmation sent to ${order.email}`));
  } else {
    lines.push(warn("Access was already revoked (or the order was no longer paid) — no changes made."));
  }

  await audit(
    actor,
    "terminal.refund",
    "orders",
    order.id,
    `${refundMoney ? "Refunded (money + access)" : "Revoked access (money handled separately)"} for ${order.email}`
  );
  return { ok: true, lines };
}

/* ------------------------------------------------------------------ */
/* revoke-access — cut access without touching money                   */
/* ------------------------------------------------------------------ */

/**
 * Revoke everything an order granted, without a refund: devices released,
 * licence + entitlement revoked, seats freed. For manual grants the order
 * flips to refunded (there was never money to move); for real LS orders
 * the status stays paid so the ledger matches the provider — handle the
 * money in the dashboard and the webhook stays the source of truth.
 */
export async function terminalRevokeAccessAction(orderRef: string): Promise<TerminalResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, lines: [err("Your session expired. Sign in again.")] };
  const guard = dbGuard();
  if (guard) return guard;

  const db = admin();
  const { order, error } = await resolveOrder(db, orderRef);
  if (error) return { ok: false, lines: [err(error)] };
  if (!order) return { ok: false, lines: [err(`No order found for "${orderRef}".`)] };

  const lines = orderSummaryLines(order);

  const { data: entitlement } = await db
    .from("entitlements")
    .select("id, status")
    .eq("order_id", order.id)
    .maybeSingle();
  if (!entitlement || entitlement.status === "revoked") {
    lines.push(warn("This order has no active entitlement — access is already cut."));
    return { ok: false, lines };
  }

  // Mirror refunds.ts's revocation order: devices, licence, entitlement, seats.
  const { data: licence } = await db
    .from("licences")
    .select("id, licence_reference, status")
    .eq("entitlement_id", entitlement.id)
    .maybeSingle();
  if (licence) {
    await db
      .from("licence_activations")
      .update({
        status: "deactivated",
        deactivated_reason: "revoked",
        deactivated_at: new Date().toISOString(),
      })
      .eq("licence_id", licence.id)
      .eq("status", "active");
    await db.from("licences").update({ status: "revoked" }).eq("id", licence.id).eq("status", "active");
    notifyLicenceEvent({
      licenceId: licence.id,
      email: order.email,
      productName: getProduct(order.product_slug)?.name ?? order.product_slug,
      event: "revoked",
    });
    lines.push(ok(`licence    ${licence.licence_reference} revoked`));
  }
  await db.from("entitlements").update({ status: "revoked" }).eq("id", entitlement.id).eq("status", "active");
  await db.from("seat_assignments").delete().eq("entitlement_id", entitlement.id);
  lines.push(ok("access     revoked — downloads and activations fail closed immediately"));

  const manualOrder = order.provider === "manual-grant" || order.provider === "free-claim";
  if (manualOrder) {
    await updateOrderStatus(order.id, "refunded", { expectedCurrent: "paid" });
    lines.push(dim("order      manual grant → marked refunded (no refund email — no money moved)"));
  } else {
    lines.push(dim("order      status left as paid — refund the money in Lemon Squeezy; its webhook keeps the ledger honest"));
  }
  lines.push(dim("email      no email sent (use refund if the customer should be notified)"));

  await audit(actor, "terminal.revoke-access", "orders", order.id, `Revoked access for ${order.email} without refund`);
  return { ok: true, lines };
}
