import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

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
      intro="These terms cover every purchase and download from Veyra. They're intentionally short — you should be able to read them in one sitting."
      sections={[
        {
          heading: "What you're buying",
          body: (
            <p>
              Each product is a digital system, delivered electronically after
              purchase. No physical goods are shipped, and no ongoing hosting
              or support subscription is included unless stated on the product
              page.
            </p>
          ),
        },
        {
          heading: "Licence",
          body: (
            <>
              <p>
                Your purchase grants a licence to use the system within one
                business or sole practice, with unlimited internal use — every
                client, every project, every team member.
              </p>
              <p>
                You may adapt the system freely for your own use. You may not
                resell, redistribute, sublicense, or publish the system itself,
                in original or lightly edited form, whether free or paid.
              </p>
            </>
          ),
        },
        {
          heading: "Delivery and availability",
          body: (
            <p>
              Delivery happens digitally after your payment is confirmed, with
              details sent to the email address on your order. If delivery
              fails to arrive, contact us and we&rsquo;ll make it right — see
              the Refund Policy for cases where delivery genuinely fails.
            </p>
          ),
        },
        {
          heading: "Updates",
          body: (
            <p>
              When we improve a product you&rsquo;ve purchased, you receive the
              updated version at no additional cost. Updates are delivered to
              the email address on your order.
            </p>
          ),
        },
        {
          heading: "Liability",
          body: (
            <p>
              The systems are working documents, not professional advice — you
              remain responsible for how you run your business and for
              complying with laws that apply to you. Our liability for any
              claim related to a purchase is limited to the amount you paid for
              that product.
            </p>
          ),
        },
      ]}
    />
  );
}
