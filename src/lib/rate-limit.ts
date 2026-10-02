/**
 * Shared rate limiting for sensitive endpoints.
 *
 * The previous throttles were per-isolate Maps — on Cloudflare Workers
 * every isolate keeps its own, counts reset on deploy, and a fresh
 * isolate starts from zero. Meaningful throttling needs shared,
 * persistent state. Veyra's shared store is Supabase Postgres, so the
 * counter lives there: `rate_limit_take` (0025_rate_limits.sql) is an
 * atomic SECURITY DEFINER fixed-window counter, serialized by Postgres
 * row locking across every isolate and region.
 *
 * Fail-open policy: if the rate-limit call itself errors (database
 * unreachable), the request is ALLOWED and the error logged. A rate
 * limiter outage must not brick sign-in or activation — the endpoints
 * keep their primary authorization logic, which is what actually
 * protects data; the limiter only blunts abuse.
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";

export type RateLimitResult = {
  allowed: boolean;
  /** True when the decision came from the shared store (not a fallback). */
  enforced: boolean;
};

/** Take one token from `bucket`. Windows are anchored to the epoch, so
 *  every isolate agrees on the current window without shared setup. */
export async function takeRateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!supabaseAdminConfigured()) {
    // Nothing to enforce with — behave like the old per-isolate throttle
    // being absent: allow, and let the endpoint's own checks decide.
    console.warn("[rate-limit] Supabase not configured; allowing request");
    return { allowed: true, enforced: false };
  }

  const admin = createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc("rate_limit_take", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] rate_limit_take failed:", error.message);
    return { allowed: true, enforced: false };
  }
  if (!data?.ok) {
    // Invalid bucket shape — the function refuses; allow rather than
    // block legitimate traffic on a naming bug, but say so loudly.
    console.error("[rate-limit] rate_limit_take rejected bucket", bucket);
    return { allowed: true, enforced: false };
  }
  return { allowed: Boolean(data.allowed), enforced: true };
}

/** Best-effort client identity for abuse throttling. Cloudflare sets
 *  CF-Connecting-IP on every request to a Worker; x-forwarded-for is the
 *  fallback for non-Worker runtimes (wrangler dev, other hosts). */
export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
