/**
 * Lemon Squeezy — server-side integration.
 *
 * A thin fetch wrapper over the Lemon Squeezy REST API. No SDK dependency,
 * matching the codebase's existing style: the calls this flow needs
 * (create a hosted checkout, verify webhook signatures) are plain
 * authenticated JSON requests. The API key is read here and never leaves
 * the server — the browser only ever receives the hosted checkout URL
 * returned by createLemonSqueezyCheckout().
 *
 * How Lemon Squeezy differs from the gateway this replaced:
 *   - There is NO client-side payment modal and NO browser callback
 *     signature. The server creates a hosted checkout and the browser is
 *     redirected to it; Lemon Squeezy confirms the payment itself via the
 *     signed `order_created` webhook. That webhook is the ONLY durable
 *     confirmation path (there is no /api/checkout/verify equivalent).
 *   - `custom_price` lets Veyra keep its own pricing authority: the
 *     server-side seat tiers and coupon math in src/lib/pricing.ts still
 *     decide the exact amount charged, in cents.
 *
 * CREDENTIALS (all server-side, never NEXT_PUBLIC_):
 *   LEMONSQUEEZY_API_KEY        — the API key (a JWT) from Lemon Squeezy
 *                                 Developer settings.
 *   LEMONSQUEEZY_STORE_ID       — numeric store id (Developer settings).
 *   LEMONSQUEEZY_VARIANT_ID_<slug> — one variant id per purchasable
 *                                 product, e.g.
 *                                 LEMONSQUEEZY_VARIANT_ID_CLIENT_GROWTH_SYSTEM=12345
 *   LEMONSQUEEZY_WEBHOOK_SECRET — the signing secret set on the webhook
 *                                 (Dashboard → Store → Settings → Webhooks).
 *   LEMONSQUEEZY_MODE           — "test" (default) or "live"; display-only
 *                                 honesty about which store mode is wired.
 *
 * This module imports node:crypto and reads the API key; it must only ever
 * be imported by route handlers / server components.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

export type LemonSqueezyMode = "test" | "live";

/** What this deployment declares it is wired to. Defaults to "test". */
export function lemonSqueezyMode(): LemonSqueezyMode {
  return process.env.LEMONSQUEEZY_MODE?.trim().toLowerCase() === "live"
    ? "live"
    : "test";
}

function apiKey(): string | null {
  if (typeof window !== "undefined") {
    throw new Error("Lemon Squeezy API key must stay server-side");
  }
  const key = process.env.LEMONSQUEEZY_API_KEY?.trim();
  return key ? key : null;
}

function storeId(): string | null {
  const id = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  return id ? id : null;
}

/** The variant id mapped to a product slug, from
 *  LEMONSQUEEZY_VARIANT_ID_<SLUG-UPPER-CASED>. Null when unset. */
export function lemonSqueezyVariantId(productSlug: string): string | null {
  const envKey = `LEMONSQUEEZY_VARIANT_ID_${productSlug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")}`;
  const id = process.env[envKey]?.trim();
  return id ? id : null;
}

/** True when the checkout API can create a hosted checkout for this
 *  product: API key + store id + a variant mapping for the slug. */
export function lemonSqueezyConfigured(productSlug?: string): boolean {
  if (!apiKey() || !storeId()) return false;
  if (productSlug && !lemonSqueezyVariantId(productSlug)) return false;
  return true;
}

/** True when the webhook endpoint can verify signatures — without it the
 *  endpoint refuses to process anything, so no unverified event is trusted. */
export function lemonSqueezyWebhookConfigured(): boolean {
  return Boolean(process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim());
}

/* ------------------------------------------------------------------ */
/* Hosted checkout creation                                            */
/* ------------------------------------------------------------------ */

export type LemonSqueezyCheckout = {
  /** The checkout's public id (uuid) — safe to keep/log. */
  id: string;
  /** The hosted checkout URL the browser is redirected to. */
  url: string;
};

/**
 * Create a Lemon Squeezy hosted checkout for `amountMinor` cents.
 * `customPrice` makes Veyra's server-side pricing (seat tiers + coupon)
 * the exact amount charged — the variant's dashboard price is overridden.
 * `customOrderId` rides along in the checkout's custom data and comes back
 * on the webhook (meta.custom_event_data), which is how the payment is
 * matched to our internal order.
 */
export async function createLemonSqueezyCheckout(params: {
  productSlug: string;
  amountMinor: number;
  email: string;
  internalOrderId: string;
  /** Where Lemon Squeezy sends the customer after paying. */
  redirectUrl: string;
  productName: string;
}): Promise<LemonSqueezyCheckout> {
  const key = apiKey();
  const store = storeId();
  const variant = lemonSqueezyVariantId(params.productSlug);
  if (!key || !store || !variant) {
    throw new Error(
      "Lemon Squeezy is not configured (LEMONSQUEEZY_API_KEY / LEMONSQUEEZY_STORE_ID / LEMONSQUEEZY_VARIANT_ID_* missing)."
    );
  }

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          custom_price: params.amountMinor,
          checkout_data: {
            email: params.email,
            custom: {
              veyra_order_id: params.internalOrderId,
              veyra_product_slug: params.productSlug,
              veyra_product_name: params.productName,
            },
          },
          product_options: {
            redirect_url: params.redirectUrl,
          },
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        relationships: {
          store: { data: { type: "stores", id: store } },
          variant: { data: { type: "variants", id: variant } },
        },
      },
    }),
    // Checkout creation must always hit Lemon Squeezy — never a stale cache.
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Lemon Squeezy checkout creation failed (${res.status}): ${detail}`
    );
  }
  const payload = (await res.json()) as {
    data?: { id?: string; attributes?: { url?: string } };
  };
  const id = payload.data?.id;
  const url = payload.data?.attributes?.url;
  if (!id || !url) {
    throw new Error("Lemon Squeezy checkout response was missing id/url.");
  }
  return { id, url };
}

/* ------------------------------------------------------------------ */
/* Webhook signature verification                                      */
/* ------------------------------------------------------------------ */

/**
 * Verify a webhook delivery: HMAC-SHA256 hex digest over the RAW request
 * body (byte-for-byte, before JSON parsing) keyed by
 * LEMONSQUEEZY_WEBHOOK_SECRET, compared timing-safely against the
 * signature header. Used by /api/webhooks/lemonsqueezy — the ONLY durable
 * confirmation path now that there is no browser-side callback.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (typeof window !== "undefined") {
    throw new Error("verifyWebhookSignature must run server-side only");
  }
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* Webhook payload shape (documented subset)                           */
/* ------------------------------------------------------------------ */

/** The parts of an order event we read; the JSON:API envelope is stable
 *  for these fields (see docs.lemonsqueezy.com/api/orders). */
export type LemonSqueezyOrderEvent = {
  data?: {
    /** The order's uuid — our provider payment reference. */
    id?: string;
    type?: string;
    meta?: {
      event_name?: string;
      /** checkout_data.custom comes back here, values as strings. */
      custom_event_data?: Record<string, unknown>;
    };
    attributes?: {
      /** Lemon Squeezy's human order id, e.g. "VEYRA-ABCD1". */
      order_id?: string;
      order_name?: string;
      status?: string;
      /** Cents, pre-tax — what custom_price was set to. */
      subtotal?: number;
      discount_total?: number;
      tax?: number;
      total?: number;
      currency?: string;
      user_email?: string;
      created_at?: string;
    };
  };
};
