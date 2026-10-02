import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * The vault gate — a per-session re-entry check for the command center.
 *
 * The Supabase session keeps an admin signed in for weeks; the vault
 * exists so that freshly opening the admin panel still demands the
 * 4-digit code (walk away from your laptop, and the dashboard is not
 * the next thing on screen). Cleared-state is a signed, session-scoped
 * cookie:
 *
 *  - HMAC'd with a server-only secret (VEYRA_ADMIN_SESSION_SECRET when
 *    set, else derived from the service-role key) so the browser cannot
 *    forge it;
 *  - a session cookie — no Max-Age — so closing the browser forgets it
 *    and the vault re-arms;
 *  - timestamped with a hard 12h validity, so an eternally-open browser
 *    still re-arms twice a day.
 *
 * This is an anti-drive-by gate, NOT the authority: the role checks in
 * src/lib/admin/auth.ts remain the real boundary, and the pin itself is
 * always verified server-side (VEYRA_ADMIN_PIN). Unset pin env = the
 * whole vault stage doesn't exist.
 */

export const VAULT_COOKIE = "veyra-cc-vault";

const VAULT_TTL_MS = 12 * 60 * 60 * 1000;

export function pinStepEnabled(): boolean {
  const pin = process.env.VEYRA_ADMIN_PIN;
  return Boolean(pin && /^\d{4,8}$/.test(pin));
}

function vaultSecret(): string {
  return (
    process.env.VEYRA_ADMIN_SESSION_SECRET ||
    `veyra-cc-vault:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`
  );
}

/** A fresh clearance token: `<issuedAtMs>.<hmac>`. */
export function issueVaultToken(now = Date.now()): string {
  const mac = createHmac("sha256", vaultSecret()).update(String(now)).digest();
  return `${now}.${mac.toString("base64url")}`;
}

export function verifyVaultToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const ts = token.slice(0, dot);
  let mac: Buffer;
  try {
    mac = Buffer.from(token.slice(dot + 1), "base64url");
  } catch {
    return false;
  }
  const expected = createHmac("sha256", vaultSecret()).update(ts).digest();
  if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) {
    return false;
  }
  const issued = Number(ts);
  const age = Date.now() - issued;
  return Number.isFinite(issued) && age >= -60_000 && age <= VAULT_TTL_MS;
}

/** True when the vault may stay open for this request. Server code only. */
export async function vaultCleared(): Promise<boolean> {
  if (!pinStepEnabled()) return true;
  const store = await cookies();
  return verifyVaultToken(store.get(VAULT_COOKIE)?.value);
}
