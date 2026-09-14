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
