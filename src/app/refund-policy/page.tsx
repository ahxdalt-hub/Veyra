import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Standard Practice refunds: 14 days, no interrogation. The full policy in plain language.",
  alternates: { canonical: "/refund-policy" },
  openGraph: {
    title: "Refund Policy — Standard Practice",
    url: "/refund-policy",
  },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund Policy"
      updated="September 2026"
      intro="A refund policy you don't need a lawyer to use: if a system isn't right for you, we refund it."
      sections={[
        {
          heading: "The short version",
          body: (
            <p>
              Contact us within <strong className="text-ink">14 days</strong> of
              purchase and we&rsquo;ll refund the full amount. You don&rsquo;t
              need to explain yourself, and you don&rsquo;t need to have tried
              it first.
            </p>
          ),
        },
        {
          heading: "How to request one",
          body: (
            <p>
              Email us from the address you used at checkout with the order
              number (or the approximate date of purchase). Refunds are
              processed to the original payment method, usually within a few
              business days depending on your bank.
            </p>
          ),
        },
        {
          heading: "After 14 days",
          body: (
            <p>
              If something breaks — a corrupted file, a link that no longer
              works, an update that didn&rsquo;t arrive — that&rsquo;s a fix, not
              a refund request. Write to us anytime and we&rsquo;ll make it
              right regardless of when you bought.
            </p>
          ),
        },
        {
          heading: "One small ask",
          body: (
            <p>
              When a system misses the mark for you, a sentence about why
              genuinely helps us improve it. It&rsquo;s welcome, never required.
            </p>
          ),
        },
      ]}
    />
  );
}
