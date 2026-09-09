import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/motion/reveal";
import { MailIcon, ClockIcon, CheckIcon } from "@/components/ui/icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Questions about a system, your order, or a refund? Contact Standard Practice — we answer every email personally.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact — Standard Practice", url: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        eyebrow="Contact"
        title="A real inbox, answered by a real person."
        lead="Questions before you buy, issues after, or a refund request — email is the fastest way through."
      />

      <div className="bg-surface">
        <div className="container-page py-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <a
                href={`mailto:${site.contact.email}`}
                className="group flex items-start gap-5 rounded-md border border-line bg-paper p-6 transition-colors hover:border-accent/40"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line bg-surface">
                  <MailIcon className="h-5 w-5 text-accent" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">
                    {site.contact.email}
                  </span>
                  <span className="mt-1 block text-xs text-ink-3">
                    Click to open your mail app, or copy the address.
                  </span>
                </span>
              </a>

              <div className="mt-6 flex items-start gap-5 rounded-md border border-line bg-paper p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line bg-surface">
                  <ClockIcon className="h-5 w-5 text-accent" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">
                    Response time
                  </span>
                  <span className="mt-1 block text-xs text-ink-3">
                    Within one business day, usually sooner.
                  </span>
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <h2 className="text-display-2 text-[1.375rem]">
                Before you write
              </h2>
              <ul className="mt-5 space-y-4">
                {[
                  {
                    t: "Order or download issues",
                    d: "Include the email you used at checkout and we'll locate it immediately.",
                  },
                  {
                    t: "Refund requests",
                    d: "Within 14 days of purchase — see the Refund Policy page for the two-line version.",
                  },
                  {
                    t: "Pre-purchase questions",
                    d: "Ask exactly what's inside any system — we'll tell you straight, including if it isn't right for you.",
                  },
                ].map((item) => (
                  <li key={item.t} className="flex gap-3">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        {item.t}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-3">
                        {item.d}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
