"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { Product } from "@/lib/products";
import { formatLabel } from "@/lib/products";
import { getCategory } from "@/lib/products";
import { formatPrice } from "@/lib/site";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { LayersIcon, PlusIcon } from "@/components/ui/icons";

/**
 * ProductCard — editorial list-row card, not a rounded tile.
 * Horizontal on desktop (preview | info | price/CTA), stacks on mobile.
 * Hairline border; hover: border darkens + preview sheet tilts subtly.
 * The card is a Link wrapping title; buttons inside stop propagation.
 */

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const reduced = useReducedMotion();
  const category = getCategory(product.category);

  return (
    <motion.article
      whileHover={reduced ? undefined : { y: -3 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-md border border-line bg-surface transition-colors duration-300 hover:border-line-strong sm:flex-row"
    >
      {/* Preview sheet */}
      <div className="relative w-full shrink-0 border-b border-line bg-accent-soft/40 p-5 sm:w-52 sm:border-b-0 sm:border-r">
        <div className="flex items-center justify-between">
          <span className="spec text-accent-ink">{category?.name}</span>
          <LayersIcon className="h-4 w-4 text-accent/60" />
        </div>
        <div className="mt-4 space-y-1.5">
          {[0.9, 0.75, 0.6, 0.45].map((w, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full bg-accent/15"
              style={{ width: `${w * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-4 text-[0.6875rem] font-medium text-accent-ink/80">
          {product.modules.length} modules
        </p>
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
          <span className="spec">{formatLabel(product.formats)}</span>
          <span className="text-line-strong" aria-hidden="true">·</span>
          <span>Instant download</span>
        </p>

        {/* Price + CTA row */}
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
          <span className="text-lg font-medium tnum text-ink">
            {formatPrice(product.price)}
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
        </div>
      </div>
    </motion.article>
  );
}
