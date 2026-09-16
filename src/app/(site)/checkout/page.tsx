import { razorpayMode, razorpayUsesLocalGateway } from "@/lib/razorpay";
import CheckoutClient from "./checkout-client";

/**
 * Checkout — server wrapper.
 *
 * Its only job is to resolve the deployment's payment configuration
 * SERVER-SIDE and pass the safe, display-only facts (mode, gateway) to the
 * client component. No credential and no secret is serialized here — only
 * the resolved test/live mode, which the UI states honestly.
 *
 * Dynamic by design: the mode banner must reflect the running
 * deployment's environment, not a build-time snapshot.
 */
export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <CheckoutClient
      razorpayMode={razorpayMode()}
      gateway={razorpayUsesLocalGateway() ? "local-test-gateway" : "razorpay"}
    />
  );
}
