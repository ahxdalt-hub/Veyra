"use client";

import { Rise } from "@/components/motion/rise";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { JourneyPreview } from "@/components/product/journey-preview";
import { PurchaseCta } from "@/components/cgs/purchase-cta";
import { formatPrice } from "@/lib/site";

/**
 * CgsHero — the product page's opening statement.
 *
 * Two-column editorial layout: the promise and the purchase moment on the
 * left, the product presentation on the right. The founding-price strip is
 * a compact commercial anchor — the numbers arrive as props, resolved from
 * the pricing module by the server page; when the real founding allocation
 * (founding.ts) is closed, the regular price shows instead.
 *
 * The showcase is JourneyPreview: a code-rendered presentation of the
 * actual application structure (the six-phase journey board), clearly
 * captioned as illustrative — never a fabricated dashboard or invented
 * customer data. Entrance animation runs once on load via Rise and is
 * fully static under prefers-reduced-motion.
 */

const supportPoints = [
  "One-time purchase",
  "Windows desktop application",
  "Local-first business workspace",
  "Designed for freelancers, consultants, and small service businesses",
];

export function CgsHero({
  slug,
  name,
  price,
  regularPrice,
  foundingActive,
  foundingLimit,
}: {
  slug: string;
  name: string;
  /** Price a customer actually pays today, per the server's source of truth. */
  price: number;
  /** The regular reference price, struck through while founding is active. */
  regularPrice: number;
  foundingActive: boolean;
  foundingLimit: number;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-paper">
      {/* Faint drafting grid — texture, not decoration */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-blueprint-faint [mask-image:radial-gradient(ellipse_at_top_left,black_25%,transparent_70%)]"
      />

      {/* Full-bleed two-column composition. On xl+ the preview column
          hugs the viewport's right edge (negative right margin equal to
          the container padding) so it anchors consistently across desktop
          resolutions instead of floating inside the centered grid; the
          text column keeps a stable reading measure. Top-aligned so both
          columns share a clean reading baseline. */}
      <div className="container-page relative grid max-w-none gap-14 py-16 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:items-start lg:gap-16 lg:py-28">
        {/* ---------------------------------------------------------- */}
        {/* Left — the promise and the purchase moment                   */}
        {/* ---------------------------------------------------------- */}
        <div className="min-w-0">
          <Rise as="p" delay={0.05} className="text-eyebrow mb-5">
            Veyra · {name}
          </Rise>

          <Rise as="h1" delay={0.14} className="text-display-hero max-w-[18ch]">
            Build a business that grows{" "}
            <span className="em-serif">beyond you.</span>
          </Rise>

          <Rise delay={0.26} className="mt-6">
            <p className="max-w-lg text-lead">
              From finding the right clients to closing deals, delivering
              great work, and building lasting relationships. {name} brings
              your entire client-growth workflow into one practical desktop
              application.
            </p>
          </Rise>

          <Rise delay={0.36} className="mt-8">
            <ul className="grid max-w-lg gap-2.5 sm:grid-cols-2">
              {supportPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="text-sm leading-snug text-ink-2">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </Rise>

          {/* Compact founding-price treatment — the commercial anchor */}
          <Rise delay={0.46} className="mt-10">
            <div className="inline-flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-accent/25 bg-accent-soft/70 px-5 py-4">
              <p className="flex items-baseline gap-2.5">
                <span className="align-middle font-display text-4xl italic leading-none text-ink tnum">
                  {formatPrice(price)}
                </span>
                {foundingActive ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="relative inline-block text-lg font-medium text-ink-4 tnum"
                    >
                      {formatPrice(regularPrice)}
                      <span className="absolute left-[-4%] right-[-4%] top-1/2 h-px -rotate-3 bg-ink-4/70" />
                    </span>
                    <span className="sr-only">
                      Regular price {formatPrice(regularPrice)}.
                    </span>
                  </>
                ) : null}
              </p>
              <p className="spec text-accent-ink">
                {foundingActive ? "Founding price" : "Regular price"}
              </p>
            </div>
            <p className="mt-3 text-sm text-ink-2">
              One-time purchase. No recurring subscription.
              {foundingActive ? (
                <span className="text-ink-3">
                  {" "}
                  Founding release limited to the first{" "}
                  <span className="font-medium tnum text-ink">
                    {foundingLimit}
                  </span>{" "}
                  customers.
                </span>
              ) : (
                <span className="text-ink-3">
                  {" "}
                  The founding release for the first {foundingLimit} customers
                  is closed.
                </span>
              )}
            </p>
          </Rise>

          <Rise delay={0.56} className="mt-8">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <PurchaseCta slug={slug} name={name} />
              <Button href="#workflow" variant="outline" size="lg">
                Explore the system
              </Button>
            </div>
          </Rise>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Right — the product presentation. The full-bleed grid puts
            this column's right edge at the container edge (lg) or 2.5rem
            from the viewport edge (xl+), so the window anchors to the
            page instead of floating; vertically centered against the
            text column for a composed desktop view. */}
        <Rise delay={0.4} y={28} className="min-w-0 self-center">
          <JourneyPreview />
          <p className="mt-4 text-xs text-ink-4">
            Illustrative presentation of the application&rsquo;s journey
            view — six connected stages with a guided module open.
          </p>
        </Rise>
      </div>
    </section>
  );
}
