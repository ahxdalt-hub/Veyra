/**
 * Entitlement token round-trip tests — run with:
 *   node --test src/lib/licensing/token.test.ts
 * (Node ≥ 22 type-strips the TypeScript import directly; no extra deps.)
 *
 * Covers: mint/verify round trip, the PKCS#8 PEM import path this deployment
 * actually uses, tamper detection (payload, signature, wrong key),
 * claim-shape rejection, and the compact format contract the desktop
 * WebCrypto verifier relies on (two base64url parts, ieee-p1363 64-byte
 * signature over "vls1." + payload).
 *
 * Signing and verification both go through WebCrypto — the one ECDSA
 * implementation shared by every runtime this project runs on (Node and the
 * Cloudflare Workers runtime the site is deployed to).
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  importSigningKey,
  importVerificationKey,
  mintEntitlementToken,
  signEntitlementToken,
  verifyEntitlementToken,
  SIGNATURE_PREFIX,
  TOKEN_VERSION,
  type EntitlementClaims,
} from "./token.ts";

const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const;

const ECDSA_VERIFY = { name: "ECDSA", hash: "SHA-256" } as const;

async function newKeyPair(): Promise<CryptoKeyPair> {
  return (await crypto.subtle.generateKey(ECDSA, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
}

const pair = await newKeyPair();
const other = await newKeyPair();

/** The exact shape VEYRA_LICENCE_SIGNING_KEY holds: base64 of a PKCS#8 PEM. */
async function signingKeyEnvValue(key: CryptoKey): Promise<string> {
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", key));
  const body = der.toString("base64").match(/.{1,64}/g)!.join("\n");
  const pem = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
  return Buffer.from(pem, "utf8").toString("base64");
}

/** The public JWK the desktop app embeds for offline verification. */
async function publicJwk(key: CryptoKey) {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return { kty: jwk.kty!, crv: jwk.crv!, x: jwk.x!, y: jwk.y! };
}

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

test("round trip: mint then verify returns the claims", async () => {
  const { token, claims } = await mintEntitlementToken(
    {
      productSlug: "client-growth-system",
      licenceReference: "VY-ABCD-1234-EF56",
      activationId: "550e8400-e29b-41d4-a716-446655440000",
      deviceId: "aB3-_x9Qz7Lm2Kp8Rt4Wn6Yd",
      seats: 5,
    },
    pair.privateKey
  );
  assert.equal(claims.aud, "client-growth-system");
  assert.equal(claims.seats, 5);
  const verified = await verifyEntitlementToken(token, pair.publicKey);
  assert.deepEqual(verified, claims);
});

test("pem import: the env-encoded PKCS#8 key signs tokens the public JWK verifies", async () => {
  // This is the deployment's real path: base64-of-PEM env value → WebCrypto
  // import → sign, verified by the JWK the desktop app ships.
  const envValue = await signingKeyEnvValue(pair.privateKey);
  const pem = Buffer.from(envValue, "base64").toString("utf8");
  const signingKey = await importSigningKey(pem);
  assert.ok(signingKey, "PKCS#8 PEM must import");

  const verificationKey = await importVerificationKey(await publicJwk(pair.publicKey));
test("format: two base64url parts, 64-byte ieee-p1363 signature", async () => {
  const token = await signEntitlementToken(baseClaims(), pair.privateKey);
  const parts = token.split(".");
  assert.equal(parts.length, 2);
  assert.match(parts[0], /^[A-Za-z0-9_-]+$/);
  assert.match(parts[1], /^[A-Za-z0-9_-]+$/);
  assert.equal(Buffer.from(parts[1], "base64url").length, 64);
  // Payload decodes without padding gymnastics.
  const claims = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  assert.equal(claims.iss, "veyra");
});

test("tamper: modified payload is rejected", async () => {
  const claims = baseClaims();
  const token = await signEntitlementToken(claims, pair.privateKey);
  const [payload, sig] = token.split(".");
  const evil = { ...claims, seats: 99, aud: "other" };
  const forgedPayload = Buffer.from(JSON.stringify(evil), "utf8").toString("base64url");
  assert.equal(await verifyEntitlementToken(`${forgedPayload}.${sig}`, pair.publicKey), null);
  // Same-length payload tweak is also rejected (signature is over bytes).
  assert.equal(await verifyEntitlementToken(`${payload}x.${sig}`, pair.publicKey), null);
});

test("tamper: modified signature is rejected", async () => {
  const token = await signEntitlementToken(baseClaims(), pair.privateKey);
  const [payload, sig] = token.split(".");
  const sigBytes = Buffer.from(sig, "base64url");
  sigBytes[0] ^= 0xff;
  assert.equal(
    await verifyEntitlementToken(`${payload}.${sigBytes.toString("base64url")}`, pair.publicKey),
    null
  );
});

test("wrong key: a token signed elsewhere verifies with null", async () => {
  const foreign = await signEntitlementToken(baseClaims(), other.privateKey);
  assert.equal(await verifyEntitlementToken(foreign, pair.publicKey), null);
});

test("structure: garbage and unknown versions are rejected", async () => {
  assert.equal(await verifyEntitlementToken("", pair.publicKey), null);
  assert.equal(await verifyEntitlementToken("one.two.three", pair.publicKey), null);
  assert.equal(await verifyEntitlementToken("notbase64!!!.???", pair.publicKey), null);
  // Valid signature, wrong version claim → rejected.
  const v2 = await signEntitlementToken({ ...baseClaims(), v: 2 }, pair.privateKey);
  assert.equal(await verifyEntitlementToken(v2, pair.publicKey), null);
  // Valid signature, wrong issuer → rejected.
  const evilIss = await signEntitlementToken(
    { ...baseClaims(), iss: "not-veyra" as EntitlementClaims["iss"] },
    pair.privateKey
  );
  assert.equal(await verifyEntitlementToken(evilIss, pair.publicKey), null);
});

test("prefix: the signature covers the vls1 domain separator", async () => {
  // Checked with an independent WebCrypto call over the exact byte string
  // the desktop verifier re-creates — no shared helper with the signer.
  const token = await signEntitlementToken(baseClaims(), pair.privateKey);
  const [payloadB64, sigB64] = token.split(".");
  const signed = Buffer.from(SIGNATURE_PREFIX + payloadB64, "ascii");
  assert.ok(
    await crypto.subtle.verify(
      ECDSA_VERIFY,
      pair.publicKey,
      Buffer.from(sigB64, "base64url"),
      signed
    )
  );
  // The separator is genuinely signed: the same signature does not verify
  // against the bare payload bytes.
  assert.equal(
    await crypto.subtle.verify(
      ECDSA_VERIFY,
      pair.publicKey,
      Buffer.from(sigB64, "base64url"),
      Buffer.from(payloadB64, "ascii")
    ),
    false
  );
});
  assert.ok(verificationKey, "public JWK must import");

  const claims = baseClaims();
  const token = await signEntitlementToken(claims, signingKey!);
  assert.deepEqual(await verifyEntitlementToken(token, verificationKey!), claims);
  // A key that does not belong to this JWK must not verify.
  const foreign = await importVerificationKey(await publicJwk(other.publicKey));
  assert.equal(await verifyEntitlementToken(token, foreign!), null);
  // Garbage key material fails closed, it never throws.
  assert.equal(await importSigningKey("-----BEGIN PRIVATE KEY-----\nnope\n-----END PRIVATE KEY-----"), null);
});
