/**
 * Supabase environment resolution.
 *
 * Two distinct configurations, both server-trusted:
 *  - ANON key + user session: used by the account area so every read is
 *    RLS-enforced by the database (auth never equals authorization).
 *  - SERVICE ROLE key: server-side only, used by the payment/webhook
 *    fulfillment paths and the claim routine. NEVER exposed to the
 *    browser and never prefixed NEXT_PUBLIC_.
 */

export function supabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || null;
}

export function supabaseAnonKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export function supabaseServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

/** True when Supabase is configured enough for auth + account queries. */
export function supabaseAuthConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

/** True when server-side privileged writes (fulfillment) are available. */
export function supabaseAdminConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseServiceRoleKey());
}
