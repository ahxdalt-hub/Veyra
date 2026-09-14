import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  supabaseAnonKey,
  supabaseAuthConfigured,
  supabaseUrl,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

/**
 * Server-side Supabase client bound to the requesting user's cookies.
 * Every account-area read goes through this client so ownership is
 * enforced by Row Level Security at the database, not by application
 * code or client state.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl()!, supabaseAnonKey()!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component render — the middleware's
          // cookie refresh handles it; nothing to do here.
        }
      },
    },
  });
}

/** The authenticated user from the session cookie, or null. */
export async function getSessionUser() {
  if (!supabaseAuthConfigured()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Page guard: redirects unauthenticated visitors to sign-in (carrying
 * their destination) when auth is configured. Defense in depth — the
 * middleware already protects these routes; each page guards itself too
 * so no route depends on a single layer.
 */
export async function requireAccountUser() {
  if (!supabaseAuthConfigured()) redirect("/account");
  const user = await getSessionUser();
  if (!user) redirect("/account/sign-in");
  return user;
}
