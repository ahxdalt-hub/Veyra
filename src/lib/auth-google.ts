"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseAuthConfigured } from "@/lib/supabase/config";

/**
 * Google OAuth (Supabase Auth).
 *
 * `signInWithGoogle` hands off to Google through the existing
 * /auth/callback route, which already exchanges the returned code for a
 * session and claims any guest purchases — so there is no separate
 * OAuth backend to maintain; this reuses the same flow as email
 * confirmation and magic links.
 *
 * `useGoogleProviderEnabled` gates the button on whether the provider is
 * actually switched on in Supabase (Auth → Providers → Google). Until an
 * owner enables it there, the button stays hidden rather than rendering a
 * control that would 400 on click — so the UI never lies about capability.
 */

const GOOGLE_DISABLED_ERROR =
  "Google sign-in isn't available right now. Please use your email or a magic link.";

/** Begin the Google OAuth redirect. Resolves with an error message on failure. */
export async function signInWithGoogle(
  next: string
): Promise<{ error?: string }> {
  if (!supabaseAuthConfigured()) {
    return { error: GOOGLE_DISABLED_ERROR };
  }
  try {
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      // A disabled/ misconfigured provider surfaces here — keep the copy
      // friendly and route the visitor to a path that always works.
      return { error: GOOGLE_DISABLED_ERROR };
    }
    // On success the browser is already navigating to Google; nothing to do.
    return {};
  } catch {
    return { error: GOOGLE_DISABLED_ERROR };
  }
}

/**
 * True once we've confirmed Google is an enabled auth provider. Returns
 * false while unconfigured or until the check resolves, so the button
 * only appears when it will genuinely work. Fails safe (hidden) on any
 * network hiccup — a missing button is better than a broken one.
 */
export function useGoogleProviderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!supabaseAuthConfigured()) return;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${url}/auth/v1/settings`, {
          headers: { apikey: anon },
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          external?: Record<string, boolean>;
        };
        if (!cancelled && json.external?.google) {
          setEnabled(true);
        }
      } catch {
        // Ignore — button stays hidden.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
