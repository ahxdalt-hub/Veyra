/**
 * Dodo Payments — server-side integration.
 *
 * A thin fetch wrapper over the Dodo REST API, matching the codebase's
 * existing style (no SDK dependency): the three calls this flow needs —
 * create a hosted checkout, verify a webhook signature, issue a refund —
 * are plain authenticated JSON requests. The API key is read here and never
 * leaves the server; the browser only ever receives the hosted checkout URL.
 *
 * Dodo is a MERCHANT OF RECORD, not a gateway: it is the legal seller of the
 * order, it calculates and remits sales tax/VAT, and its name appears on the
 * customer's bank statement. Consequences this module is built around:
 *   - `amount` on the order row is the Veyra-charged net, EXCLUDING Dodo's
 *     tax, so a webhook amount check compares Dodo's `total_amount` only
 *     when the order is tax-free; otherwise the currency must still match.
 *   - There is NO browser-side callback and no verify route. Confirmation
 *     is /api/webhooks/dodo (`payment.succeeded`) or nothing at all.
 *
 * CREDENTIALS (all server-side, never NEXT_PUBLIC_):
 *   DODO_PAYMENTS_API_KEY          — the secret API key (Dashboard →
 *                                    Developers → API keys) for the mode in
 *                                    DODO_PAYMENTS_ENVIRONMENT. Keys are
 *                                    mode-scoped: a test key 401s on live.
 *   DODO_PAYMENTS_WEBHOOK_KEY      — the signing secret for the webhook
 *                                    endpoint (Dashboard → Developers →
 *                                    Webhooks), prefix `whsec_`.
 *   DODO_PAYMENTS_ENVIRONMENT      — "test_mode" (default) or "live_mode";
 *                                    also decides the API base URL.
 *   DODO_PAYMENTS_PRODUCT_ID_<SLUG> — the product to charge for a slug, e.g.
 *                                    DODO_PAYMENTS_PRODUCT_ID_CLIENT_GROWTH_SYSTEM
 *
 * THE AMOUNT TRAP: Dodo charges its STORED PRODUCT PRICE unless the product
 * has Pay-What-You-Want enabled — then it charges the `amount` we send, and
 * the product's own price becomes the minimum. Veyra's seat tiers and coupon
 * math live in src/lib/pricing.ts and must be the exact amount charged, so
 * the configured product MUST be a Pay-What-You-Want product priced at
 * $1.00 (100 cents). Anything else silently bills the dashboard price.
 *
 * THE CURRENCY TRAP: Dodo has adaptive pricing on for this business, so a
 * checkout left unpinned presents the price in the BUYER's currency (a buyer
 * in India sees ₹7,913.17 for a $79 product, and the payment record then
 * carries `currency: "INR"`). `billing_currency` pins the presented currency
 * to Veyra's price currency — but it is only a DEFAULT: the hosted page
 * offers ~180 currencies to switch to, so the webhook still has to cope with
 * a foreign pay-in currency. See src/app/api/webhooks/dodo/route.ts.
 *
 * This module imports node:crypto and reads the API key; it must only ever
 * be imported by route handlers / server components.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export type DodoMode = "test" | "live";

/** What this deployment declares it is wired to. Defaults to "test". */
export function dodoMode(): DodoMode {
  return process.env.DODO_PAYMENTS_ENVIRONMENT?.trim().toLowerCase() ===
    "live_mode" ||
    process.env.DODO_PAYMENTS_ENVIRONMENT?.trim().toLowerCase() === "live"
    ? "live"
    : "test";
}

function baseUrl(): string {
  return dodoMode() === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

function apiKey(): string | null {
  if (typeof window !== "undefined") {
    throw new Error("Dodo Payments API key must stay server-side");
  }
  const key = process.env.DODO_PAYMENTS_API_KEY?.trim();
  return key ? key : null;
}

/** The product id mapped to a product slug, from
 *  DODO_PAYMENTS_PRODUCT_ID_<SLUG-UPPER-CASED>. Null when unset. */
export function dodoProductId(productSlug: string): string | null {
  const envKey = `DODO_PAYMENTS_PRODUCT_ID_${productSlug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")}`;
  const id = process.env[envKey]?.trim();
  return id ? id : null;
}

/** True when checkout can create a hosted session: API key + a product id
 *  for the slug. */
export function dodoConfigured(productSlug?: string): boolean {
  if (!apiKey()) return false;
  if (productSlug && !dodoProductId(productSlug)) return false;
  return true;
}

/** True when the webhook endpoint can verify signatures — without it the
 *  endpoint refuses to process anything, so no unverified event is trusted. */
export function dodoWebhookConfigured(): boolean {
  return Boolean(process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim());
}

/* ------------------------------------------------------------------ */
/* Hosted checkout creation                                            */
/* ------------------------------------------------------------------ */

export type DodoCheckoutSession = {
  /** The session id (`cks_…`) — safe to keep/log. */
  sessionId: string;
  /** The hosted checkout URL the browser is redirected to. Single-use and
   *  short-lived (24h), so it is handed straight to the buyer, never stored. */
  url: string;
};

/**
 * Create a Dodo checkout session for `amountMinor` cents.
 *
 * `amount` is only honored on a Pay-What-You-Want product (see the header
 * comment) — that is what keeps Veyra's server-side seat tiers and coupon
 * discounts authoritative instead of the dashboard price. `metadata` carries
 * our internal order id, which is how `payment.succeeded` resolves the
 * payment back to the order row even if the buyer never returns.
 */
export async function createDodoCheckout(params: {
  productSlug: string;
  amountMinor: number;
  /** ISO-4217 currency `amountMinor` is denominated in, e.g. "USD". Sent as
   *  `billing_currency` so adaptive pricing does not re-present the order in
   *  the buyer's local currency and desync it from the order row. */
  currency: string;
  email: string;
  internalOrderId: string;
  /** Where Dodo sends the customer after paying. */
  returnUrl: string;
  /** Opaque Caelmont partner marker; round-trips via metadata. */
  cmRef?: string | null;
}): Promise<DodoCheckoutSession> {
  const key = apiKey();
  const product = dodoProductId(params.productSlug);
  if (!key || !product) {
    throw new Error(
      "Dodo Payments is not configured (DODO_PAYMENTS_API_KEY / DODO_PAYMENTS_PRODUCT_ID_* missing)."
    );
  }

  const res = await fetch(`${baseUrl()}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    // `amount` is a PER-ITEM field (ProductItemReq) — Dodo ignores a
    // top-level `amount` entirely and charges the product's stored price.
    body: JSON.stringify({
      product_cart: [
        { product_id: product, quantity: 1, amount: params.amountMinor },
      ],
      // Presented/default charge currency. Ignored by Dodo if adaptive
      // pricing is off for the business; a default, not a lock, if it is on.
      billing_currency: params.currency,
      customer: { email: params.email },
      return_url: params.returnUrl,
      metadata: {
        veyra_order_id: params.internalOrderId,
        veyra_product_slug: params.productSlug,
        // Opaque Caelmont partner marker (only on partner-referred traffic).
        // Veyra never decodes it — the webhook hands it back, signed.
        ...(params.cmRef ? { cm_ref: params.cmRef } : {}),
      },
    }),
    // Checkout creation must always hit Dodo — never a stale cache.
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Dodo checkout creation failed (${res.status}): ${detail}`);
  }
  const payload = (await res.json().catch(() => ({}))) as {
    session_id?: string;
    checkout_url?: string;
  };
  const sessionId = payload.session_id;
  const url = payload.checkout_url;
  if (!sessionId || !url) {
    throw new Error("Dodo checkout response was missing session_id/checkout_url.");
  }
  return { sessionId, url };
}

/* ------------------------------------------------------------------ */
/* Refunds (admin terminal)                                            */
/* ------------------------------------------------------------------ */

/**
 * Issue a refund for a Dodo payment. Omitting `items` refunds the payment in
 * full — Dodo's refunds API has no top-level `amount` field, so partial
 * refunds are per line item and are not offered here.
 *
 * The response status is a snapshot: `pending`/`review` are still in flight,
 * and the order only becomes refunded when `refund.succeeded` arrives. The
 * terminal therefore reports what Dodo accepted, and the webhook revokes.
 */
export async function refundDodoPayment(params: {
  paymentId: string;
}): Promise<{
  ok: boolean;
  refundId: string | null;
  status: string | null;
  error: string | null;
}> {
  const key = apiKey();
  if (!key) {
    return {
      ok: false,
      refundId: null,
      status: null,
      error:
        "DODO_PAYMENTS_API_KEY is not configured — refund in the Dodo dashboard instead.",
    };
  }

  const res = await fetch(`${baseUrl()}/refunds`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ payment_id: params.paymentId }),
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as {
    refund_id?: string;
    status?: string;
    message?: string;
    code?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      refundId: null,
      status: null,
      error: payload.message || `HTTP ${res.status}`,
    };
  }
  return {
    ok: true,
    refundId: payload.refund_id ?? null,
    status: payload.status ?? null,
    error: null,
  };
}

/* ------------------------------------------------------------------ */
/* Webhook signature verification (Standard Webhooks)                  */
/* ------------------------------------------------------------------ */

/** Rejection tolerance: Dodo signs with a unix-seconds timestamp; anything
 *  more than five minutes off is a replay or a broken clock. */
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

/**
 * Verify a Dodo webhook delivery against the Standard Webhooks scheme:
 *
 *   signature = base64( HMAC-SHA256( `${webhook-id}.${ts}.${RAW body}`, key ) )
 *
 * where `key` is the `whsec_` secret base64-DECODED first. The body must be
 * the raw bytes, read before any JSON parsing. `webhook-signature` can carry
 * several space-separated `v1,<b64>` items (during a key rotation), so any
 * one of them matching is a pass.
 *
 * Returns null on success or a short reason on failure, so the route can log
 * why a delivery was rejected without leaking the secret.
 */
export function verifyDodoWebhook(
  rawBody: string,
  headers: { id: string; timestamp: string; signature: string }
): { ok: true } | { ok: false; reason: string } {
  if (typeof window !== "undefined") {
    throw new Error("verifyDodoWebhook must run server-side only");
  }
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  if (!secret) return { ok: false, reason: "webhook key not configured" };
  if (!headers.id || !headers.timestamp || !headers.signature) {
    return { ok: false, reason: "missing webhook headers" };
  }

  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad timestamp" };
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  // `whsec_` is a prefix, not part of the key material.
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Uint8Array;
  try {
    key = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  } catch {
    return { ok: false, reason: "webhook key is not base64" };
  }

  const expected = Buffer.from(
    createHmac("sha256", key)
      .update(`${headers.id}.${headers.timestamp}.${rawBody}`)
      .digest("base64"),
    "utf8"
  );
  for (const item of headers.signature.split(" ")) {
    const [version, value] = item.split(",");
    if (version !== "v1" || !value) continue;
    if (expected.length === value.length && timingSafeEqual(expected, Buffer.from(value, "utf8"))) {
      return { ok: true };
    }
  }
  return { ok: false, reason: "signature mismatch" };
}

/* ------------------------------------------------------------------ */
/* Webhook payload shape (documented subset)                           */
/* ------------------------------------------------------------------ */

/**
 * Dodo wraps every event the same way: an envelope with `type` and a
 * `data` object whose fields depend on that type. `Payment` payloads carry
 * their amounts in `total_amount` / `tax` / `settlement_*` (there is no
 * plain `amount` on a payment — that is the `Refund` shape), in MINOR UNITS
 * of the stated currency, and echo the checkout's `metadata` verbatim, which
 * is how the internal order id comes home.
 */
export type DodoWebhookEvent = {
  /** e.g. payment.succeeded, payment.failed, refund.succeeded */
  type?: string;
  timestamp?: string;
  data?: {
    payload_type?: string;
    payment_id?: string;
    /** Processing | Bill sent | Open | Confirmed | Paid | Failed | Declined
     *  | Cancelled | Refunded. Only 'payment.succeeded' is acted on. */
    status?: string;
    /** Minor units, as charged to the customer INCLUDING the merchant of
     *  record's tax. In the PAY-IN currency, which adaptive pricing may have
     *  chosen for the buyer, not for us. */
    total_amount?: number;
    /** Minor units of sales tax/VAT inside `total_amount`. */
    tax?: number;
    currency?: string;
    /** Minor units credited to the Dodo balance after currency conversion.
     *  `settlement_currency` is therefore the currency the money genuinely
     *  arrived in; the figure is post-conversion and post-processing, so it
     *  identifies the leg but is not an exact match for our order amount. */
    settlement_amount?: number;
    settlement_currency?: string;
    settlement_tax?: number;
    /** Refund payloads carry the refunded figure here, not `total_amount`. */
    amount?: number;
    refund_id?: string;
    customer?: {
      customer_id?: string;
      email?: string;
      name?: string;
    };
    metadata?: Record<string, unknown>;
    subscription_id?: string | null;
  };
};
