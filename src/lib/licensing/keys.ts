/**
 * Licensing key material — server-side only.
 *
 * The signing key is an ECDSA P-256 private key (PKCS#8 PEM, base64-wrapped)
 * held in VEYRA_LICENCE_SIGNING_KEY. It never leaves this server: the desktop
 * app receives only signed tokens and ships only the public verification JWK.
 *
 * `server-only` guarantees this module can never be imported into a client
 * component — the build fails instead.
 *
 * The key is imported through WebCrypto (see ./token) rather than
 * node:crypto's KeyObject API, because the Workers runtime this site is
 * deployed to rejects KeyObject key material.
 */

import "server-only";
import { importSigningKey } from "./token";

/** The signing PEM, decoded. Null when absent or not a PKCS#8 private key. */
function licenceSigningPem(): string | null {
  const raw = process.env.VEYRA_LICENCE_SIGNING_KEY;
  if (!raw) return null;
  // Accept either base64-of-PEM (what .env.local stores) or the PEM inline.
  const decoded = Buffer.from(raw, "base64").toString("utf8");
  const pem = decoded.includes("BEGIN PRIVATE KEY") ? decoded : raw;
  return pem.includes("BEGIN PRIVATE KEY") ? pem : null;
}

/** The signing key, imported for WebCrypto signing. Null when unusable —
 *  callers fail closed. */
export async function licenceSigningKey(): Promise<CryptoKey | null> {
  const pem = licenceSigningPem();
  return pem ? importSigningKey(pem) : null;
}

/** True when a well-formed PKCS#8 signing key is configured on this
 *  deployment. A shape check only: the key itself is imported the moment a
 *  token is minted, and a failed import fails that call closed. */
export function licenceSigningConfigured(): boolean {
  return licenceSigningPem() !== null;
}

/** Public JWK derived from the signing key — the exact object the desktop
 *  app embeds for offline verification. Kept out of the response body; it
 *  is only here for tests and for generating the app constant. */
export async function licencePublicJwk(): Promise<{
  kty: string;
  crv: string;
  x: string;
  y: string;
} | null> {
  const pem = licenceSigningPem();
  if (!pem) return null;
  try {
    const body = pem
      .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
      .replace(/\s+/g, "");
    const bytes = Buffer.from(body, "base64");
    const der = new Uint8Array(bytes.byteLength);
    der.set(bytes);
    const key = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"]
    );
    const jwk = await crypto.subtle.exportKey("jwk", key);
    return { kty: jwk.kty!, crv: jwk.crv!, x: jwk.x!, y: jwk.y! };
  } catch {
    return null;
  }
}
