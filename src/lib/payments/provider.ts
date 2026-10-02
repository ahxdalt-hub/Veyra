/**
 * Payment provider selection — explicit, never inferred.
 *
 * Historically checkout picked Razorpay whenever RAZORPAY_KEY_ID +
 * RAZORPAY_KEY_SECRET happened to be present in the environment (the 0022
 * test-provider convenience). That was a footgun: a deployment that adds
 * Razorpay keys for a side experiment silently reroutes real production
 * checkout away from Lemon Squeezy.
 *
 * The rule now is exactly one env var:
 *
 *   PAYMENT_PROVIDER=lemonsqueezy  → Lemon Squeezy only. Razorpay keys,
 *                                    if present, are ignored entirely.
 *   PAYMENT_PROVIDER=razorpay      → Razorpay only.
 *
 * Unset defaults to lemonsqueezy (the production provider). Any OTHER
 * value fails closed — a typo must never silently pick a provider. The
 * selected provider must also be fully configured, or checkout refuses
 * with `payments_not_configured` (503) rather than charging anything.
 *
 * Server-side pricing is untouched by all of this: the amount always
 * comes from src/lib/pricing.ts via the catalog, never from the browser.
 */

import "server-only";
import { lemonSqueezyConfigured, lemonSqueezyMode } from "@/lib/lemon-squeezy";
import { razorpayConfigured, razorpayMode } from "@/lib/razorpay";

export type PaymentProvider = "lemon-squeezy" | "razorpay";

export type ProviderSelection =
  | { ok: true; provider: PaymentProvider; mode: string }
  | { ok: false; code: "payments_not_configured" | "payment_provider_invalid"; message: string };

/** The deployment's declared provider. Unset → "lemon-squeezy". */
export function paymentProvider(): PaymentProvider {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (raw === "razorpay") return "razorpay";
  // "lemonsqueezy" (canonical) and "lemon-squeezy" (matches the order
  // column value) both mean Lemon Squeezy; anything else — including an
  // unset var — is Lemon Squeezy, the production provider.
  return "lemon-squeezy";
}

/** True when PAYMENT_PROVIDER holds an unrecognized value — a deployment
 *  mistake that must be surfaced, not silently absorbed. */
export function paymentProviderInvalid(): boolean {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (!raw) return false;
  return raw !== "lemonsqueezy" && raw !== "lemon-squeezy" && raw !== "razorpay";
}

/**
 * Resolve the provider for a checkout against the configured credential
 * set. No "razorpay keys exist → surprise" path: only PAYMENT_PROVIDER
 * decides, and the chosen provider must actually be configured.
 */
export function selectCheckoutProvider(productSlug: string): ProviderSelection {
  if (paymentProviderInvalid()) {
    return {
      ok: false,
      code: "payment_provider_invalid",
      message: `PAYMENT_PROVIDER="${process.env.PAYMENT_PROVIDER?.trim()}" is not a known provider (use "lemonsqueezy" or "razorpay").`,
    };
  }

  const provider = paymentProvider();

  if (provider === "razorpay") {
    if (!razorpayConfigured()) {
      return {
        ok: false,
        code: "payments_not_configured",
        message:
          "PAYMENT_PROVIDER=razorpay but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set.",
      };
    }
    return { ok: true, provider, mode: razorpayMode() };
  }

  if (!lemonSqueezyConfigured(productSlug)) {
    return {
      ok: false,
      code: "payments_not_configured",
      message:
        "PAYMENT_PROVIDER=lemonsqueezy but LEMONSQUEEZY_API_KEY / LEMONSQUEEZY_STORE_ID / LEMONSQUEEZY_VARIANT_ID_… are not set for this product.",
    };
  }
  return { ok: true, provider, mode: lemonSqueezyMode() };
}
