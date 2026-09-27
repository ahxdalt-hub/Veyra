"use client";

import Link from "next/link";
import {
  getFeaturedProduct,
  phaseMeta,
  PHASE_ORDER,
} from "@/lib/products";
import { formatPrice } from "@/lib/site";
import { FOUNDING_PRICE } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { FeaturedPreview } from "@/components/product/featured-preview";
import { AddToCartButton } from "@/components/product/add-to-cart-button";

/**
 * Featured — Section C.
 * The flagship gets a full-bleed treatment: preview left, details right.
 * The right column runs lead → phase ledger → facts → price/CTA: the
 * twelve modules appear here only as their six-phase shape (names inline),
 * since Section D below shows each module in full. Specs live in one
 * hairline strip under the preview — never repeated elsewhere.
 * During launch pricing the founding price leads with the regular price
 * struck through, matching the offer page and checkout.
 */

/* The description's closing sentence is the section's button line — set it
   in the display serif so the lead ends on a full stop with weight. */
const LEAD_CLOSE = "Buy it once and run your growth on it.";

function LeadParagraph({ description }: { description: string }) {
  const i = description.indexOf(LEAD_CLOSE);
  if (i === -1) return <p className="text-lead">{description}</p>;
  return (
    <p className="text-lead">
      {description.slice(0, i)}
      <span className="em-serif text-ink">{LEAD_CLOSE}</span>
    </p>
  );
}

export function Featured() {
  const product = getFeaturedProduct();

  const byPhase = PHASE_ORDER.map((phase) => ({
    phase,
    modules: product.modules.filter((m) => m.phase === phase),
  })).filter((g) => g.modules.length > 0);

  return (
    <section id="featured" className="scroll-mt-24 border-b border-line bg-surface">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-eyebrow mb-4">Available now</p>
              <h2 className="text-display-1 max-w-xl">{product.name}</h2>
            </div>
            <Link
              href={`/products/${product.slug}`}
              className="group inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-deep"
            >
              View full details
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 8h11.5M9 3.5 13.5 8 9 12.5" />
              </svg>
            </Link>
          </div>
        </Reveal>

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Preview + delivery strip */}
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <FeaturedPreview />
            </Reveal>
            <Reveal delay={0.1}>
              <ul className="mt-4 grid grid-cols-1 divide-y divide-line rounded-sm border border-line bg-paper sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {product.specs.slice(0, 3).map((spec) => (
                  <li key={spec.label} className="px-4 py-3">
                    <p className="spec text-ink-4">{spec.label}</p>
                    <p className="mt-1 text-xs leading-snug text-ink-2">
                      {spec.value}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Details */}
          <div>
            <Reveal delay={0.1}>
              <LeadParagraph description={product.description} />
            </Reveal>

            {/* The system at a glance: six phases, twelve modules — names
                inline. The module grid in What's Inside carries the detail. */}
            <Reveal delay={0.15}>
              <div className="mt-10">
                <div className="mb-3 flex items-baseline justify-between gap-4">
                  <p className="text-eyebrow">The system</p>
                  <p className="spec text-ink-4">
                    {product.modules.length} modules · {byPhase.length} phases
                  </p>
                </div>
                <div className="divide-y divide-line rounded-sm border border-line bg-paper">
                  <p className="px-4 py-3 text-xs leading-relaxed text-ink-3">
                    Twelve modules across six connected phases — each one
                    built to be run, not just read.
                  </p>
                  {byPhase.map(({ phase, modules }, i) => (
                    <div
                      key={phase}
                      className="grid grid-cols-[2.25rem_1fr] items-baseline gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[3rem_8.5rem_1fr]"
                    >
                      <span className="spec tnum text-accent">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-medium text-ink">
                        {phaseMeta[phase].label}
                      </span>
                      <span className="col-span-2 text-xs leading-relaxed text-ink-3 sm:col-span-1">
                        {modules.map((m) => m.name).join(" · ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <dl className="mt-10 divide-y divide-line border-y border-line">
                <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-4">
                  <dt className="spec pt-0.5 text-ink-4">Built for</dt>
                  <dd className="text-sm text-ink-2">{product.audience}</dd>
                </div>
                <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-4">
                  <dt className="spec pt-0.5 text-ink-4">Outcome</dt>
                  <dd className="text-sm text-ink-2">{product.outcome}</dd>
                </div>
              </dl>
            </Reveal>

            {/* Price + CTA */}
            <Reveal delay={0.25}>
              <div className="mt-10 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {product.price !== null && product.price > FOUNDING_PRICE ? (
                    <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <span className="text-3xl font-medium tnum text-ink">
                        {formatPrice(FOUNDING_PRICE)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-lg tnum text-ink-4 line-through"
                      >
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-sm font-medium text-accent-ink">
                        founding price
                      </span>
                      <span className="sr-only">
                        Founding customer price {formatPrice(FOUNDING_PRICE)},
                        regular price {formatPrice(product.price)}.
                      </span>
                    </p>
                  ) : (
                    <p className="text-3xl font-medium tnum text-ink">
                      {formatPrice(product.price)}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-ink-3">
                    {product.tagline}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <AddToCartButton
                    slug={product.slug}
                    name={product.name}
                    className="w-full sm:w-auto"
                  />
                  <Button
                    href={`/products/${product.slug}`}
                    variant="outline"
                    size="lg"
                  >
                    View details
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
