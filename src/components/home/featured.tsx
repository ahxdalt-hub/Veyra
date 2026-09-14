"use client";

import Link from "next/link";
import { getFeaturedProduct } from "@/lib/products";
import { formatPrice } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { FeaturedPreview } from "@/components/product/featured-preview";
import { useCart } from "@/components/cart/cart-context";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Featured — Section C.
 * The flagship gets a full-bleed treatment: preview left, details right.
 * Who it's for, the outcome, price, CTA, and a view-details link.
 */

export function Featured() {
  const product = getFeaturedProduct();
  const { add } = useCart();

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
          {/* Preview */}
          <Reveal className="lg:sticky lg:top-28">
            <FeaturedPreview />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {product.specs.slice(0, 3).map((spec) => (
                <div
                  key={spec.label}
                  className="rounded-sm border border-line bg-paper px-3 py-2.5"
                >
                  <p className="spec text-ink-4">{spec.label}</p>
                  <p className="mt-1 truncate text-xs font-medium text-ink-2">
                    {spec.value}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Details */}
          <div>
            <Reveal delay={0.1}>
              <p className="text-lead">{product.description}</p>
            </Reveal>

            <Reveal delay={0.15}>
              <dl className="mt-8 divide-y divide-line border-y border-line">
                <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-4">
                  <dt className="spec pt-0.5 text-ink-4">Built for</dt>
                  <dd className="text-sm text-ink-2">{product.audience}</dd>
                </div>
                <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-4">
                  <dt className="spec pt-0.5 text-ink-4">Outcome</dt>
                  <dd className="text-sm text-ink-2">{product.outcome}</dd>
                </div>
                <div className="grid grid-cols-[7.5rem_1fr] gap-4 py-4">
                  <dt className="spec pt-0.5 text-ink-4">Delivery</dt>
                  <dd className="text-sm text-ink-2">
                    {product.specs[0]?.value ?? "Instant digital delivery"}
                  </dd>
                </div>
              </dl>
            </Reveal>

            <Reveal delay={0.2}>
              <ul className="mt-8 space-y-3">
                {product.modules.map((m) => (
                  <li key={m.name} className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-sm text-ink-2">
                      <span className="font-medium text-ink">{m.name}</span>
                      {" — "}
                      {m.purpose}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Price + CTA */}
            <Reveal delay={0.25}>
              <div className="mt-10 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-3xl font-medium tnum text-ink">
                    {formatPrice(product.price)}
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
                    One-time payment · Instant digital delivery · Updates
                    included
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="accent"
                    size="lg"
                    onClick={() => add(product.slug)}
                  >
                    Add to cart
                  </Button>
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
