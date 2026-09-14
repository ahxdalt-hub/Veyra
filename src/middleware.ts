import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  supabaseAnonKey,
  supabaseAuthConfigured,
  supabaseUrl,
} from "@/lib/supabase/config";

/**
 * Middleware — two independent guards:
 *
 * 1. ADMIN GATE (/admin): every admin route except /admin/login requires
 *    a veyra_admin_session cookie with a valid shape and unexpired
 *    timestamp. Unauthenticated requests redirect to the login page
 *    carrying their destination. Defense in depth: this is only the fast
 *    edge — every admin page, server action, and data call re-verifies
 *    the full HMAC signature server-side (src/lib/admin/auth.ts), so a
 *    forged cookie passes here at most, never past the pages.
 *
 * 2. CUSTOMER SESSION (/account): the @supabase/ssr refresh pattern plus
 *    route guarding (Stage 04), unchanged.
 */

/** Edge-safe pre-check: shape + TTL. The full HMAC check happens in the
 *  pages/actions/data layer (node runtime, node:crypto). */
function hasPlausibleAdminCookie(request: NextRequest): boolean {
  const token = request.cookies.get("veyra_admin_session")?.value;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const issued = Number(parts[1]);
  if (!Number.isFinite(issued)) return false;
  const TTL_MS = 8 * 60 * 60 * 1000;
  return Date.now() - issued < TTL_MS;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // --- Admin gate -------------------------------------------------------
  // /admin/api/* routes are skipped here: they need JSON 401 responses,
  // not HTML redirects (a fetch() following a 307 to the login page
  // would return HTML). They verify the full session signature
  // server-side in their handlers — the guard is not weakened.
  const { pathname, search } = request.nextUrl;
  const isAdminApi = pathname.startsWith("/admin/api/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin = pathname === "/admin/login";
  if (
    isAdminRoute &&
    !isAdminLogin &&
    !isAdminApi &&
    !hasPlausibleAdminCookie(request)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

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
