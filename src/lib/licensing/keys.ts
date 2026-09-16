/**
 * Licensing key material — server-side only.
 *
 * The signing key is an ECDSA P-256 private key (PKCS#8 PEM, base64-wrapped)
 * held in VEYRA_LICENCE_SIGNING_KEY. It never leaves this server: the desktop
 * app receives only signed tokens and ships only the public verification JWK.
 *
 * `server-only` guarantees this module can never be imported into a client
 * component — the build fails instead.
 */

import "server-only";
import { createPrivateKey, createPublicKey, type KeyObject } from "node:crypto";

export function licenceSigningKey(): KeyObject | null {
  const raw = process.env.VEYRA_LICENCE_SIGNING_KEY;
  if (!raw) return null;
  try {
    // Accept either base64-of-PEM (what .env.local stores) or the PEM inline.
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const pem = decoded.includes("BEGIN PRIVATE KEY")
      ? decoded
      : raw;
    return createPrivateKey({ key: pem, format: "pem" });
  } catch {
    return null;
  }
}

/** True when activation can mint tokens on this deployment. */
export function licenceSigningConfigured(): boolean {
  return licenceSigningKey() !== null;
}

/** Public JWK derived from the signing key — the exact object the desktop
 *  app embeds for offline verification. Kept out of the response body; it
 *  is only here for tests and for generating the app constant. */
export function licencePublicJwk(): { kty: string; crv: string; x: string; y: string } | null {
  const key = licenceSigningKey();
  if (!key) return null;
  const jwk = createPublicKey(key).export({ format: "jwk" }) as Record<string, string>;
  return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
}
