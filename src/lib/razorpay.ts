/**
 * Razorpay — TEST payment provider (0022).
 *
 * Production checkout is and remains Lemon Squeezy (src/lib/lemon-squeezy.ts).
 * This module lets a deployment run the REAL purchase lifecycle against
 * Razorpay's TEST environment — for local development — by setting
 * RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET. Remove the keys and every checkout
 * path falls back to Lemon Squeezy unchanged; no public copy, policy page,
 * or pricing changes with it.
 *
 * Flow (differs from Lemon Squeezy, which has no browser callback):
 *   1. /api/checkout creates the Razorpay order server-side (amount comes
 *      only from the catalog, as with LS) and returns the PUBLIC key id.
 *   2. The browser opens Razorpay Checkout; the handler receives
 *      razorpay_payment_id + razorpay_signature.
 *   3. /api/checkout/razorpay/verify re-verifies everything SERVER-SIDE:
 *      the checkout signature (HMAC over order_id|payment_id), then a
 *      direct Payments API fetch confirming status=captured and the amount
 *      matches our order — the browser callback is never trusted alone.
 *   4. /api/webhooks/razorpay (signed, RAZORPAY_WEBHOOK_SECRET) is the
 *      durable belt-and-braces confirmation, mirroring the LS webhook.
 *
 * The secret never leaves the server.
 */

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

/** True when Razorpay test/live keys are present — checkout then routes
 *  through Razorpay instead of Lemon Squeezy. */
export function razorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim()
  );
}

export function razorpayWebhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
}

/** Display-only fact for the honest test-mode banner: rzp_test_* keys mean
 *  test mode, everything else is treated as live. */
export function razorpayMode(): "test" | "live" {
  return /^rzp_test_/.test(process.env.RAZORPAY_KEY_ID?.trim() ?? "")
    ? "test"
    : "live";
}

/* ------------------------------------------------------------------ */
/* Orders + payments API (basic auth with the key pair)                 */
/* ------------------------------------------------------------------ */

function authHeader(): string {
  const raw = `${process.env.RAZORPAY_KEY_ID!.trim()}:${process.env.RAZORPAY_KEY_SECRET!.trim()}`;
  return `Basic ${Buffer.from(raw, "utf8").toString("base64")}`;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
};

/**
 * Create a Razorpay order. amountMinor is the smallest-currency-unit total
 * computed server-side from the catalog (never client-sent). currency
 * defaults to the order's currency; set RAZORPAY_CURRENCY to override for
 * a test account that only accepts INR (test money, same numeric amount).
 */
export async function createRazorpayOrder(input: {
  amountMinor: number;
  currency: string;
  receipt: string;
  internalOrderId: string;
}): Promise<RazorpayOrder> {
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountMinor,
      currency: process.env.RAZORPAY_CURRENCY?.trim() || input.currency,
      receipt: input.receipt,
      notes: { veyra_order_id: input.internalOrderId },
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Razorpay order create failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as RazorpayOrder;
}

export type RazorpayPayment = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  order_id: string;
  method?: string;
};

/**
 * Fetch a payment directly from Razorpay — the authoritative check behind
 * the browser callback (step 3 above): the client saying "paid" proves
 * nothing until this returns captured + the amount we asked for.
 */
export async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPayment> {
  const res = await fetch(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Razorpay payment fetch failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as RazorpayPayment;
}

/* ------------------------------------------------------------------ */
/* Signature verification (timing-safe, raw-input based)                */
/* ------------------------------------------------------------------ */

/**
 * Checkout handler signature: HMAC-SHA256 hex of
 * `<razorpay_order_id>|<razorpay_payment_id>` keyed by the key SECRET.
 * Proves the callback came from Razorpay Checkout — the payment's
 * status/amount still must be confirmed via fetchRazorpayPayment.
 */
export function verifyPaymentSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  if (typeof window !== "undefined") {
    throw new Error("verifyPaymentSignature must run server-side only");
  }
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret || !input.signature) return false;
  const expected = createHmac("sha256", secret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(input.signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook delivery signature: HMAC-SHA256 hex over the RAW request body
 * keyed by RAZORPAY_WEBHOOK_SECRET (set in the Razorpay dashboard).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (typeof window !== "undefined") {
    throw new Error("verifyWebhookSignature must run server-side only");
  }
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Webhook payload shape (documented subset)                            */
/* ------------------------------------------------------------------ */

/** The parts of a Razorpay webhook event we read. */
export type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    order?: {
      entity?: {
        id?: string;
        amount?: number;
        currency?: string;
        status?: string;
        receipt?: string;
        notes?: Record<string, unknown>;
      };
    };
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
      };
    };
  };
};
