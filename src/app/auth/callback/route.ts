import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import { claimPurchasesForUser } from "@/lib/fulfillment";

/**
 * GET /auth/callback — Supabase email-confirmation / verification landing.
 * Exchanges the one-time code for a session, then links any guest
 * purchases made with the (now verified) account email before continuing.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  // Open-redirect guard: only in-app paths are honored.
  let next = url.searchParams.get("next") ?? "/account";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/account";

  if (supabaseAuthConfigured() && code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user?.id && data.user.email) {
      await claimPurchasesForUser(data.user.id, data.user.email);
    } else if (error) {
      console.warn("[auth] code exchange failed:", error.message);
      return NextResponse.redirect(`${origin}/account/sign-in`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
