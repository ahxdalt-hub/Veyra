import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import { takeRateLimit, clientIp } from "@/lib/rate-limit";
import { redeemCode, type RedeemReason } from "@/lib/redeem";

/**
 * POST /api/redeem — exchange a marketplace code (AppSumo) for a Veyra copy.
 *
 * The code is the credential, so this endpoint is the abuse surface: throttled
 * per IP and per code, and it never reveals anything about a code beyond
 * whether it can be claimed. A signed-in buyer's order is linked to their
 * account; a guest order attaches to the account that later verifies the same
 * email, so "enter the email you'll use for Veyra" is a real instruction.
 */

const MESSAGE: Record<RedeemReason, string> = {
  not_found: "That code doesn't look right — check for typos.",
  already_redeemed: "That code has already been used for another copy.",
  email_invalid: "Enter the email address you want the licence tied to.",
  not_configured: "Redemptions aren't enabled on this deployment yet.",
  fulfilment_failed:
    "We took your code but couldn't finish setting it up. Nothing is lost — write to support and we'll issue your copy.",
  server_error: "Something went wrong checking that code. Try again in a moment.",
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { code, email } = (body ?? {}) as Record<string, unknown>;
  if (typeof code !== "string" || !code.trim() || code.length > 64) {
    return NextResponse.json(
      { valid: false, reason: "not_found", message: MESSAGE.not_found },
      { status: 422 }
    );
  }
  if (typeof email !== "string") {
    return NextResponse.json(
      { valid: false, reason: "email_invalid", message: MESSAGE.email_invalid },
      { status: 422 }
    );
  }

  /* Guessing a code means getting a free copy, so throttle before touching
   * the database: 12 attempts per IP per 10 minutes, 5 per code per hour. */
  const [byIp, byCode] = await Promise.all([
    takeRateLimit(`redeem:ip:${clientIp(request)}`, 12, 600),
    takeRateLimit(`redeem:code:${code.trim().toLowerCase()}`, 5, 3600),
  ]);
  if (!byIp.allowed || !byCode.allowed) {
    return NextResponse.json(
      {
        valid: false,
        reason: "too_many_attempts",
        message: "Too many attempts — try again in a few minutes.",
      },
      { status: 429 }
    );
  }

  // A signed-in buyer's order is attached to their account immediately.
  let userId: string | null = null;
  if (supabaseAuthConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      userId = null;
    }
  }

  const result = await redeemCode({ code, email, userId });
  if (!result.ok) {
    return NextResponse.json(
      { valid: false, reason: result.reason, message: MESSAGE[result.reason] },
      { status: result.reason === "not_configured" ? 503 : result.reason === "email_invalid" ? 422 : 200 }
    );
  }

  return NextResponse.json({
    valid: true,
    orderId: result.orderId,
    productName: result.productName,
    productSlug: result.productSlug,
    email: result.email,
    pricePaid: `$${(result.amountMinor / 100).toFixed(2)} ${result.currency}`,
  });
}
