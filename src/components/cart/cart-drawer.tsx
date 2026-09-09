"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "./cart-context";
import { formatPrice } from "@/lib/site";
import { CloseIcon, TrashIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

/**
 * CartDrawer — slide-in cart panel (Phase 1: no checkout).
 * Checkout is explicitly labeled as arriving with the commerce layer —
 * no misleading purchase affordances until payments exist.
 */

export function CartDrawer() {
  const { isOpen, closeCart, detailedLines, total, remove } = useCart();
  const reduced = useReducedMotion();

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Escape closes.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeCart();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-90">
          <motion.button
            type="button"
            aria-label="Close cart"
            className="absolute inset-0 bg-ink/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            onClick={closeCart}
          />

          <motion.aside
            role="dialog"
            aria-label="Shopping cart"
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-lg"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              duration: reduced ? 0 : 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-display-2">Your cart</h2>
              <button
                type="button"
                onClick={closeCart}
                className="rounded-sm p-1.5 text-ink-3 transition-colors hover:bg-accent-soft hover:text-ink"
                aria-label="Close cart"
              >
                <CloseIcon />
              </button>
            </div>

            {detailedLines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="max-w-xs text-sm text-ink-3">
                  Your cart is empty. Every system is a one-time purchase with
                  instant download.
                </p>
                <Button href="/shop" variant="outline" size="sm">
                  Browse systems
                </Button>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {detailedLines.map(({ product }) => (
                    <li key={product.slug} className="flex gap-4 py-5">
                      <MiniThumb product={product} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={closeCart}
                          className="text-sm font-medium text-ink hover:text-accent"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-3">
                          {product.shortDescription}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="spec text-ink-4">
                            Instant download
                          </span>
                          <span className="text-sm font-medium tnum">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(product.slug)}
                        aria-label={`Remove ${product.name} from cart`}
                        className="self-start rounded-sm p-1.5 text-ink-4 transition-colors hover:bg-clay-soft hover:text-clay"
                      >
                        <TrashIcon />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-line px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-2">Total</span>
                    <span className="text-base font-medium tnum">
                      {formatPrice(total)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-3">
                    Secure checkout arrives with our commerce launch. Your cart
                    is saved on this device.
                  </p>
                  <Button
                    variant="accent"
                    size="lg"
                    className="mt-4 w-full"
                    disabled
                  >
                    Checkout — coming with launch
                  </Button>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Small format-tinted thumb — reused by cart rows. */
function MiniThumb({
  product,
}: {
  product: {
    name: string;
    formats: string[];
  };
}) {
  const label = product.formats.includes("notion")
    ? "Notion"
    : product.formats.includes("sheets")
      ? "Sheets"
      : "PDF";
  const tone = product.formats.includes("notion")
    ? "border-accent/25 bg-accent-soft text-accent-ink"
    : "border-amber/25 bg-amber-soft text-amber";
  return (
    <span
      aria-hidden="true"
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border text-[0.625rem] font-medium uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}
