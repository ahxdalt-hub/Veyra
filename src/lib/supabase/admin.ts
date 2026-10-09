/**
 * Service-role client — one per isolate, reused across requests.
 *
 * `createClient` is not cheap: the first GoTrueClient built in a fresh process
 * costs ~16 ms of CPU. A Cloudflare Worker request is billed CPU against this
 * plan's per-invocation budget (10 ms on Workers Free), and the licence routes
 * used to construct one client per call site per request — three on
 * /api/licence/activate alone — which pushed cold isolates straight over the
 * limit. That is the intermittent error 1102, not the ECDSA signing.
 *
 * Sharing is safe because the client carries no session state
 * (`persistSession: false`) and no per-request data: every call is an explicit
 * PostgREST query with the service key.
 */

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./config";

/**
 * Deliberately untyped: `src/lib/supabase/types.ts` is generated from a
 * subset of the schema and does not list `licence_activate`,
 * `licence_deactivate`, `licence_revalidate` or `rate_limit_take`, so a
 * `Database` generic would reject the exact calls this client exists to make.
 * Every use site already narrows the response by hand.
 */
let client: SupabaseClient | null = null;

/** The service-role client, or null when Supabase isn't configured on this
 *  deployment — callers keep their own fail-closed checks. */
export function supabaseAdminClient(): SupabaseClient | null {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
