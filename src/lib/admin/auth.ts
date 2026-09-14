import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Admin authentication — the gate to the Veyra Command Center.
 *
 * Security model (Stage 05):
 *  - The admin credential lives in VEYRA_ADMIN_PASSWORD (server-side env
 *    var only). It is NEVER hardcoded, shipped to the browser, placed in
 *    client bundles, returned by APIs, or logged.
 *  - A signed session token (HMAC-SHA256 over a random session id) is
 *    stored in an httpOnly, sameSite=lax cookie. The browser never sees
 *    the signing secret or the password — only the opaque token.
 *  - The signing secret is VEYRA_ADMIN_SESSION_SECRET when set (prod),
 *    otherwise derived from the admin password itself (dev) so the gate
 *    works with zero extra configuration and rotating the password
 *    invalidates old sessions.
 *  - Verification is timing-safe on both the password and the token.
 *
 * Defense in depth: the middleware checks the cookie for /admin/* routes,
 * every admin page and server action re-verifies server-side, and the
 * data layer only ever runs in server code with the service-role key.
 */

const COOKIE_NAME = "veyra_admin_session";
/** 8 hours — a working session, short enough to limit exposure. */
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.VEYRA_ADMIN_PASSWORD);
}

function password(): string {
  return process.env.VEYRA_ADMIN_PASSWORD ?? "";
}

/** The HMAC key for session tokens. Explicit secret in production;
 *  dev deployments derive one from the admin password (documented,
 *  deterministic — rotating the password kills all sessions). */
function sessionSecret(): string {
  return (
    process.env.VEYRA_ADMIN_SESSION_SECRET ?? `veyra-admin-session::${password()}`
  );
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Timing-safe password check. */
function passwordMatches(candidate: string): boolean {
  if (!adminPasswordConfigured()) return false;
  return safeEqual(candidate, password());
}

/* ------------------------------------------------------------------ */
/* Token format: "<sessionId>.<issuedAtMs>.<hmac(sessionId.issuedAtMs)>" */
/* ------------------------------------------------------------------ */

function mintToken(): string {
  const sessionId = randomBytes(24).toString("hex");
  const issuedAt = Date.now().toString();
  const payload = `${sessionId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [sessionId, issuedAt, mac] = parts;
  const payload = `${sessionId}.${issuedAt}`;
  if (!safeEqual(mac, sign(payload))) return false;
  const issued = Number(issuedAt);
  if (!Number.isFinite(issued)) return false;
  return Date.now() - issued < SESSION_TTL_MS;
}

/* ------------------------------------------------------------------ */
/* Cookie API — server actions / route handlers / server components    */
/* ------------------------------------------------------------------ */

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(COOKIE_NAME)?.value);
}

/** Verify the admin password and establish a session. Returns false on
 *  any mismatch; never reveals whether the gate is configured. */
export async function authenticateAdmin(candidate: string): Promise<boolean> {
  if (!passwordMatches(candidate)) return false;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, mintToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return true;
}

/** Clear the admin session. The cookie is expired client-side and the
 *  token becomes invalid server-side the moment it is absent. */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SESSION_TTL_MS = SESSION_TTL_MS;

/** Cookie spec for the middleware (which uses response.cookies.set). */
export const adminCookieSpec = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});
