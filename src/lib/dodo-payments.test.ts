/**
 * Dodo webhook signature tests — run with:
 *   node --test src/lib/dodo-payments.test.ts
 *
 * Confirmation of a real payment runs through this one function, so the
 * tests guard the exact Standard Webhooks contract: the signed string is
 * `${id}.${timestamp}.${RAW body}`, the key is the `whsec_` secret
 * base64-DECODED, the digest is base64, and a delivery outside the timestamp
 * window is a replay. A verification that is wrong in either direction is a
 * money bug — permissive hands out licences for free, strict refuses real
 * purchases — so both directions are asserted here.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { dodoMode, verifyDodoWebhook } from "./dodo-payments.ts";

const SECRET = "test_webhook_secret_zzz";
process.env.DODO_PAYMENTS_WEBHOOK_KEY = `whsec_${Buffer.from(SECRET).toString("base64")}`;

/** Sign exactly as Dodo does, so a change in our verifier that isn't a change
 *  in Dodo's scheme has to break here first. */
function deliver(body: string, id = "evt_1", at = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", Buffer.from(SECRET, "utf8"))
    .update(`${id}.${at}.${body}`)
    .digest("base64");
  return {
    rawBody: body,
    headers: {
      id,
      timestamp: String(at),
      signature: `v1,${signature}`,
    },
  };
}

const PAYLOAD = JSON.stringify({
  type: "payment.succeeded",
  data: { payment_id: "pay_x", total_amount: 7900, currency: "USD" },
});

test("a correctly signed delivery verifies", () => {
  const { rawBody, headers } = deliver(PAYLOAD);
  assert.deepEqual(verifyDodoWebhook(rawBody, headers), { ok: true });
});

test("a tampered body fails (signature covers the raw bytes, not parsed JSON)", () => {
  const { rawBody, headers } = deliver(PAYLOAD);
  const tampered = rawBody.replace("7900", "1");
  assert.equal(verifyDodoWebhook(tampered, headers).ok, false);
});

test("a signature from the wrong key fails", () => {
  const body = PAYLOAD;
  const at = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", Buffer.from("attacker-guess"))
    .update(`evt_1.${at}.${body}`)
    .digest("base64");
  assert.equal(
    verifyDodoWebhook(body, { id: "evt_1", timestamp: String(at), signature: `v1,${signature}` }).ok,
    false
  );
});

test("a replay outside the five-minute window fails", () => {
  const stale = Math.floor(Date.now() / 1000) - 6 * 60;
  const { rawBody, headers } = deliver(PAYLOAD, "evt_1", stale);
  assert.equal(verifyDodoWebhook(rawBody, headers).ok, false);
});

test("missing headers fail instead of throwing", () => {
  const at = String(Math.floor(Date.now() / 1000));
  for (const headers of [
    { id: "", timestamp: at, signature: "v1,AAA=" },
    { id: "evt_1", timestamp: "", signature: "v1,AAA=" },
    { id: "evt_1", timestamp: at, signature: "" },
  ]) {
    assert.equal(verifyDodoWebhook(PAYLOAD, headers).ok, false);
  }
});

test("any matching item in a multi-signature header passes (key rotation)", () => {
  const { rawBody, headers } = deliver(PAYLOAD);
  assert.deepEqual(
    verifyDodoWebhook(rawBody, { ...headers, signature: `v1,AAA= ${headers.signature}` }),
    { ok: true }
  );
});

test("an unconfigured secret fails closed", () => {
  const saved = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  delete process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  const { rawBody, headers } = deliver(PAYLOAD);
  assert.equal(verifyDodoWebhook(rawBody, headers).ok, false);
  process.env.DODO_PAYMENTS_WEBHOOK_KEY = saved;
});

test("mode comes from the declared environment, defaulting to test", () => {
  const saved = process.env.DODO_PAYMENTS_ENVIRONMENT;
  process.env.DODO_PAYMENTS_ENVIRONMENT = "live_mode";
  assert.equal(dodoMode(), "live");
  process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
  assert.equal(dodoMode(), "test");
  delete process.env.DODO_PAYMENTS_ENVIRONMENT;
  assert.equal(dodoMode(), "test");
  if (saved === undefined) delete process.env.DODO_PAYMENTS_ENVIRONMENT;
  else process.env.DODO_PAYMENTS_ENVIRONMENT = saved;
});
