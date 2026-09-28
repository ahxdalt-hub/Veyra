import {
  lemonSqueezyConfigured,
  lemonSqueezyMode,
} from "@/lib/lemon-squeezy";
import CheckoutClient from "./checkout-client";

/**
 * Checkout — server wrapper.
 *
 * Its only job is to resolve the deployment's payment configuration
 * SERVER-SIDE and pass the safe, display-only facts (mode, configured) to
 * the client component. No credential and no secret is serialized here —
 * only the resolved store mode and whether credentials exist, which the UI
 * states honestly.
 *
 * Dynamic by design: the mode banner must reflect the running
 * deployment's environment, not a build-time snapshot.
 */
export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <CheckoutClient mode={lemonSqueezyMode()} configured={lemonSqueezyConfigured()} />
  );
}
