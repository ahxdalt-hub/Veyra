import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { REFUND_WINDOW_DAYS, site } from "@/lib/site";
import { paymentProcessorCopy } from "@/lib/payments/provider";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `Veyra refunds: ${REFUND_WINDOW_DAYS} days, no interrogation. The full policy in plain language.`,
  alternates: { canonical: "/refund-policy" },
  openGraph: {
    title: "Refund Policy — Veyra",
    url: "/refund-policy",
  },
};

export default function RefundPolicyPage() {
  const processor = paymentProcessorCopy();
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund Policy"
      updated="October 2026"
      intro={`A refund policy you don't need a lawyer to use: if a system isn't right for you, we refund it — in full, within ${REFUND_WINDOW_DAYS} days, without interrogation.`}
      summary={[
        { label: "Window", value: `${REFUND_WINDOW_DAYS} days from purchase, for any reason` },
        { label: "Amount", value: "Full refund to your original payment method" },
        { label: "How", value: `Email ${site.contact.email} from your checkout address` },
        { label: "Effect", value: "Licence deactivated, seats released, downloads withdrawn" },
      ]}
      sections={[
        {
          heading: "The short version",
          body: (
            <p>
              Contact us within{" "}
              <strong>{REFUND_WINDOW_DAYS} days</strong> of purchase and
              we&rsquo;ll refund the full amount. You don&rsquo;t need to
              explain yourself, you don&rsquo;t need to have tried the system
              first, and you won&rsquo;t be talked out of it.
            </p>
          ),
        },
        {
          heading: "How to request a refund",
          body: (
            <p>
              Email{" "}
              <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>{" "}
              from the address you used at checkout, with your order number or
              the approximate date of purchase. That&rsquo;s the whole process —
              there is no form, no call, and no retention script.
            </p>
          ),
        },
        {
          heading: "If you bought Veyra through another store",
          body: (
            <p>
              A purchase made on a marketplace is refundable under{" "}
              <em>that store&rsquo;s</em> window, not the {REFUND_WINDOW_DAYS}{" "}
              days above, and the request goes to them rather than to us — they
              hold the payment, so only they can return it. Tell us there and
              we deactivate the licence as soon as their notice arrives. Buying
              through a store never changes what the licence does while it is
              active.
            </p>
          ),
        },
        {
          heading: "What happens after you request one",
          body: (
            <>
              <p>
                Once the refund is issued, your licence is deactivated
                automatically: activated devices lose their entitlement on
                their next online check, assigned seats are released, and the
                product is withdrawn from your account library. You&rsquo;ll
                receive an email confirming the refund.
              </p>
              <p>
                The money returns to your original payment method through{" "}
                {processor.name}, the merchant of record that took the payment.
                We issue approved refunds promptly; how long the credit takes to
                appear — usually a few business days — depends on your bank or
                card issuer.
              </p>
            </>
          ),
        },
        {
          heading: `After ${REFUND_WINDOW_DAYS} days`,
          body: (
            <p>
              The no-questions window closes, but our obligation to deliver
              doesn&rsquo;t. If something breaks — a corrupted file, a download
              link that no longer works, an activation that won&rsquo;t seat, an
              update that didn&rsquo;t arrive — that&rsquo;s a fix, not a refund
              request. Write to us anytime and we&rsquo;ll make it right
              regardless of when you bought.
            </p>
          ),
        },
        {
          heading: "Exceptions",
          body: (
            <p>
              There is effectively one: repeated purchase-and-refund cycles on
              the same product. A refund returns your money and ends the
              licence; if we see a pattern of using it as a rental, we may
              decline further purchases. One honest refund is never a problem —
              that&rsquo;s what this policy exists for.
            </p>
          ),
        },
        {
          heading: "One small ask",
          body: (
            <p>
              When a system misses the mark for you, a sentence about why
              genuinely helps us improve it. It&rsquo;s welcome, never required,
              and never a condition of the refund.
            </p>
          ),
        },
      ]}
    />
  );
}
