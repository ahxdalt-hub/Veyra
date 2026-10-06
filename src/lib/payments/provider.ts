/**
 * Payment provider selection — explicit, single provider.
 *
 * This deployment charges through Dodo Payments and nothing else. Razorpay
 * and Lemon Squeezy are fully removed: their keys, modules, checkout routes
 * and webhooks no longer exist here. The rule that survived is the one that
 * mattered — the provider is declared, never inferred from which
 * credentials happen to be present:
 *
 *   PAYMENT_PROVIDER=dodo  → Dodo Payments (the only accepted value).
 *
 * Unset defaults to "dodo". Any OTHER value fails closed — a stale
 * PAYMENT_PROVIDER=razorpay from an old deployment must be surfaced as a
 * configuration error, not silently absorbed. Checkout additionally requires
 * Dodo to be configured, or it refuses with `payments_not_configured` (503)
 * rather than charging anything.
 *
 * Server-side pricing is untouched by all of this: the amount always comes
 * from src/lib/pricing.ts, never from the browser.
 */

import "server-only";
import { dodoConfigured, dodoMode } from "@/lib/dodo-payments";

export type PaymentProvider = "dodo";

export type ProviderSelection =
  | { ok: true; provider: PaymentProvider; mode: string }
  | { ok: false; code: "payments_not_configured" | "payment_provider_invalid"; message: string };

/** The deployment's declared provider. Unset → "dodo". */
export function paymentProvider(): PaymentProvider {
  return "dodo";
}

/** True when PAYMENT_PROVIDER holds a leftover value from the Razorpay /
 *  Lemon Squeezy era (or any other typo) — a deployment mistake that must be
 *  surfaced, not silently absorbed. */
export function paymentProviderInvalid(): boolean {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (!raw) return false;
  return raw !== "dodo" && raw !== "dodo-payments";
}

/**
 * Customer-facing truth about who is processing checkout.
 *
 * The distinction is legally load-bearing, not cosmetic: Dodo Payments is a
 * MERCHANT OF RECORD — it is the seller of the order, and it calculates and
 * remits sales tax/VAT, and appears on the customer's bank statement. Terms,
 * receipts and refund notices read this instead of naming a gateway, so they
 * can never assert a role the processor doesn't actually have.
 */
export function paymentProcessorCopy(): {
  name: string;
  isMerchantOfRecord: boolean;
} {
  return { name: "Dodo Payments", isMerchantOfRecord: true };
}

/**
 * Resolve checkout against the configured Dodo credential set. Only
 * PAYMENT_PROVIDER decides the provider, and it must be "dodo" with Dodo
 * actually configured for this product.
 */
export function selectCheckoutProvider(productSlug: string): ProviderSelection {
  if (paymentProviderInvalid()) {
    return {
      ok: false,
      code: "payment_provider_invalid",
      message: `PAYMENT_PROVIDER="${process.env.PAYMENT_PROVIDER?.trim()}" is not a known provider (only "dodo" is supported).`,
    };
  }

  if (!dodoConfigured(productSlug)) {
    return {
      ok: false,
      code: "payments_not_configured",
      message:
        "DODO_PAYMENTS_API_KEY / DODO_PAYMENTS_PRODUCT_ID_… are not set for this product.",
    };
  }
  return { ok: true, provider: "dodo", mode: dodoMode() };
}
