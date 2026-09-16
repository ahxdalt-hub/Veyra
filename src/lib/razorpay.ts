/**
 * Razorpay — server-side integration (Stage 02).
 *
 * A thin fetch wrapper over the Razorpay REST API. No SDK dependency:
 * the calls this stage needs (create order, fetch payment, verify
 * signatures) are plain authenticated JSON requests. The key secret is
 * read here and never leaves the server — only the public key id
 * (razorpayKeyId()) is exposed to the browser.
 *
 * TEST MODE: credentials come from the environment (RAZORPAY_KEY_ID /
 * RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET) and the deployment mode
 * is declared by RAZORPAY_MODE ("test" by default). This build is a
 * test-mode environment: live keys are refused (see
 * razorpayConfigProblem) so a live credential cannot move real money.
 *
 * This module imports node:crypto and reads RAZORPAY_KEY_SECRET; it must
 * only ever be imported by route handlers / server components.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

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

/* ------------------------------------------------------------------ */
/* Configuration authority — TEST MODE BY DEFAULT                       */
/* ------------------------------------------------------------------ */
/*
 * Razorpay credentials are read from the environment only; no key, key
 * secret, or webhook secret is ever hardcoded, logged, or returned in an
 * API response. The single value allowed near the browser is the PUBLIC
 * key id (razorpayKeyId()), served to /checkout by /api/checkout.
 *
 * Mode guard: RAZORPAY_MODE declares what this deployment is allowed to
 * charge in — "test" (the default) or "live". A test-mode deployment
 * REFUSES live keys outright, so a live key pasted into .env.local cannot
 * move real money: checkout answers "payments not configured" instead of
 * contacting Razorpay. Live mode requires both an explicit
 * RAZORPAY_MODE=live AND a rzp_live_… key id, so live can never be
 * reached by accident.
 */

export type RazorpayMode = "test" | "live";
export type RazorpayModeState = RazorpayMode | "unconfigured";

/** What this deployment declares it may charge in. Defaults to "test". */
export function razorpayDeclaredMode(): RazorpayMode {
  return process.env.RAZORPAY_MODE?.trim().toLowerCase() === "live"
    ? "live"
    : "test";
}

/** The PUBLIC key id — the only Razorpay credential that may be exposed. */
export function razorpayKeyId(): string | null {
  if (typeof window !== "undefined") {
    throw new Error("razorpayKeyId must run server-side only");
  }
  const id = process.env.RAZORPAY_KEY_ID?.trim();
  return id ? id : null;
}

function razorpayKeySecret(): string | null {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return secret ? secret : null;
}

/** Test/live is encoded in the key id itself (rzp_test_… / rzp_live_…). */
function keyModeFromId(keyId: string): RazorpayMode | "unknown" {
  if (keyId.startsWith("rzp_test_")) return "test";
  if (keyId.startsWith("rzp_live_")) return "live";
  return "unknown";
}

/** True when the server-side flow is pointed at local test infrastructure
 *  (scripts/fake-razorpay.mjs) instead of Razorpay's API. */
export function razorpayUsesLocalGateway(): boolean {
  return Boolean(
    process.env.RAZORPAY_API_BASE?.trim() &&
      razorpayDeclaredMode() === "test"
  );
}

/** Razorpay's REST API base. Live mode ALWAYS uses Razorpay's own API;
 *  RAZORPAY_API_BASE is test infrastructure and is honored only in the
 *  declared test mode. The override changes WHERE requests go, never
 *  WHETHER they are verified — keys and webhook secrets stay the anchors. */
function apiBase(): string {
  const override = process.env.RAZORPAY_API_BASE?.trim();
  if (override && razorpayDeclaredMode() === "test") return override;
  return "https://api.razorpay.com/v1";
}

/**
 * A fatal configuration problem, or null when the config is usable.
 * Never contains a secret — safe to log server-side or surface in a 503.
 */
export function razorpayConfigProblem(): string | null {
  const keyId = razorpayKeyId();
  const keySecret = razorpayKeySecret();
  // Incomplete config is simply "not configured" — not an error state.
  if (!keyId || !keySecret) return null;

  const declared = razorpayDeclaredMode();
  const keyMode = keyModeFromId(keyId);

  if (keyMode === "unknown") {
    return "RAZORPAY_KEY_ID is not a Razorpay key id (expected rzp_test_… or rzp_live_…).";
  }
  if (declared === "test" && keyMode === "live") {
    return "LIVE keys are refused: this deployment is test-mode only (RAZORPAY_MODE=test). Use rzp_test_… keys — nothing was charged.";
  }
  if (declared === "live" && keyMode === "test") {
    return "RAZORPAY_MODE=live with a test key (rzp_test_…). Refusing to start live mode on test credentials.";
  }
  if (declared === "live" && process.env.RAZORPAY_API_BASE?.trim()) {
    return "RAZORPAY_API_BASE is test infrastructure only and is not honored in live mode. Remove it.";
  }
  return null;
}

/** True when a payment order may be created: keys present AND usable. */
export function razorpayConfigured(): boolean {
  return Boolean(
    razorpayKeyId() && razorpayKeySecret() && !razorpayConfigProblem()
  );
}

/** Effective mode for status surfaces: "test", "live", or "unconfigured". */
export function razorpayMode(): RazorpayModeState {
  if (!razorpayConfigured()) return "unconfigured";
  return keyModeFromId(razorpayKeyId()!) === "live" ? "live" : "test";
}

/** True only when the webhook secret is set — the endpoint refuses to
 *  "process" anything without it, so no unverified event is ever trusted. */
export function razorpayWebhookConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
}

/** Fail closed: nothing may call Razorpay with an unusable configuration. */
function assertRazorpayUsable(): void {
  if (razorpayConfigured()) return;
  const problem = razorpayConfigProblem();
  throw new Error(
    problem ??
      "Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)."
  );
}

function authHeader(): string {
  assertRazorpayUsable();
  const token = Buffer.from(
    `${razorpayKeyId()}:${razorpayKeySecret()}`
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
  const res = await fetch(`${apiBase()}/orders`, {
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
  const res = await fetch(`${apiBase()}/payments/${encodeURIComponent(paymentId)}`, {
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
  const secret = razorpayKeySecret();
  // Fail closed: no secret, no valid signature.
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
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
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
