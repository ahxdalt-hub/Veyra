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
    a: "The Client Growth System itself — a finished, structured system covering the six phases of the client-growth journey, delivered digitally with everything you need to start running it.",
  },
  {
    q: "Is this a digital product?",
    a: "Yes. It is delivered digitally — no physical goods, no shipping, no waiting.",
  },
  {
    q: "How quickly do I get access?",
    a: "Delivery begins the moment your payment is confirmed. You'll receive your access details by email right away.",
  },
  {
    q: "Can I use it for my business?",
    a: "Yes — the licence covers one business with unlimited internal use. Run it with your whole team and adapt the structures to your services. Reselling or redistributing the system itself is not permitted.",
  },
  {
    q: "Are refunds available?",
    a: "Yes. If the system isn't right for you, contact us within 14 days of purchase and we'll refund it — no interrogation. The full policy is on our Refund Policy page.",
  },
  {
    q: "Is this a course or coaching?",
    a: "No. Veyra products are working systems, not programs to complete. There's nothing to watch and nobody to book — you get the system and run it.",
  },
  {
    q: "What about the other products?",
    a: "Client Acquisition OS, Offer OS, Sales OS, Client Operations OS, and Agency Growth OS are in development. Each will be announced on its product page when it becomes available.",
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
