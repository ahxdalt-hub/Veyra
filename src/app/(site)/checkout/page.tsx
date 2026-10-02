import {
  lemonSqueezyConfigured,
  lemonSqueezyMode,
} from "@/lib/lemon-squeezy";
import { razorpayMode } from "@/lib/razorpay";
import { paymentProvider } from "@/lib/payments/provider";
import CheckoutClient from "./checkout-client";

/**
 * Checkout — server wrapper.
 *
 * Its only job is to resolve the deployment's payment configuration
 * SERVER-SIDE and pass the safe, display-only facts (mode, configured,
 * provider) to the client component. No credential and no secret is
 * serialized here — only the resolved store mode and whether credentials
 * exist, which the UI states honestly.
 *
 * Provider resolution: PAYMENT_PROVIDER decides, explicitly (see
 * src/lib/payments/provider.ts) — never the mere presence of Razorpay
 * keys. Dynamic by design: the mode banner must reflect the running
 * deployment's environment, not a build-time snapshot.
 */
export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  const provider = paymentProvider();
  return (
    <CheckoutClient
      mode={provider === "razorpay" ? razorpayMode() : lemonSqueezyMode()}
      configured={provider === "razorpay" || lemonSqueezyConfigured()}
      provider={provider}
    />
  );
}
