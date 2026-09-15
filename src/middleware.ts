import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  supabaseAnonKey,
  supabaseAuthConfigured,
  supabaseUrl,
} from "@/lib/supabase/config";

/**
 * Middleware — customer session guard:
 *
 * The @supabase/ssr refresh pattern plus route guarding for the account
 * area (/account), unchanged.
 */

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname, search } = request.nextUrl;

  if (!supabaseAuthConfigured()) return response;

  const supabase = createServerClient(supabaseUrl()!, supabaseAnonKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() (not getSession()) — the JWT is verified against the auth
  // server before the request is trusted.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAccountAuthPage =
    pathname === "/account/sign-in" ||
    pathname === "/account/sign-up" ||
    pathname === "/account/forgot-password";
  const isAccountPage =
    pathname === "/account" || pathname.startsWith("/account/");

  // Signed-in visitors don't need the auth forms.
  if (user && isAccountAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/account";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Account area requires a session. /account itself is excluded: it
  // renders the sign-in guidance when auth is unconfigured.
  if (!user && isAccountPage && !isAccountAuthPage && pathname !== "/account") {
    const url = request.nextUrl.clone();
    url.pathname = "/account/sign-in";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except API routes, Next internals, and static assets —
    // webhook deliveries must never be delayed by session work.
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)",
  ],
};
