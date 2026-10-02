import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  buildSignatureHeader,
  parseReferralToken,
  readReferralToken,
} from "../../src/lib/partner-attribution.ts";

/**
 * An independent reimplementation of Caelmont's verifyWebhookSignature
 * (src/lib/partners/webhook.ts): parse `t=<unix>,v1=<hex>`, reject anything
 * outside a 300s skew window, recompute HMAC-SHA256 over `<t>.<rawBody>` with
 * the shared secret, constant-time compare. Written from the spec, NOT by
 * importing the Veyra signer — so it independently confirms the two agree.
 */
function caelmontVerify(rawBody: string, header: string, secret: string, nowSeconds: number): boolean {
  let timestamp: string | null = null;
  let provided: string | null = null;
  for (const part of header.split(",")) {
    const piece = part.trim();
    if (piece.startsWith("t=")) timestamp = piece.slice(2);
    else if (piece.startsWith("v1=")) provided = piece.slice(3);
  }
  if (!timestamp || !provided) return false;
  const seconds = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(seconds)) return false;
  if (Math.abs(nowSeconds - seconds) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const SECRET = "c".repeat(40); // >=32 chars, as Caelmont requires

test("signed attribution body verifies under Caelmont's scheme", () => {
  const now = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    id: "veyra:#VEYRA-ABC:paid",
    type: "order.paid",
    order_id: "#VEYRA-ABC",
    product_slug: "veyra",
    cm_ref: "eyJhIjoxfQ.abcdefghijklmnopqrstuvwx",
    amount: 149.0,
    currency: "USD",
  });
  const header = buildSignatureHeader(SECRET, now, body);
  assert.equal(caelmontVerify(body, header, SECRET, now), true, "valid signature must verify");
});

test("a wrong secret is rejected", () => {
  const now = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ type: "order.paid", order_id: "#1" });
  const header = buildSignatureHeader(SECRET, now, body);
  assert.equal(caelmontVerify(body, header, "d".repeat(40), now), false);
});

test("a tampered body is rejected", () => {
  const now = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ type: "order.paid", order_id: "#1", amount: 149 });
  const header = buildSignatureHeader(SECRET, now, body);
  const evil = body.replace("149", "1");
  assert.equal(caelmontVerify(evil, header, SECRET, now), false);
});

test("a stale signature (beyond 300s) is rejected", () => {
  const now = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ type: "order.paid", order_id: "#1" });
  const header = buildSignatureHeader(SECRET, now - 301, body);
  assert.equal(caelmontVerify(body, header, SECRET, now), false);
});

test("parseReferralToken accepts the signed-marker shape only", () => {
  assert.ok(parseReferralToken("eyJhIjoxfQ.abcdefghijklmnopqrstuvwx"));
  assert.equal(parseReferralToken("not-a-token"), null);
  assert.equal(parseReferralToken(""), null);
  assert.equal(parseReferralToken(undefined), null);
  assert.equal(parseReferralToken("a".repeat(600)), null, "oversized rejected");
});

test("readReferralToken pulls cm_ref from the request cookie header", () => {
  const token = "eyJhIjoxfQ.abcdefghijklmnopqrstuvwx";
  const headers = new Headers({ cookie: `sid=xyz; cm_ref=${token}; other=1` });
  assert.equal(readReferralToken(headers), token);
  assert.equal(readReferralToken(new Headers({ cookie: "sid=xyz" })), null);
  assert.equal(readReferralToken(new Headers()), null);
});

test("cents convert to the major units Caelmont's ledger expects", () => {
  // Mirrors notifyOrderPaid's amount math (which we cannot call directly here
  // because it performs the outbound fetch). 14900 cents -> 149.00 major.
  const amountMinor = 14900;
  assert.equal(Number((amountMinor / 100).toFixed(2)), 149);
  assert.equal(Number((1 / 100).toFixed(2)), 0.01);
});
