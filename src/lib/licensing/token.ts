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
 * Signing uses **WebCrypto** (`crypto.subtle`), not `node:crypto`:
 *   - WebCrypto's ECDSA signature is raw `r||s` (ieee-p1363) by
 *     specification — byte-for-byte the encoding the desktop app's
 *     independent WebCrypto verifier consumes;
 *   - it behaves identically in Node and in the Cloudflare Workers runtime
 *     this deployment runs on, whereas node:crypto's
 *     `createSign().sign({ key: KeyObject })` is rejected by workerd
 *     ("options.key ... Received an instance of PrivateKeyObject").
 * The token format is unchanged, so already-issued tokens stay valid.
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

export const TOKEN_VERSION = 1;
export const SIGNATURE_PREFIX = "vls1.";

/** ECDSA P-256 / SHA-256 — the parameters signer and verifier both use. */
const ECDSA = { name: "ECDSA", hash: "SHA-256" } as const;
const ECDSA_IMPORT = { name: "ECDSA", namedCurve: "P-256" } as const;

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

function b64url(data: Uint8Array): string {
  return Buffer.from(data).toString("base64url");
}

/** PKCS#8 DER bytes from a PEM body ("-----BEGIN PRIVATE KEY-----"). */
function pemToDer(pem: string): Uint8Array<ArrayBuffer> | null {
  const body = pem
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (!body) return null;
  try {
    const bytes = Buffer.from(body, "base64");
    // Copy into a plain ArrayBuffer-backed view: WebCrypto's BufferSource
    // typing (and the Workers runtime) want a real ArrayBuffer, not a view
    // over Node's pooled Buffer memory.
    const der = new Uint8Array(bytes.byteLength);
    der.set(bytes);
    return der;
  } catch {
    return null;
  }
}

/**
 * Import the server signing key (PKCS#8 PEM, ECDSA P-256). Null when the
 * material is missing or malformed — callers fail closed.
 */
export async function importSigningKey(pem: string): Promise<CryptoKey | null> {
  const der = pemToDer(pem);
  if (!der) return null;
  try {
    return await crypto.subtle.importKey("pkcs8", der, ECDSA_IMPORT, false, [
      "sign",
    ]);
  } catch {
    return null;
  }
}

/**
 * Import a public verification key from the JWK the desktop app ships.
 * Used by tests and by server-side sanity checks of a presented token.
 */
export async function importVerificationKey(jwk: {
  kty: string;
  crv: string;
  x: string;
  y: string;
}): Promise<CryptoKey | null> {
  try {
    return await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true },
      ECDSA_IMPORT,
      false,
      ["verify"]
    );
  } catch {
    return null;
  }
}

/** Sign claims into the compact token string. */
export async function signEntitlementToken(
  claims: EntitlementClaims,
  key: CryptoKey
): Promise<string> {
  const payloadB64 = b64url(Buffer.from(JSON.stringify(claims), "utf8"));
  const signed = Buffer.from(SIGNATURE_PREFIX + payloadB64, "ascii");
  const signature = await crypto.subtle.sign(ECDSA, key, signed);
  return `${payloadB64}.${b64url(new Uint8Array(signature))}`;
}

/** Build the claims + token for a fresh activation. */
export async function mintEntitlementToken(
  input: {
    productSlug: string;
    licenceReference: string;
    activationId: string;
    deviceId: string;
    seats: number;
  },
  key: CryptoKey
): Promise<{ token: string; claims: EntitlementClaims }> {
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
  return { token: await signEntitlementToken(claims, key), claims };
}

/** Verify a token against a public key (tests + server-side sanity checks). */
export async function verifyEntitlementToken(
  token: string,
  key: CryptoKey
): Promise<EntitlementClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const signed = Buffer.from(SIGNATURE_PREFIX + payloadB64, "ascii");

  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      ECDSA,
      key,
      Buffer.from(sigB64, "base64url"),
      signed
    );
  } catch {
    // Malformed signature bytes throw — treat as invalid, never as valid.
    return null;
  }
  if (!valid) return null;

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
