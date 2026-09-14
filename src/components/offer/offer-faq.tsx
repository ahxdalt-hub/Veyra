import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import { FaqAccordion, type FaqItem } from "@/components/home/faq-accordion";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { REFUND_WINDOW_DAYS, site } from "@/lib/site";

/**
 * OfferFaq — the decision-support questions.
 *
 * Honest answers only: the founding-price explanation, what the system
 * covers, the per-seat licence, and the commercial facts (one-time,
 * refund). Doubles as the FAQPage JSON-LD source.
 */

export function OfferFaq() {
  const price = `$${FOUNDING_PRICE}`;
  const regular = `$${REGULAR_PRICE}`;

  const items: FaqItem[] = [
    {
      q: "Is this a subscription?",
      a: "No. The Client Growth System is a one-time purchase. You pay once, the system is yours, and every future revision is included. There is no monthly fee and no recurring charge of any kind.",
    },
    {
      q: "Who is it for?",
      a: "Freelancers, consultants, service businesses, and small agencies that run client work and want the growth side of the business to run on structure instead of memory — a more repeatable client-growth process, end to end.",
    },
    {
      q: "What does it cover?",
      a: "The full client-growth journey: BUILD → ACQUIRE → SELL → DELIVER → RETAIN → GROW. Twelve modules across the six stages — from business foundation, positioning, offer, and ideal client, through acquisition strategy, outreach, and follow-up, to sales, proposals, client onboarding, retention, and a standing growth review.",
    },
    {
      q: `Why is it ${price} right now?`,
      a: `${price} is the founding customer launch price, offered while Veyra launches. The intended regular price is ${regular} — the product moves toward it as the launch settles. Founding customers keep the system they bought, with every future revision included.`,
    },
    {
      q: "Is this just a template pack?",
      a: "No. It is designed as a connected business system you actually operate: six stages that feed each other, guided workflows in every module, and decisions you set once and reuse. Templates store information — the Client Growth System runs a process.",
    },
    {
      q: "Do teams need multiple licences?",
      a: "The licence is per seat: one purchase covers one person, and small teams can buy up to 5 seats in one checkout — the per-seat founding price steps down slightly as seats are added. The system itself is identical for every seat.",
    },
    {
      q: "What happens after I pay?",
      a: "Checkout is a one-time payment through secure checkout. Once your payment is confirmed, your order is recorded and delivery details arrive by email — you start the system at Build immediately.",
    },
    {
      q: "What if it isn't right for me?",
      a: `Every purchase carries a ${REFUND_WINDOW_DAYS}-day refund window. If the system isn't right for you, contact us within ${REFUND_WINDOW_DAYS} days and we refund it. The full policy is on our Refund Policy page.`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <section id="faq" className="scroll-mt-24 border-t border-line bg-paper">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <Reveal>
            <SectionHead
              eyebrow="Questions"
              title="Before you decide."
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
            <FaqAccordion items={items} />
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
