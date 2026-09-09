import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import { FaqAccordion, type FaqItem } from "./faq-accordion";
import { site } from "@/lib/site";

/**
 * FAQ — Section I. Copy doubles as the FAQPage JSON-LD source.
 */

export const faqItems: FaqItem[] = [
  {
    q: "What do I receive after purchase?",
    a: "Immediately after checkout you receive a download page and email containing: the Notion workspace template links, any Google Sheets files, and the PDF playbook or guide. Everything is duplicated into your own accounts — nothing is hosted on ours.",
  },
  {
    q: "Is this a digital product?",
    a: "Yes. Every system is a digital download — Notion templates, Google Sheets files, and PDFs. No physical goods, no shipping, no waiting.",
  },
  {
    q: "How quickly do I get access?",
    a: "Instantly. Access is delivered the moment your payment completes — typically under a minute, straight to your inbox and available on your confirmation page.",
  },
  {
    q: "Can I use it for my business?",
    a: "Yes — the licence covers one business or sole practitioner with unlimited use. Run it with your whole team, use it for every client, and adapt the structures to your services. Reselling or redistributing the templates themselves is not permitted.",
  },
  {
    q: "Are refunds available?",
    a: "Yes. If a system isn't right for you, contact us within 14 days of purchase and we'll refund it — no interrogation. The full policy is on our Refund Policy page.",
  },
  {
    q: "Do I need any special software?",
    a: "No. Everything runs on free accounts: Notion (free plan is sufficient) and Google Sheets with a Google account. PDFs open anywhere. No paid subscriptions, no installs.",
  },
];

export function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section id="faq" className="scroll-mt-24 border-b border-line bg-paper">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <Reveal>
            <SectionHead
              eyebrow="Questions"
              title="Everything you might be wondering."
            />
            <p className="mt-6 text-sm text-ink-3">
              Something we didn&rsquo;t cover? Write to{" "}
              <a
                href={`mailto:${site.contact.email}`}
                className="font-medium text-accent underline-offset-4 hover:underline"
              >
                {site.contact.email}
              </a>{" "}
              — we answer personally.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <FaqAccordion items={faqItems} />
          </Reveal>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
