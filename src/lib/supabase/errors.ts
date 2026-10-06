import type { PostgrestError } from "@supabase/supabase-js";

/**
 * PostgrestError extends Error, so Next's dev overlay serializes it to
 * `{}` when forwarded to the browser console. Flatten the fields that
 * actually identify the failure (message, PGRST code, details, hint)
 * before logging so server logs stay readable.
 */
export function describePgError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const pg = error as PostgrestError;
    return {
      name: error.name,
      message: error.message,
      code: pg.code ?? null,
      details: pg.details ?? null,
      hint: pg.hint ?? null,
      cause: error.cause instanceof Error ? error.cause.message : null,
    };
  }
  // Plain objects (PostgrestError) — stringify so the dev log's JSON
  // serializer can't collapse them to `{}`.
  try {
    return { json: JSON.stringify(error) };
  } catch {
    return { error: String(error) };
  }
}

/**
 * Same flattening for Supabase Auth errors, whose status/code identify
 * the failure class (network blip vs rate limit vs dead session) that
 * the message alone often doesn't.
 */
export function describeAuthError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const auth = error as { status?: number; code?: string };
    return {
      name: error.name,
      message: error.message,
      status: auth.status ?? null,
      code: auth.code ?? null,
    };
  }
  return { error: String(error) };
}

/**
 * Is this `getUser()` failure a definitive "signed out" — no session, or
 * the auth server answered and rejected it (invalid_grant, bad_jwt, a
 * refresh token Supabase no longer has)?
 *
 * Anything else (transport error, 429, 5xx) means the answer is UNKNOWN.
 * The two must not be handled the same way: treating a blip as "signed
 * out" bounces a legitimately signed-in admin — or customer — to the
 * sign-in page, where the missing session reads like a problem with their
 * account. auth-js marks transport failures with status 0 /
 * AuthRetryableFetchError.
 */
export function isDefinitiveSignOut(error: {
  name?: string;
  status?: number;
}): boolean {
  if (error.name === "AuthSessionMissingError") return true; // no session cookies
  if (
    typeof error.status === "number" &&
    error.status > 0 &&
    error.status < 500 &&
    error.status !== 429
  ) {
    return true;
  }
  return false;
}
