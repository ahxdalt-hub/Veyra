"use client";

import { Button } from "@/components/ui/button";
import { FoundingCta } from "@/components/offer/founding-cta";
import { PriceAnchor } from "@/components/offer/price-anchor";
import { Rise } from "@/components/offer/rise";
import { JourneyPreview } from "@/components/product/journey-preview";
import { REFUND_WINDOW_LABEL } from "@/lib/site";

/**
 * OfferHero — the Client Growth System's opening statement.
 *
 * Name and promise first, the founding price and CTA inside the first
 * viewport, and the large journey preview directly beneath. One staggered
 * entrance; fully static under prefers-reduced-motion (Rise swaps to
 * plain elements only after hydration, so SSR and hydration agree). All
 * commercial values arrive as props, resolved from the pricing module by
 * the server page.
 */

export function OfferHero({
  slug,
  name,
  price,
  regularPrice,
  save,
}: {
  slug: string;
  name: string;
  price: number;
  regularPrice: number;
  save: number;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-paper">
      {/* Faint drafting grid — texture, not decoration */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-blueprint-faint [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_75%)]"
      />

      <div className="container-page relative py-14 text-center sm:py-20 lg:py-24">
        <Rise as="p" delay={0.05} className="text-eyebrow mx-auto mb-5 inline-block">
          {name} — available now
        </Rise>

        <Rise as="h1" delay={0.16} className="text-display-hero mx-auto max-w-4xl">
          Turn client growth into a system you can{" "}
          <span className="em-serif">actually run.</span>
        </Rise>

        <Rise delay={0.27} className="mx-auto mt-6 max-w-2xl">
          <p className="text-lead">
            One connected system for the whole journey — build the
            foundation, acquire clients, sell, deliver, retain, and grow.
            Not a course to watch. Not a folder of templates. A system you
            run, week after week.
          </p>
        </Rise>

        {/* Founding price + CTA — the hero's commercial moment */}
        <Rise delay={0.38} className="mx-auto mt-10 max-w-3xl">
          <PriceAnchor
            regularPrice={regularPrice}
            price={price}
            save={save}
            variant="row"
            className="justify-center"
          />
          <p className="mt-3 text-xs text-ink-3">
            Founding customer price · One-time purchase · No subscription
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <FoundingCta slug={slug} name={name} price={price} />
            <Button href="#inside" variant="outline" size="lg">
              See what&rsquo;s inside
            </Button>
          </div>
          <p className="mt-5 text-xs text-ink-4">
            Instant digital delivery · {REFUND_WINDOW_LABEL} · Updates included
          </p>
        </Rise>

        {/* The product itself */}
        <Rise delay={0.5} y={40} className="mx-auto mt-14 max-w-5xl sm:mt-16">
          <JourneyPreview />
          <p className="mt-4 text-xs text-ink-4">
            The journey view — six phases in order, with the Positioning
            module open as a guided workflow.
          </p>
        </Rise>
      </div>
    </section>
  );
}
