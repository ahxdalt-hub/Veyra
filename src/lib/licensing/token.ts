/**
 * Entitlement tokens — the signed offline licence the desktop app stores.
 *
 * Format (compact, WebCrypto-verifiable):
 *
 *     <base64url(JSON payload)>.<base64url(ECDSA P-256 SHA-256 signature)>
 *
 * The signature covers the ASCII bytes `"vls1." + payloadB64`. The version
 * prefix means a future format change can be distinguished cleanly by both
 * signer and verifier.
 *
 * Payload claims — deliberately only what offline authorization needs:
 *   v      token format version (1)
 *   iss    issuer ("veyra")
 *   aud    product slug the token unlocks (a token for another product is
 *          rejected by the app — offline product-mismatch protection)
 *   lic    licence reference (display + revalidation)
 *   act    activation id (revalidation: the server maps this row's status)
 *   dev    device id the token is bound to (activating elsewhere and
 *          copying the file does not work — the app checks its own id)
 *   seats  licensed seat count at activation time (display)
 *   iat    issued-at epoch seconds
 *
 * No expiry claim: Veyra licences are perpetual (one-time purchase).
 * Revocation is handled by opportunistic online revalidation — when the
 * app reaches the server and the activation/ licence is no longer valid,
 * the server says so and the app re-locks. Local business data is never
 * touched by either outcome.
 *
 * The private key lives ONLY on the server (src/lib/licensing/keys.ts).
 * The desktop app ships only the public key JWK, which can mint nothing.
 */

import { createSign, createVerify, type KeyObject } from "node:crypto";

export const TOKEN_VERSION = 1;
export const SIGNATURE_PREFIX = "vls1.";

export type EntitlementClaims = {
  v: number;
  iss: "veyra";
  aud: string; // product slug
  lic: string; // licence reference VY-...
  act: string; // activation id (uuid)
  dev: string; // device id
  seats: number;
  iat: number; // epoch seconds
};

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function signEntitlementToken(
  claims: EntitlementClaims,
  key: KeyObject
): string {
  const payloadB64 = b64url(Buffer.from(JSON.stringify(claims), "utf8"));
  const signed = Buffer.from(SIGNATURE_PREFIX + payloadB64, "ascii");
  const sign = createSign("SHA256");
  sign.update(signed);
  const signature = sign.sign({ key, dsaEncoding: "ieee-p1363" });
  return `${payloadB64}.${b64url(signature)}`;
}

/** Build the claims + token for a fresh activation. */
export function mintEntitlementToken(
  input: {
    productSlug: string;
    licenceReference: string;
    activationId: string;
    deviceId: string;
    seats: number;
  },
  key: KeyObject
): { token: string; claims: EntitlementClaims } {
  const claims: EntitlementClaims = {
    v: TOKEN_VERSION,
    iss: "veyra",
    aud: input.productSlug,
    lic: input.licenceReference,
    act: input.activationId,
    dev: input.deviceId,
    seats: input.seats,
    iat: Math.floor(Date.now() / 1000),
  };
  return { token: signEntitlementToken(claims, key), claims };
}

/** Verify a token against a public key (tests + server-side sanity checks). */
export function verifyEntitlementToken(
  token: string,
  key: KeyObject
): EntitlementClaims | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  let signature: Buffer;
  try {
    signature = Buffer.from(sigB64, "base64url");
  } catch {
    return null;
  }
  const signed = Buffer.from(SIGNATURE_PREFIX + payloadB64, "ascii");
  try {
    const verify = createVerify("SHA256");
    verify.update(signed);
    if (!verify.verify({ key, dsaEncoding: "ieee-p1363" }, signature)) return null;
  } catch {
    // Malformed signature bytes throw inside OpenSSL — treat as invalid.
    return null;
  }
  try {
    const claims = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as EntitlementClaims;
    return claims.v === TOKEN_VERSION && claims.iss === "veyra"
      ? claims
      : null;
  } catch {
    return null;
  }
}
