"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/products";
import { phaseMeta } from "@/lib/products";
import { formatPrice } from "@/lib/site";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";

/**
 * ProductCard — editorial list-row card, not a rounded tile.
 * Horizontal on desktop (preview | info | price/CTA), stacks on mobile.
 * Available products get the add-to-cart action; coming-soon products are
 * visibly not purchasable — label only, no button, no price.
 */
export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const reduced = useReducedMotion();

  const phases = [...new Set(product.modules.map((m) => m.phase))];
  const available = product.status === "available" && product.price !== null;

  return (
    <motion.article
      whileHover={reduced ? undefined : { y: -3 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative flex flex-col overflow-hidden rounded-md border bg-surface transition-colors duration-300 sm:flex-row ${
        available
          ? "border-line hover:border-line-strong"
          : "border-dashed border-line-strong"
      }`}
    >
      {/* Preview sheet */}
      <div className="relative w-full shrink-0 border-b border-line bg-accent-soft/40 p-5 sm:w-52 sm:border-b-0 sm:border-r">
        <div className="flex items-center justify-between">
          <span className="spec text-accent-ink">
            {available ? phaseMeta[phases[0] ?? "build"].label : "Coming soon"}
          </span>
          {available ? null : (
            <span
              className="spec rounded-full border border-line-strong bg-paper px-2 py-0.5 text-ink-3"
              aria-label="Not yet available"
            >
              In development
            </span>
          )}
        </div>
        <div className="mt-4 space-y-1.5" aria-hidden="true">
          {[0.9, 0.75, 0.6, 0.45].map((w, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full ${
                available ? "bg-accent/15" : "bg-ink/10"
              }`}
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
        {available ? (
          <p className="mt-4 text-[0.6875rem] font-medium text-accent-ink/80">
            {product.modules.length} modules · {phases.length} phases
          </p>
        ) : null}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-display-2 text-[1.375rem]">
          <Link
            href={`/products/${product.slug}`}
            className="transition-colors after:absolute after:inset-0 after:content-[''] hover:text-accent"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-2.5 max-w-md text-sm leading-relaxed text-ink-3">
          {product.cardDescription}
        </p>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-4">
          <span className="spec">
            {available ? "One-time purchase" : "In development"}
          </span>
          {available ? (
            <>
              <span className="text-line-strong" aria-hidden="true">·</span>
              <span>Instant digital delivery</span>
            </>
          ) : null}
        </p>

        {/* Price + CTA row */}
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
          {available ? (
            <>
              <span className="text-lg font-medium tnum text-ink">
                {formatPrice(product.price!)}
                <span className="ml-1.5 text-xs font-normal text-ink-4">
                  one-time
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => add(product.slug)}
                className="relative z-10"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add to cart
              </Button>
            </>
          ) : (
            <>
              <span className="spec pt-1 text-ink-4">Coming soon</span>
              <span className="text-xs text-ink-3">Not yet available</span>
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}
