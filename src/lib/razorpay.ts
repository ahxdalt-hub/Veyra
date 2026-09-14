/**
 * Razorpay — server-side integration (Stage 02).
 *
 * A thin fetch wrapper over the Razorpay REST API. No SDK dependency:
 * the calls this stage needs (create order, fetch payment, verify
 * signatures) are plain authenticated JSON requests. The key secret is
 * read here and never leaves the server — only RAZORPAY_KEY_ID (a
 * public identifier) is exposed to the browser.
 *
 * This module imports node:crypto and reads RAZORPAY_KEY_SECRET; it must
 * only ever be imported by route handlers / server components.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const API_BASE = "https://api.razorpay.com/v1";

export type RazorpayOrder = {
  id: string;
  amount: number; // smallest currency unit (cents)
  currency: string;
  status: string;
  receipt?: string;
};

export type RazorpayPayment = {
  id: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  amount: number;
  currency: string;
  order_id?: string;
  error_description?: string;
};

export function razorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );
}

/** True only when the webhook secret is set — the endpoint refuses to
 *  "process" anything without it, so no unverified event is ever trusted. */
export function razorpayWebhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
}

function authHeader(): string {
  const token = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");
  return `Basic ${token}`;
}

/** Create a Razorpay order for `amount` in the smallest currency unit (cents). Server-determined only. */
export async function createRazorpayOrder(params: {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      amount: params.amountMinor,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
    // Order creation must always hit Razorpay — never a stale cache.
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Razorpay order creation failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as RazorpayOrder;
}

/** Fetch a payment's authoritative state from Razorpay. */
export async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPayment> {
  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Razorpay payment fetch failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as RazorpayPayment;
}

/**
 * Verify the checkout handler signature: HMAC-SHA256 of
 * "razorpay_order_id|razorpay_payment_id" keyed by the secret.
 * Used by /api/checkout/verify — the browser never performs this.
 */
export function verifyPaymentSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  // Guard against accidental client bundling of this module.
  if (typeof window !== "undefined") {
    throw new Error("verifyPaymentSignature must run server-side only");
  }
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verify a webhook delivery: HMAC-SHA256 over the RAW request body
 * (byte-for-byte, before JSON parsing) keyed by RAZORPAY_WEBHOOK_SECRET,
 * compared against the x-razorpay-signature header. Used by
 * /api/webhooks/razorpay — the durable confirmation path that keeps
 * working when the customer's browser never comes back.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (typeof window !== "undefined") {
    throw new Error("verifyWebhookSignature must run server-side only");
  }
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = createHmac(
    "sha256",
    process.env.RAZORPAY_WEBHOOK_SECRET
  )
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
