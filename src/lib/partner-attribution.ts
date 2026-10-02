/**
 * Caelmont partner attribution — the outbound half of the referral loop.
 *
 * A visitor who arrives through a Caelmont partner link carries a signed,
 * opaque `cm_ref` marker set on `.caelmont.in` by caelmont.in/r/<code>.
 * Veyra never decodes it (the key lives only on Caelmont); it captures the
 * string from the request cookie, rides it through the Lemon Squeezy
 * checkout custom data, and hands it back on the order events below.
 *
 * Credit is minted exclusively by Caelmont after it verifies the marker's
 * HMAC and the click window. This module can therefore never name a
 * partner, a rate, or a status — the worst it can do is deliver an
 * untrusted string to a route that checks it.
 *
 * Replay safety is Caelmont's job: its ledger is unique on `order_id`, so
 * delivering the same event twice returns the original conversion. That is
 * why a failed delivery can safely make the Lemon Squeezy webhook retry.
 */

import { createHmac } from "node:crypto";

/** Same shape Caelmont's parseConversionEvent accepts for `cm_ref`. */
const REFERRAL_TOKEN_RE = /^[A-Za-z0-9_-]{8,300}\.[A-Za-z0-9_-]{20,100}$/;

/** The venture slug Caelmont credits under — NOT a Veyra product slug.
 *  Veyra's own product slugs (client-growth-system, ...) are unknown to the
 *  partner program and would be rejected with 422. */
const CAELMONT_PRODUCT_SLUG = "veyra";

const DEFAULT_WEBHOOK_URL = "https://caelmont.in/api/partners/webhook";

/**
 * Build the `x-caelmont-signature` header: `t=<unix>,v1=<hex>` where hex is
 * HMAC-SHA256 of `<t>.<body>` keyed by the shared secret — the exact scheme
 * Caelmont's verifyWebhookSignature expects. Split out so a test can pin it
 * against an independent reimplementation of Caelmont's verifier.
 */
export function buildSignatureHeader(secret: string, timestampSeconds: number, body: string): string {
  const v1 = createHmac("sha256", secret).update(`${timestampSeconds}.${body}`).digest("hex");
  return `t=${timestampSeconds},v1=${v1}`;
}

export type ReferralToken = string;

/** Read the opaque marker from the request cookies (set by caelmont.in/r/).
 *  Same-site because veyra.caelmont.in shares the caelmont.in registrable
 *  domain, so the Domain=.caelmont.in cookie arrives on our requests too. */
export function readReferralToken(headers: Headers): ReferralToken | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  for (const piece of cookie.split(";")) {
    const eq = piece.indexOf("=");
    if (eq === -1) continue;
    if (piece.slice(0, eq).trim() !== "cm_ref") continue;
    const value = decodeURIComponent(piece.slice(eq + 1).trim()).slice(0, 512);
    return REFERRAL_TOKEN_RE.test(value) ? value : null;
  }
  return null;
}

/** Validate a marker read back out of a webhook's custom_event_data. */
export function parseReferralToken(value: unknown): ReferralToken | null {
  if (typeof value !== "string") return null;
  const token = value.slice(0, 512);
  return REFERRAL_TOKEN_RE.test(token) ? token : null;
}

export type AttributionOutcome =
  /** No marker on this order — nobody to credit. Normal for direct buyers. */
  | "skipped"
  /** PARTNER_WEBHOOK_SECRET unset on this Worker: refuse to send unsigned. */
  | "no_secret"
  /** 2xx — Caelmont accepted (credited, duplicate, or knowingly ignored). */
  | "delivered"
  /** 5xx / network — transient. The caller should fail the LS delivery so
   *  Lemon Squeezy retries and Caelmont's order_id dedupe keeps it safe. */
  | "retry"
  /** 4xx — permanent rejection (bad signature/product). Retrying is useless;
   *  surface loudly in the log but never hold up the customer's purchase. */
  | "rejected";

interface CaelmontEvent {
  id: string;
  type: "order.paid" | "order.refunded";
  order_id: string;
  product_slug: string;
  referral_code?: null;
  cm_ref?: string;
  /** Major units (149.00) — Caelmont validates a finite non-negative number. */
  amount: number;
  currency: string | null;
}

async function deliver(event: CaelmontEvent): Promise<AttributionOutcome> {
  const secret = process.env.PARTNER_WEBHOOK_SECRET?.trim();
  if (!secret || secret.length < 32) return "no_secret";

  const url = process.env.CAELMONT_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK_URL;
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureHeader = buildSignatureHeader(secret, timestamp, body);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-caelmont-signature": signatureHeader,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const ack = await res.json().catch(() => null);
      console.log(`[partner-attribution] ${event.type} ${event.order_id} accepted:`, JSON.stringify(ack));
      return "delivered";
    }
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      console.error(`[partner-attribution] ${event.type} ${event.order_id} got ${res.status}: ${text.slice(0, 200)}`);
      return "retry";
    }
    console.error(
      `[partner-attribution] PERMANENT rejection ${res.status} for ${event.type} ${event.order_id}: ${text.slice(0, 200)} — check PARTNER_WEBHOOK_SECRET matches Caelmont`
    );
    return "rejected";
  } catch (err) {
    console.error(`[partner-attribution] ${event.type} ${event.order_id} delivery failed:`, err);
    return "retry";
  }
}

/**
 * Credit a paid, partner-referred order. Cents in, major units out —
 * Veyra's ledger and Lemon Squeezy both speak cents; Caelmont's ledger
 * records commission on the sale amount in major units.
 */
export async function notifyOrderPaid(params: {
  lsOrderId: string;
  token: ReferralToken;
  amountMinor: number;
  currency: string;
}): Promise<AttributionOutcome> {
  return deliver({
    id: `veyra:${params.lsOrderId}:paid`,
    type: "order.paid",
    order_id: params.lsOrderId,
    product_slug: CAELMONT_PRODUCT_SLUG,
    referral_code: null,
    cm_ref: params.token,
    amount: Number((params.amountMinor / 100).toFixed(2)),
    currency: params.currency,
  });
}

/**
 * Void the commission for a refunded order. The marker is echoed when
 * available (Caelmont ignores it on refunds — voiding keys off order_id),
 * so a refund for an order this store never credited is a no-op.
 */
export async function notifyOrderRefunded(params: {
  lsOrderId: string;
  token: ReferralToken | null;
}): Promise<AttributionOutcome> {
  return deliver({
    id: `veyra:${params.lsOrderId}:refunded`,
    type: "order.refunded",
    order_id: params.lsOrderId,
    product_slug: CAELMONT_PRODUCT_SLUG,
    referral_code: null,
    ...(params.token ? { cm_ref: params.token } : {}),
    amount: 0,
    currency: null,
  });
}
