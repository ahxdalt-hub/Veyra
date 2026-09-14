"use client";

import { formatPrice } from "@/lib/site";
import { CheckIcon } from "@/components/ui/icons";
import { Rise } from "@/components/offer/rise";

/**
 * PriceAnchor — the founding-price presentation.
 *
 * Establishes $149 as the intended regular price first, then brings $79
 * forward as the focal point, then the saving. One quiet sequence, run
 * once on entering the viewport — no flashing, no countdown theatre.
 * Under prefers-reduced-motion everything renders statically (Rise
 * handles the hydration-safe swap).
 */

type Props = {
  regularPrice: number;
  price: number;
  save: number;
  variant?: "row" | "panel";
  className?: string;
};

export function PriceAnchor({
  regularPrice,
  price,
  save,
  variant = "panel",
  className = "",
}: Props) {
  /* ---------------------------------------------------------------- */
  /* Row variant — hero-sized inline composition                       */
  /* ---------------------------------------------------------------- */
  if (variant === "row") {
    return (
      <div className={`flex flex-wrap items-end gap-x-5 gap-y-3 ${className}`}>
        <Rise as="p" delay={0.45} aria-hidden="true">
          <span className="relative inline-block text-2xl font-medium tnum text-ink-4">
            {formatPrice(regularPrice)}
            <span
              aria-hidden="true"
              className="absolute left-[-4%] right-[-4%] top-1/2 h-px -rotate-3 bg-ink-4/70"
            />
          </span>
          <span className="sr-only">
            Regular price {formatPrice(regularPrice)}.
          </span>
        </Rise>

        <Rise as="p" delay={0.57}>
          <span className="align-middle font-display text-4xl italic leading-none text-ink sm:text-5xl">
            {formatPrice(price)}
          </span>
          <span className="sr-only">
            Founding customer price {formatPrice(price)}, one-time purchase.
          </span>
        </Rise>

        <Rise delay={0.73}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
            <CheckIcon className="h-3 w-3" />
            You save {formatPrice(save)}
          </span>
        </Rise>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Panel variant — the full anchor ledger                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className={className}>
      {/* Regular price — established first */}
      <Rise delay={0.05}>
        <p className="spec text-ink-4">Regular price</p>
        <p className="mt-2 flex items-baseline gap-3">
          <span className="relative inline-block text-2xl font-medium tnum text-ink-4 sm:text-3xl">
            {formatPrice(regularPrice)}
            <span
              aria-hidden="true"
              className="absolute left-[-4%] right-[-4%] top-1/2 h-px -rotate-3 bg-ink-4/70"
            />
          </span>
          <span className="sr-only">
            Regular price {formatPrice(regularPrice)}.
          </span>
          <span className="text-xs text-ink-4">
            The intended long-term price
          </span>
        </p>
      </Rise>

      {/* Founding price — the focal point */}
      <Rise delay={0.23} className="mt-6 border-t border-line pt-6">
        <p className="spec text-accent">Founding customer price</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-display text-6xl leading-none tracking-[-0.02em] text-ink sm:text-7xl">
            {formatPrice(price)}
          </span>
          <span className="text-sm font-medium text-ink-2">
            one-time purchase
          </span>
          <span className="sr-only">
            Founding customer price {formatPrice(price)}, one-time purchase.
          </span>
        </p>
      </Rise>

      {/* The saving, quietly */}
      <Rise
        delay={0.43}
        className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-medium text-accent-ink">
          <CheckIcon className="h-3 w-3" />
          You save {formatPrice(save)}
        </span>
        <span className="text-xs text-ink-3">
          No subscription · No recurring fee · Updates included
        </span>
      </Rise>
    </div>
  );
}
