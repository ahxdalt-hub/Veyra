"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

/**
 * Browser Supabase client — used only for the auth forms (sign in /
 * sign up). Authorization-sensitive reads never run through it; the
 * account pages read through the server client so RLS decides.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl()!, supabaseAnonKey()!);
}
