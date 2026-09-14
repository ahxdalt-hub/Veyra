import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Veyra collects, uses, and protects your information — written plainly, because privacy policies should be readable.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Privacy Policy — Veyra", url: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="September 2026"
      intro="We collect as little as possible, use it only for what you'd expect, and never sell it. This page explains exactly what that means."
      sections={[
        {
          heading: "What we collect",
          body: (
            <>
              <p>
                <strong className="text-ink">Order information.</strong> When you
                purchase, our payment processor (added in our commerce phase)
                collects what checkout requires — name, email, payment details.
                We receive your email and the items purchased so we can deliver
                your files.
              </p>
              <p>
                <strong className="text-ink">Email address.</strong> If you
                request the free audit, we store your email address and the
                page it came from. Nothing else.
              </p>
              <p>
                <strong className="text-ink">Basic analytics.</strong> We use
                privacy-respecting, aggregate analytics to see which pages are
                read. No cross-site tracking, no advertising pixels.
              </p>
            </>
          ),
        },
        {
          heading: "What we never do",
          body: (
            <p>
              We never sell, rent, or share your email address or order data
              with third parties for their marketing. We don&rsquo;t send
              unrequested promotional emails beyond the resource you asked for,
              and every email we do send includes a working unsubscribe link.
            </p>
          ),
        },
        {
          heading: "Where data lives",
          body: (
            <p>
              Lead and order records are stored with our infrastructure
              providers (Supabase and our payment processor), who act as data
              processors under our instructions. Access is limited to the
              people who answer your emails.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              You can ask us to show, correct, export, or delete your personal
              data at any time by writing to us. Requests are handled within
              30 days, usually the same week.
            </p>
          ),
        },
        {
          heading: "Changes",
          body: (
            <p>
              If this policy changes materially, we&rsquo;ll note the new date above
              and — where it affects you directly — email you before it takes
              effect.
            </p>
          ),
        },
      ]}
    />
  );
}
