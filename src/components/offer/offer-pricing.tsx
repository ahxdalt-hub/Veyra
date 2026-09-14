import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import { PriceAnchor } from "@/components/offer/price-anchor";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";

/**
 * OfferValue — why the price is what it is, shown rather than argued.
 *
 * The left column explains what $149 represents (a connected system, not
 * a template pile); the right column establishes the anchor: regular
 * price $149, founding customer price $79. Both numbers resolve from the
 * pricing module — the same one checkout charges through.
 */

const valueRows = [
  {
    title: "Connected, not collected",
    body: "Each stage hands its output to the next: positioning feeds outreach, outreach feeds sales, sales feeds onboarding. One workflow, not twelve documents.",
  },
  {
    title: "Priced as infrastructure",
    body: "This is something you run every week, for years — closer to how you'd think about software you operate than a course you finish once.",
  },
  {
    title: "Yours outright",
    body: "One payment and every future revision is included. Per-seat licensing for individuals and small teams — no subscription, no renewals, no metering.",
  },
];

export function OfferValue() {
  const founding = {
    price: FOUNDING_PRICE,
    regularPrice: REGULAR_PRICE,
    save: REGULAR_PRICE - FOUNDING_PRICE,
  };

  return (
    <section className="border-b border-line bg-surface">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <SectionHead
            eyebrow="The value"
            title={
              <>
                Built as a complete system,{" "}
                <span className="em-serif">not a pile of templates.</span>
              </>
            }
            lead="The Client Growth System covers the entire client-growth journey — twelve modules across six connected stages, designed to be run for years. That completeness is what the price reflects."
          />
        </Reveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          {/* What $149 represents */}
          <div>
            <Reveal>
              <ul className="divide-y divide-line border-y border-line">
                {valueRows.map((row, i) => (
                  <Reveal
                    as="li"
                    key={row.title}
                    delay={0.05 + i * 0.06}
                    className="py-6"
                  >
                    <h3 className="text-[1.0625rem] font-medium text-ink">
                      {row.title}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-3">
                      {row.body}
                    </p>
                  </Reveal>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-10 max-w-xl">
                <p className="spec text-accent">Founding customers</p>
                <h3 className="mt-3 text-display-2">
                  The launch price, while the first customers come onboard.
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-ink-2">
                  Veyra is launching the Client Growth System at a founding
                  customer price of{" "}
                  <span className="font-medium tnum text-ink">
                    ${founding.price}
                  </span>{" "}
                  — an entry point for early customers, not a markdown. The
                  intended regular price is{" "}
                  <span className="font-medium tnum text-ink">
                    ${founding.regularPrice}
                  </span>
                  , and the product moves toward it as the launch settles.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-3">
                  Founding customers keep what they bought: the system is
                  theirs outright, and every future revision is included.
                </p>
              </div>
            </Reveal>
          </div>

          {/* The anchor, as a kept card */}
          <Reveal delay={0.1}>
            <div className="rounded-lg border border-line bg-paper p-7 shadow-sm sm:p-9 lg:sticky lg:top-28">
              <PriceAnchor
                regularPrice={founding.regularPrice}
                price={founding.price}
                save={founding.save}
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
