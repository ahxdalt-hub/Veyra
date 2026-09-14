"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "./cart-context";
import { formatPrice } from "@/lib/site";
import { CloseIcon, TrashIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

/**
 * CartDrawer — slide-in cart panel, part of the Veyra storefront.
 * Lines resolve through the catalog's purchasable gate; the checkout
 * CTA leads to /checkout where the server re-validates everything.
 */

export function CartDrawer() {
  const { isOpen, closeCart, detailedLines, total, remove, setQty } = useCart();
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
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper font-display text-lg italic text-ink-3"
                >
                  V
                </span>
                <p className="max-w-xs text-sm text-ink-3">
                  Your cart is empty. The Client Growth System is available
                  today — one-time payment, instant digital delivery.
                </p>
                <Button href="/products/client-growth-system" variant="outline" size="sm">
                  View Client Growth System
                </Button>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {detailedLines.map(({ product, qty }) => (
                    <li key={product.slug} className="flex gap-4 py-5">
                      <MiniThumb name={product.name} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <Link
                          href={`/products/${product.slug}`}
                          onClick={closeCart}
                          className="text-sm font-medium text-ink hover:text-accent"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-3">
                          {product.tagline}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <QtyStepper
                            qty={qty}
                            onChange={(next) => setQty(product.slug, next)}
                            name={product.name}
                          />
                          <span className="text-sm font-medium tnum">
                            {formatPrice(product.price * qty)}
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
                  <dl className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <dt className="text-sm text-ink-2">Subtotal</dt>
                      <dd className="text-sm tnum">{formatPrice(total)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-sm font-medium text-ink">Total</dt>
                      <dd className="text-base font-medium tnum">
                        {formatPrice(total)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-1.5 text-xs text-ink-3">
                    One-time payment in INR via secure checkout. Your cart is
                    saved on this device.
                  </p>
                  <Button
                    href="/checkout"
                    variant="accent"
                    size="lg"
                    className="mt-4 w-full"
                    onClick={closeCart}
                  >
                    Proceed to checkout
                  </Button>
                  <p className="mt-3 text-center text-xs text-ink-4">
                    14-day refund window
                  </p>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Champagne-soft monogram thumb — reused by cart rows. */
function MiniThumb({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-accent/25 bg-accent-soft font-display text-lg italic text-accent-ink"
    >
      {name.charAt(0)}
    </span>
  );
}

/** Compact quantity stepper (licences are per-business; cap is generous). */
function QtyStepper({
  qty,
  onChange,
  name,
}: {
  qty: number;
  onChange: (qty: number) => void;
  name: string;
}) {
  return (
    <span className="inline-flex items-center rounded-sm border border-line bg-paper">
      <button
        type="button"
        onClick={() => onChange(qty - 1)}
        disabled={qty <= 1}
        aria-label={`Decrease quantity of ${name}`}
        className="flex h-6 w-6 items-center justify-center rounded-l-sm text-ink-3 transition-colors hover:bg-accent-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40"
      >
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M2 6h8" />
        </svg>
      </button>
      <span className="w-7 text-center text-xs font-medium tnum" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= 5}
        aria-label={`Increase quantity of ${name}`}
        className="flex h-6 w-6 items-center justify-center rounded-r-sm text-ink-3 transition-colors hover:bg-accent-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40"
      >
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M6 2v8M2 6h8" />
        </svg>
      </button>
    </span>
  );
}
