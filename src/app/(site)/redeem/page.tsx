import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/motion/reveal";
import { RedeemForm } from "@/components/redeem/redeem-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Redeem a code",
  description:
    "Enter a Veyra redemption code to claim your Client Growth System licence and downloads. One code, one seat, single use.",
  alternates: { canonical: "/redeem" },
  // Entry point for buyers arriving from a third-party receipt. Nothing
  // here is worth ranking, and a public code field draws guessing traffic.
  robots: { index: false, follow: false },
};

/**
 * Redeem — the door for a purchase made somewhere other than this site.
 *
 * A code is a 100% coupon, so redemption is ordinary checkout: this page
 * POSTs /api/checkout, whose free-order branch skips the payment gateway,
 * walks the order pending → paid, and runs the same
 * grantPurchaseForOrder() (entitlement + licence + seat + receipt) the
 * processor webhook uses. No parallel fulfillment path exists here, and
 * none should — a second code path would be a second thing that can
 * disagree with the ledger.
 *
 * The buyer ends up with a guest order until they register with the same
 * email; claimPurchasesForUser() links it on sign-up (see
 * src/lib/fulfillment.ts), which is why step 1 of the success panel is an
 * account, not a download.
 */
export default function RedeemPage() {
  return (
    <div className="bg-paper">
      <PageHeader
        eyebrow="Access"
        title="Redeem a code"
        lead="You already own this. This page turns a redemption code into a Veyra licence — no payment, no card, nothing further to buy."
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Redeem" },
        ]}
      />

      <main className="container-page py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <Reveal>
            <RedeemForm />
          </Reveal>

          <Reveal delay={80}>
            <aside className="rounded-md border border-line bg-surface p-6">
              <p className="spec text-ink-4">What happens after you redeem</p>
              <ul className="mt-4 space-y-4 text-sm leading-relaxed text-ink-2">
                <li>
                  Your licence and downloads live in your Veyra account, not in
                  the email that carried the code — so the account has to be
                  created with the address you redeem against.
                </li>
                <li>
                  The Windows and macOS builds are both listed under{" "}
                  <Link
                    href="/account/licences"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Licences
                  </Link>
                  , and the licence activates when the app first verifies
                  online.
                </li>
                <li>
                  If the code came from a marketplace, that store handles
                  refunds and their window applies rather than{" "}
                  <Link
                    href="/refund-policy"
                    className="underline underline-offset-2"
                  >
                    ours
                  </Link>
                  . The software you downloaded keeps working until they tell us
                  otherwise.
                </li>
              </ul>

              <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-ink-2">
                Trouble with a code? Write to{" "}
                <a
                  href={`mailto:${site.contact.email}`}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  {site.contact.email}
                </a>{" "}
                with the code and the address you used.
              </p>
            </aside>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
