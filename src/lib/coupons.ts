import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import type { CouponValidation, Database } from "@/lib/supabase/types";

/**
 * Coupons — the single server-side authority for discount validation.
 *
 * The customer path never reads public.coupons (the table is admin-read
 * only under RLS). Checkout validates through validate_coupon(), a
 * SECURITY DEFINER function granted to the service role: it reads the
 * coupon row and the customer's paid-use count as the database owner and
 * returns ONLY the structured validation result — code, label, and the
 * discount in whole dollars. The client can display it, never decide it:
 * the API route recomputes the payable amount from the returned discount
 * server-side.
 *
 * Money semantics (0013): percent value is percentage points; fixed
 * value and min_subtotal are whole dollars. Checkout founding prices
 * are whole dollars, so dollar-level math is exact; the DB stores cents.
 */

function serviceClient() {
  return createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Reason codes mapped to human copy. Unknown reasons fail closed. */
export function couponErrorMessage(reason: string): string {
  switch (reason) {
    case "not_found":
      return "That code doesn't look right — check for typos.";
    case "inactive":
      return "This code is no longer active.";
    case "not_started":
      return "This code isn't active yet.";
    case "expired":
      return "This code has expired.";
    case "min_subtotal":
      return "Your order doesn't meet this code's minimum total yet.";
    case "usage_exhausted":
      return "This code has reached its usage limit.";
    case "customer_limit":
      return "You've already used this code as many times as allowed.";
    default:
      return "We couldn't apply that code. Please try again.";
  }
}

/**
 * Validate a coupon for an email against a pre-discount subtotal (whole
 * dollars). Null subtotal is not possible — callers pass the computed
 * tier total. Returns null when the coupon system is unavailable (DB not
 * configured server-side), which checkout treats as "no discount".
 */
export async function validateCoupon(
  code: string,
  email: string,
  subtotalDollars: number
): Promise<CouponValidation | null> {
  if (!supabaseAdminConfigured()) return null;
  const trimmed = code.trim().toLowerCase();
  if (!trimmed || trimmed.length > 40 || !email) return null;

  const { data, error } = await serviceClient().rpc("validate_coupon", {
    p_code: trimmed,
    p_email: email,
    p_subtotal_dollars: Math.max(0, Math.floor(subtotalDollars)),
  });
  if (error) {
    // A coupon outage must never block a purchase.
    console.error("[coupons] validation failed:", error.message);
    return null;
  }
  return (data ?? null) as CouponValidation | null;
}
