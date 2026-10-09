import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  supabaseAnonKey,
  supabaseAuthConfigured,
  supabaseUrl,
} from "@/lib/supabase/config";
import { describeAuthError, isDefinitiveSignOut } from "@/lib/supabase/errors";

/**
 * CLOUDFLARE EDGE RATE LIMITING (BYPASS DATABASE)
 * =================================================
 * 
 * This lightweight rate limiter uses Cloudflare's built-in Rate Limiting
 * feature (configured in Workers dashboard) combined with simple IP-based
 * throttling in middleware. NO database queries needed!
 * 
 * Strategy:
 * 1. Cloudflare Dashboard → Workers → Rate Limits (built-in feature)
 *    - Set global limits: 500 requests/min per IP (default protection)
 *    - Configure custom rules for sensitive endpoints
 * 
 * 2. Middleware-level soft throttle (optional, for fine-grained control):
 *    - Tracks request counts in-memory per isolate (resets on deploy)
 *    - Good enough for most abuse patterns
 *    - Fail-open: if tracking fails, allow the request
 * 
 * Why this approach?
 * - Database rate limiting (Supabase) is too slow for high-traffic pages
 * - Cloudflare handles billions of requests at edge level
 * - No added latency to your user experience
 * 
 * To enable Cloudflare Rate Limiting:
 * 1. Go to Cloudflare Dashboard > veyra.caelmont.in > Workers & Pages
 * 2. Select your worker ("veyra")
 * 3. Scroll to "Settings" > "Rate limiting"
 * 4. Add new rule with desired thresholds
 * 
 * Example rules:
 * - Rule 1: /api/* paths → 100 req/min per IP
 * - Rule 2: Homepage + marketing pages → 200 req/min per IP  
 * - Rule 3: Sign-up page → 10 req/min per IP (anti-bot)
 * 
 * All these happen at Cloudflare's edge, before hitting your Worker.
 */

const EDGE_RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED === "true";
const SOFT_REQUEST_LIMIT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10);
const REQUEST_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);

// In-memory rate limit tracker per isolate (resets on deploy/cold start)
// Uses Map to store {IP: {count, windowStart}}
const ipRequestTracker = new Map<string, { count: number; windowStart: number }>();

function getRateLimitStatus(ip: string): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const now = Date.now();
  const entry = ipRequestTracker.get(ip);

  // Reset window if expired
  if (!entry || now - entry.windowStart > REQUEST_WINDOW_MS) {
    ipRequestTracker.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: SOFT_REQUEST_LIMIT - 1 };
  }

  // Increment counter
  const newCount = entry.count + 1;
  ipRequestTracker.set(ip, { ...entry, count: newCount });

  if (newCount > SOFT_REQUEST_LIMIT) {
    const retryAfter = REQUEST_WINDOW_MS - (now - entry.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs: retryAfter };
  }

  return { allowed: true, remaining: SOFT_REQUEST_LIMIT - newCount };
}

function extractClientIP(request: NextRequest): string {
  // Priority: Cloudflare-specific headers over standard ones
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Middleware — customer session guard:
 *
 * The @supabase/ssr refresh pattern plus route guarding for the account
 * (/account) and admin (/admin) areas, unchanged.
 */

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname, search } = request.nextUrl;

  // --- EDGE RATE LIMITING CHECK (optional, non-blocking) ---
  // Only apply soft rate limiting if enabled and GET request
  if (EDGE_RATE_LIMIT_ENABLED && request.method === "GET") {
    try {
      const ip = extractClientIP(request);
      
      // Skip rate limiting for known-safe IPs (if you set up bypass token)
      const bypassToken = request.headers.get("x-rate-limit-bypass");
      if (bypassToken !== process.env.RATE_LIMIT_BYPASS_TOKEN) {
        const status = getRateLimitStatus(ip);
        
        if (!status.allowed) {
          // Return 429 Too Many Requests
          console.warn(`[rate-limit] IP ${ip} exceeded request limit (${SOFT_REQUEST_LIMIT}/${REQUEST_WINDOW_MS/1000} reqs/min)`);
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((status.retryAfterMs ?? REQUEST_WINDOW_MS) / 1000)),
          };
          const cfRay = request.headers.get("cf-ray");
          if (cfRay) headers["CF-Ray"] = cfRay;
          return new Response(
            JSON.stringify({
              error: "rate_limit_exceeded",
              message: "Too many requests. Please try again later.",
              retryAfter: status.retryAfterMs,
            }),
            { status: 429, headers }
          );
        }
      }
    } catch (error) {
      // Fail-open: if rate limiting fails, allow the request
      console.error("[rate-limit] Soft throttle error:", error);
    }
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
    error,
  } = await supabase.auth.getUser();

  // A failed verification is NOT the same as "signed out". On a transient
  // failure, skip every redirect below and pass through: signing an admin
  // out on a network blip is worse than one extra round trip, and nothing
  // leaks — every protected page/action re-verifies authoritatively
  // (requireAccountUser / requireAdmin). The refreshed cookies still ride
  // back on `response`.
  if (error && !isDefinitiveSignOut(error)) {
    console.warn(
      "[middleware] session verification unavailable; skipping route gating:",
      describeAuthError(error)
    );
    return response;
  }

  /* Server actions POST back to the page that rendered them. Rerouting one
   * of those replaces the action's flight payload with an HTML redirect, and
   * React surfaces that as a generic failure — sign-up hit exactly this: the
   * browser had just created the session, so the claim action's own POST was
   * redirected away from /account/sign-up. Only GET navigations may be
   * rerouted here; the refreshed cookies still ride back on `response`. */
  if (request.method !== "GET") return response;

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

  /* --- Admin command center gate (defense in depth) --------------------
   * The JWT claim check here is a FAST pre-filter, not the authority:
   * every admin page/action/layout independently re-verifies the role
   * against auth.users with the service-role key (src/lib/admin/auth.ts).
   * A demoted admin's live session therefore passes this middleware but
   * fails the authoritative check on the next render — and never touches
   * data. Customers hitting /admin see the login gate, nothing else. */
  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminRoute) {
    const isAuthPage =
      pathname === "/admin/sign-in" || pathname === "/admin/forgot-password";
    const claimsAdmin =
      (user?.app_metadata as { role?: string } | undefined)?.role === "admin";

    if (!user && !isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/sign-in";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    if (user && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = claimsAdmin ? "/admin" : "/account";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Signed in but not an admin: the command center doesn't exist for
    // them — bounce to their account rather than render anything.
    if (user && !claimsAdmin && !isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/account";
      url.search = "";
      return NextResponse.redirect(url);
    }
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
