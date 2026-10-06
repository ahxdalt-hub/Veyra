import { NextResponse } from "next/server";
import {
  dodoWebhookConfigured,
  verifyDodoWebhook,
  type DodoWebhookEvent,
} from "@/lib/dodo-payments";
import { getOrder, getOrderByProviderPaymentId, updateOrderStatus } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import { grantPurchaseForOrder } from "@/lib/fulfillment";
import { revokeAccessForOrder } from "@/lib/refunds";
import { notifyNewSale } from "@/lib/admin/notifications";
import {
  notifyOrderPaid,
  notifyOrderRefunded,
  parseReferralToken,
} from "@/lib/partner-attribution";

/**
 * POST /api/webhooks/dodo — durable payment confirmation.
 *
 * CONFIGURATION-DEPENDENT: this endpoint is inert until
 * DODO_PAYMENTS_WEBHOOK_KEY is set and the URL is registered in the Dodo
 * dashboard (Developers → Webhooks) with the `payment.succeeded` and
 * `refund.succeeded` events selected. Until then it answers 503 and trusts
 * nothing. Dodo retries a non-2xx eight times (immediate, 5s, 5m, 30m, 2h,
 * 5h, 10h, 10h) with a 30s timeout, so a 500 here is a deliberate retry
 * request, not a bug.
 *
 * This is the ONLY confirmation path: Dodo's hosted checkout has no
 * browser-side signature callback, so the redirect back to
 * /checkout/complete is decoration — the order becomes paid here, or not at
 * all. The `status` query parameter on the return URL is never read.
 *
 * Verification model (Standard Webhooks, as Dodo documents it):
 *   1. HMAC-SHA256 over `${webhook-id}.${webhook-timestamp}.${RAW body}`,
 *      keyed by the base64-decoded `whsec_` secret, timing-safe compared
 *      against any `v1,<b64>` item in `webhook-signature`; timestamps more
 *      than five minutes off are rejected.
 *   2. The order is resolved through the checkout's `metadata`
 *      (veyra_order_id), which Dodo echoes verbatim on every payment event.
 *   3. The charged amount must match what we asked Dodo to charge — either
 *      exactly, or as `total_amount - tax` when the merchant of record added
 *      tax on top. A mismatch is refused, never fulfilled: it is the
 *      signature of a product that is not Pay-What-You-Want, in which case
 *      Dodo charged its dashboard price instead of our seat/coupon amount.
 *      That check only runs when the buyer paid in the order's own currency;
 *      adaptive pricing lets them choose another, and then the comparable
 *      figures are Dodo's settlement leg, so the guard falls back to requiring
 *      the money to settle in the order's currency.
 *   4. Only `pending` orders transition, so replays are no-ops for the row.
 *      Deduping is not done on `webhook-id`: re-delivery is what HEALS a
 *      first attempt that died mid-fulfillment, and fulfillment is
 *      idempotent end-to-end (unique entitlement/licence/seat constraints +
 *      the email_events ledger).
 *
 * Events handled: payment.succeeded (→ paid + fulfillment), refund.succeeded
 * (→ revoked access via src/lib/refunds.ts). Everything else — payment.processing,
 * payment.failed, payment.cancelled, dispute.*, payout.*, subscription.* — is
 * acknowledged and left inert; an abandoned checkout simply stays pending.
 */

export async function POST(request: Request) {
  if (!dodoWebhookConfigured()) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  // The signature covers the raw bytes — read before any JSON parsing.
  const rawBody = await request.text();
  const verdict = verifyDodoWebhook(rawBody, {
    id: request.headers.get("webhook-id") ?? "",
    timestamp: request.headers.get("webhook-timestamp") ?? "",
    signature: request.headers.get("webhook-signature") ?? "",
  });
  if (!verdict.ok) {
    // Genuine mismatches are a security signal; log server-side only.
    console.warn(`[dodo-webhook] rejected: ${verdict.reason}`);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: DodoWebhookEvent;
  try {
    event = JSON.parse(rawBody) as DodoWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const type = event.type ?? "";
  if (type !== "payment.succeeded" && type !== "refund.succeeded") {
    // Acknowledge so Dodo stops retrying; nothing to do yet.
    return NextResponse.json({ received: true });
  }

  const data = event.data ?? {};
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const veyraOrderId =
    typeof metadata.veyra_order_id === "string" ? metadata.veyra_order_id : null;
  // Opaque Caelmont partner marker, if this checkout was entered through a
  // partner link. Veyra never decodes it — it just hands it back, signed, so
  // Caelmont can verify the HMAC and credit the right partner. Absent for
  // every direct buyer, which is the normal case.
  const cmRef = parseReferralToken(metadata.cm_ref);
  // Dodo's payment id is the durable provider reference: it is what a refund
  // is issued against, and what Caelmont's ledger dedupes on.
  const paymentId = typeof data.payment_id === "string" ? data.payment_id : null;

  let order;
  try {
    order = veyraOrderId
      ? await getOrder(veyraOrderId)
      : paymentId
        ? await getOrderByProviderPaymentId(paymentId)
        : null;
  } catch (err) {
    console.error("[dodo-webhook] order lookup failed:", err);
    // 500 → Dodo retries the delivery later.
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }

  if (!order) {
    // Not one of ours (no metadata, and no row carries that payment id).
    // Acknowledge — retrying can never make an unknown order exist.
    console.warn(`[dodo-webhook] no order for ${type} (${paymentId ?? "no payment_id"})`);
    return NextResponse.json({ received: true });
  }

  try {
    if (type === "refund.succeeded") {
      // Money came back, so access goes away. revokeAccessForOrder flips the
      // order paid → refunded conditionally, so event replays and follow-up
      // deliveries are safe no-ops after the first revocation.
      // Policy: ANY refund on an order revokes the whole order's access.
      //
      // The partner void runs BEFORE the status split on purpose: a retried
      // delivery always lands in the non-paid branch, so notifying only in
      // the paid branch would strand a void that failed transiently.
      // Caelmont keys the void on order_id and answers 200 for an order it
      // never credited, so re-attempting on replay is always safe.
      const providerOrderId = paymentId ?? order.provider_payment_id ?? order.id;
      let voidNeedsRetry = false;
      if (cmRef) {
        try {
          const outcome = await notifyOrderRefunded({
            providerOrderId,
            token: cmRef,
          });
          console.log(`[dodo-webhook] partner refund void ${providerOrderId}: ${outcome}`);
          voidNeedsRetry = outcome === "retry";
        } catch (err) {
          console.error(
            `[dodo-webhook] partner refund void threw for ${providerOrderId}:`,
            err
          );
          voidNeedsRetry = true;
        }
      }
      if (order.status !== "paid") {
        // An unpaid order cannot be refunded — mark it refunded anyway so the
        // ledger mirrors Dodo, but skip the revocation writes.
        await updateOrderStatus(order.id, "refunded", {
          expectedCurrent: order.status,
          providerPaymentId: paymentId,
        });
        console.warn(
          `[dodo-webhook] refund for non-paid order ${order.id} (${order.status}) — recorded, nothing to revoke`
        );
        if (voidNeedsRetry) {
          return NextResponse.json(
            { error: "Partner void not delivered; retrying." },
            { status: 500 }
          );
        }
        return NextResponse.json({ received: true });
      }
      const revoked = await revokeAccessForOrder(order);
      console.log(
        `[dodo-webhook] refund ${providerOrderId} for order ${order.id} — ` +
          `${revoked ? "access revoked" : "already handled (no-op)"}`
      );
      if (voidNeedsRetry) {
        // Revocation is durable; only the Caelmont void needs another pass.
        // Dodo re-delivery replays this branch idempotently until it lands.
        return NextResponse.json(
          { error: "Partner void not delivered; retrying." },
          { status: 500 }
        );
      }
      return NextResponse.json({ received: true });
    }

    // --- payment.succeeded ------------------------------------------------
    // A Dodo payment has two amount legs, because adaptive pricing lets the
    // buyer pay in their own currency: the PAY-IN leg (`currency` +
    // `total_amount`, what the customer's card was charged) and the
    // SETTLEMENT leg (`settlement_currency` + `settlement_amount`, what lands
    // in Veyra's balance). `order.amount` is denominated in the price
    // currency, so an exact numeric check is only meaningful on whichever leg
    // shares that currency — comparing 7900 cents against ₹8,000 paise would
    // refuse a good sale, and minor units differ per currency anyway (cents,
    // yen, fils).
    const priceCurrency = order.currency.toUpperCase();
    const payIn = (data.currency ?? "").toUpperCase();
    const charged = data.total_amount;
    const tax = data.tax ?? 0;
    const net = charged == null ? null : charged - tax;

    if (payIn === priceCurrency) {
      if (charged == null || (net !== order.amount && charged !== order.amount)) {
        // Never transition on a mismatch — surface it for investigation. The
        // likely cause is a product without Pay-What-You-Want, where Dodo
        // charged its dashboard price instead of our server-computed amount.
        console.error(
          `[dodo-webhook] amount mismatch for order ${order.id}: ` +
            `expected ${order.amount} ${order.currency}, ` +
            `got total ${charged ?? "none"} tax ${tax} currency ${data.currency} ` +
            `(${paymentId})`
        );
        return NextResponse.json({ received: true });
      }
    } else {
      // The buyer switched currency on Dodo's hosted page (that selector lists
      // ~180 currencies and `billing_currency` only sets its default), or
      // adaptive pricing defaulted to their billing country. Dodo converted at
      // its own rate, so the pay-in figure cannot be re-checked locally; the
      // settlement leg is what proves Veyra was paid, in the order's currency.
      const settledIn = (data.settlement_currency ?? "").toUpperCase();
      if (settledIn !== priceCurrency) {
        console.error(
          `[dodo-webhook] currency mismatch for order ${order.id}: ` +
            `expected ${order.currency}, paid ${data.currency} and settled ` +
            `${data.settlement_currency ?? "unknown"} (${paymentId})`
        );
        return NextResponse.json({ received: true });
      }
      console.warn(
        `[dodo-webhook] order ${order.id} paid in ${payIn} (total ${charged ?? "unknown"}, ` +
          `tax ${tax}), settled ${data.settlement_amount ?? "unknown"} ${settledIn} ` +
          `against a ${order.amount} ${order.currency} order — cross-currency sale, ` +
          `amount not independently verifiable`
      );
    }

    // Re-delivery of an already-confirmed order is NOT an early return:
    // grantPurchaseForOrder is idempotent end-to-end, so replaying here also
    // HEALS a first delivery that died mid-fulfillment — without ever
    // producing duplicate records or duplicate emails.
    const updated = await updateOrderStatus(order.id, "paid", {
      expectedCurrent: "pending",
      providerPaymentId: paymentId,
    });
    console.log(
      `[dodo-webhook] payment.succeeded ${paymentId} for order ${order.id} ` +
        `(order was ${order.status} before this delivery)`
    );
    await grantPurchaseForOrder({ ...order, status: "paid" });

    // Partner attribution — AFTER the sale is durably fulfilled, and a
    // transient failure now fails the delivery on purpose: the customer's
    // grant is already committed (replay heals idempotently), so a 5xx here
    // makes Dodo re-deliver and the commission lands on the next attempt
    // instead of being silently lost. Caelmont dedupes on order_id, so
    // repeats can never double-pay. A permanent 4xx ("rejected") or an
    // unconfigured secret still returns 200 — retrying can't fix those, and
    // they must never hold up the customer's purchase.
    let attributionNeedsRetry = false;
    if (cmRef) {
      try {
        const outcome = await notifyOrderPaid({
          providerOrderId: paymentId ?? order.provider_payment_id ?? order.id,
          token: cmRef,
          amountMinor: order.amount,
          currency: order.currency,
        });
        console.log(`[dodo-webhook] partner attribution ${order.id}: ${outcome}`);
        attributionNeedsRetry = outcome === "retry";
      } catch (err) {
        console.error(
          `[dodo-webhook] partner attribution POST threw for ${order.id}:`,
          err
        );
        attributionNeedsRetry = true;
      }
    }

    // Command-center toast — only when THIS delivery made the flip (a null
    // row from the conditional update means an earlier delivery already
    // confirmed it and notified).
    if (updated?.status === "paid") {
      notifyNewSale({
        orderId: order.id,
        email: order.email,
        productName: getProduct(order.product_slug)?.name ?? order.product_slug,
        amountMinor: order.amount,
        currency: order.currency,
        seats: order.quantity,
      });
    }
    if (attributionNeedsRetry) {
      return NextResponse.json(
        { error: "Partner credit not delivered; retrying." },
        { status: 500 }
      );
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[dodo-webhook] order update failed:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
