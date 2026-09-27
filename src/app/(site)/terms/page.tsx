import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { REFUND_WINDOW_DAYS, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your purchase and use of Veyra business systems — plain language, fair on both sides.",
  alternates: { canonical: "/terms" },
  openGraph: { title: "Terms of Service — Veyra", url: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="September 2026"
      intro="These terms govern every purchase, download, and licence from Veyra. They're written to be read in one sitting and to be fair on both sides — the licence section and the liability section are the two that matter most."
      summary={[
        { label: "You get", value: "A perpetual licence for one business, with the seats you purchased" },
        { label: "You may", value: "Use and adapt it internally, for every client and project" },
        { label: "You may not", value: "Resell, redistribute, or sublicense the system itself" },
        { label: "Refunds", value: `Full refund within ${REFUND_WINDOW_DAYS} days — see the Refund Policy` },
      ]}
      sections={[
        {
          heading: "Agreement",
          body: (
            <p>
              By purchasing, downloading, or using a {site.name} product you
              agree to these terms. {site.name} is a {site.parent} brand;{" "}
              &ldquo;we&rdquo;, &ldquo;us&rdquo;, and &ldquo;our&rdquo; refer to
              the {site.parent} team operating {site.name}. If you&rsquo;re
              buying on behalf of a business, you confirm you can bind that
              business to these terms.
            </p>
          ),
        },
        {
          heading: "What you're buying",
          body: (
            <p>
              Each product is a digital system delivered electronically after
              purchase — files, and where applicable a desktop application with
              a licence key. No physical goods are shipped, and no ongoing
              hosting or support subscription is included unless stated on the
              product page. Prices are shown and charged in US dollars.
            </p>
          ),
        },
        {
          heading: "Licence grant",
          body: (
            <>
              <p>
                Your purchase grants a perpetual licence to use the system
                within <strong>one business or sole practice</strong>, up to the
                number of seats purchased. Within that scope, use is unlimited —
                every client, every project, every team member covered by a
                seat.
              </p>
              <p>
                Where a product uses seat-based activation, each activated
                device consumes one seat. You can release a seat at any time by
                deactivating a device from your account, and reassign it to
                another machine.
              </p>
              <p>
                You may adapt the system freely for your own internal use. You
                may <strong>not</strong> resell, redistribute, sublicense, or
                publish the system itself — in original or lightly edited form,
                whether free or paid — and you may not circumvent or tamper
                with licence keys, activation limits, or download
                authorisation.
              </p>
            </>
          ),
        },
        {
          heading: "Accounts",
          body: (
            <p>
              Your customer account holds your orders, licences, and downloads.
              Keep its credentials to yourself; activity under your account is
              your responsibility. One account per purchaser — team members use
              seats under your licence, not separate copies of it. If you
              believe your account has been compromised, tell us and we&rsquo;ll
              secure it with you.
            </p>
          ),
        },
        {
          heading: "Payment and pricing",
          body: (
            <p>
              Checkout is processed by Razorpay. We see your email, the order
              amount, and its status — never your card details. Prices may
              change between offers, but a change never affects a purchase
              you&rsquo;ve already made. You&rsquo;re responsible for any taxes
              that apply to you as the purchaser.
            </p>
          ),
        },
        {
          heading: "Delivery and updates",
          body: (
            <>
              <p>
                Delivery happens automatically once payment is confirmed: your
                licence is issued, a receipt is emailed to the address on your
                order, and the download appears in your account library. If
                delivery doesn&rsquo;t arrive, contact us and we&rsquo;ll make
                it right.
              </p>
              <p>
                When we improve a product you&rsquo;ve purchased, you receive
                the updated version through your library at no additional cost
                for the life of that product line.
              </p>
            </>
          ),
        },
        {
          heading: "Refunds",
          body: (
            <p>
              Purchases are refundable in full within {REFUND_WINDOW_DAYS} days,
              no explanation required, as described in the{" "}
              <a href="/refund-policy">Refund Policy</a>. A refund ends the
              licence: activations are released and downloads are withdrawn.
            </p>
          ),
        },
        {
          heading: "Intellectual property",
          body: (
            <p>
              The systems, their structure, and everything we publish remain the
              property of {site.parent}. Your licence is a right to use, not a
              transfer of ownership. Work you create <em>with</em> a system —
              your client documents, your pipelines, your adapted templates —
              belongs entirely to you.
            </p>
          ),
        },
        {
          heading: "Disclaimer and liability",
          body: (
            <>
              <p>
                The systems are working documents, not professional advice.
                They&rsquo;re provided &ldquo;as is&rdquo;; you remain
                responsible for how you run your business and for complying with
                the laws that apply to you.
              </p>
              <p>
                To the maximum extent permitted by law, our liability for any
                claim related to a purchase is limited to the amount you paid
                for that product, and we&rsquo;re not liable for indirect or
                consequential losses such as lost profits or lost data.
              </p>
            </>
          ),
        },
        {
          heading: "Changes, severability, and contact",
          body: (
            <>
              <p>
                We may update these terms as the products and business evolve.
                The version that governs your purchase is the one published at
                the time you bought; material changes to it will be noted with a
                new date above. If any provision is found unenforceable, the
                rest of the terms stand as written.
              </p>
              <p>
                Questions about these terms — or a situation they don&rsquo;t
                cover — write to{" "}
                <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
