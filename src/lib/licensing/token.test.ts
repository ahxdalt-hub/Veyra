/**
 * Entitlement token round-trip tests — run with:
 *   node --test src/lib/licensing/token.test.ts
 * (Node ≥ 22 type-strips the TypeScript import directly; no extra deps.)
 *
 * Covers: mint/verify round trip, tamper detection (payload, signature,
 * wrong key), claim-shape rejection, and the compact format contract the
 * desktop WebCrypto verifier relies on (two base64url parts, ieee-p1363
 * 64-byte signature over "vls1." + payload).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  mintEntitlementToken,
  signEntitlementToken,
  verifyEntitlementToken,
  SIGNATURE_PREFIX,
  TOKEN_VERSION,
  type EntitlementClaims,
} from "./token.ts";

const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const other = generateKeyPairSync("ec", { namedCurve: "prime256v1" });

const baseClaims = (): EntitlementClaims => ({
  v: TOKEN_VERSION,
  iss: "veyra",
  aud: "client-growth-system",
  lic: "VY-ABCD-1234-EF56",
  act: "550e8400-e29b-41d4-a716-446655440000",
  dev: "aB3-_x9Qz7Lm2Kp8Rt4Wn6Yd",
  seats: 5,
  iat: Math.floor(Date.now() / 1000),
});

test("round trip: mint then verify returns the claims", () => {
  const { token, claims } = mintEntitlementToken(
    {
      productSlug: "client-growth-system",
      licenceReference: "VY-ABCD-1234-EF56",
      activationId: "550e8400-e29b-41d4-a716-446655440000",
      deviceId: "aB3-_x9Qz7Lm2Kp8Rt4Wn6Yd",
      seats: 5,
    },
    privateKey
  );
  assert.equal(claims.aud, "client-growth-system");
  assert.equal(claims.seats, 5);
  const verified = verifyEntitlementToken(token, publicKey);
  assert.deepEqual(verified, claims);
});

test("format: two base64url parts, 64-byte ieee-p1363 signature", () => {
  const token = signEntitlementToken(baseClaims(), privateKey);
  const parts = token.split(".");
  assert.equal(parts.length, 2);
  assert.match(parts[0], /^[A-Za-z0-9_-]+$/);
  assert.match(parts[1], /^[A-Za-z0-9_-]+$/);
  assert.equal(Buffer.from(parts[1], "base64url").length, 64);
  // Payload decodes without padding gymnastics.
  const claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  assert.equal(claims.iss, "veyra");
});

test("tamper: modified payload is rejected", () => {
  const claims = baseClaims();
  const token = signEntitlementToken(claims, privateKey);
  const [payload, sig] = token.split(".");
  const evil = { ...claims, seats: 99, aud: "other" };
  const forgedPayload = Buffer.from(JSON.stringify(evil), "utf8").toString(
    "base64url"
  );
  assert.equal(verifyEntitlementToken(`${forgedPayload}.${sig}`, publicKey), null);
  // Same-length payload tweak is also rejected (signature is over bytes).
  assert.equal(verifyEntitlementToken(`${payload}x.${sig}`, publicKey), null);
});

test("tamper: modified signature is rejected", () => {
  const token = signEntitlementToken(baseClaims(), privateKey);
  const [payload, sig] = token.split(".");
  const sigBytes = Buffer.from(sig, "base64url");
  sigBytes[0] ^= 0xff;
  assert.equal(
    verifyEntitlementToken(`${payload}.${sigBytes.toString("base64url")}`, publicKey),
    null
  );
});

test("wrong key: a token signed elsewhere verifies with null", () => {
  const foreign = signEntitlementToken(baseClaims(), other.privateKey);
  assert.equal(verifyEntitlementToken(foreign, publicKey), null);
});

test("structure: garbage and unknown versions are rejected", () => {
  assert.equal(verifyEntitlementToken("", publicKey), null);
  assert.equal(verifyEntitlementToken("one.two.three", publicKey), null);
  assert.equal(verifyEntitlementToken("notbase64!!!.???", publicKey), null);
  // Valid signature, wrong version claim → rejected.
  const v2 = signEntitlementToken({ ...baseClaims(), v: 2 }, privateKey);
  assert.equal(verifyEntitlementToken(v2, publicKey), null);
  // Valid signature, wrong issuer → rejected.
  const evilIss = signEntitlementToken(
    { ...baseClaims(), iss: "not-veyra" as EntitlementClaims["iss"] },
    privateKey
  );
  assert.equal(verifyEntitlementToken(evilIss, publicKey), null);
});

test("prefix: signature covers the vls1 domain separator", async () => {
  // The exact byte string the desktop verifier re-creates must match.
  const claims = baseClaims();
  const token = signEntitlementToken(claims, privateKey);
  const [payloadB64, sigB64] = token.split(".");
  const signed = Buffer.from(SIGNATURE_PREFIX + payloadB64, "ascii");
  const crypto = await import("node:crypto");
  const verify = crypto.createVerify("SHA256");
  verify.update(signed);
  // ieee-p1363 (r||s) is the encoding WebCrypto verifies, and what the
  // desktop app's independent implementation must accept.
  assert.ok(
    verify.verify(
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(sigB64, "base64url")
    )
  );
});
