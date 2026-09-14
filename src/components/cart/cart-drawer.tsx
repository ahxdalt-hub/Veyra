"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCart } from "./cart-context";
import { formatPrice, REFUND_WINDOW_LABEL } from "@/lib/site";
import {
  formatDiscountPercent,
  MAX_SEATS,
  type SeatTier,
} from "@/lib/pricing";
import { CloseIcon, TrashIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/motion/animated-number";

/**
 * CartDrawer — the seat-selection moment of the purchase.
 *
 * One product, licensed per seat: the stepper sets how many seats the
 * team needs (1–5), team pricing updates per seat, and every figure on
 * screen — per-seat price, discount, subtotal, total — animates to its
 * new value. All amounts resolve through the pricing module the server
 * uses at checkout, so the drawer can never disagree with the charge.
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
                  {detailedLines.map(({ product, qty, tier }) => (
                    <li key={product.slug} className="py-5">
                      <div className="flex gap-4">
                        <MiniThumb name={product.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link
                                href={`/products/${product.slug}`}
                                onClick={closeCart}
                                className="text-sm font-medium text-ink hover:text-accent"
                              >
                                {product.name}
                              </Link>
                              <p className="mt-0.5 text-xs text-ink-3">
                                Licensed software · one-time purchase
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(product.slug)}
                              aria-label={`Remove ${product.name} from cart`}
                              className="shrink-0 rounded-sm p-1.5 text-ink-4 transition-colors hover:bg-clay-soft hover:text-clay"
                            >
                              <TrashIcon />
                            </button>
                          </div>

                          {/* Per-seat founding pricing */}
                          <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="text-sm text-ink-4 line-through tnum">
                              {formatPrice(tier.regularPerSeat)}
                            </span>
                            <span className="text-sm font-medium text-ink">
                              <AnimatedNumber
                                value={tier.perSeat}
                                format={formatPrice}
                              />
                            </span>
                            <span className="text-xs text-ink-3">/ seat</span>
                            {tier.discountPercent > 0 && (
                              <motion.span
                                key={tier.discountPercent}
                                initial={reduced ? false : { opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className="rounded-xs border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-ink"
                              >
                                {formatDiscountPercent(tier.discountPercent)}{" "}
                                team discount
                              </motion.span>
                            )}
                          </div>

                          {/* Seats stepper + progression */}
                          <SeatStepper
                            name={product.name}
                            qty={qty}
                            tier={tier}
                            onChange={(next) => setQty(product.slug, next)}
                          />
                          <TierHint tier={tier} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-line px-5 py-4">
                  <dl className="space-y-1.5">
                    {detailedLines.map((l) => (
                      <div
                        key={`sub-${l.product.slug}`}
                        className="flex items-center justify-between"
                      >
                        <dt className="text-sm text-ink-2">
                          {l.tier.seats === 1
                            ? "1 seat"
                            : `${l.tier.seats} seats`}{" "}
                          × {formatPrice(l.tier.subtotal / l.tier.seats)}
                        </dt>
                        <dd className="text-sm tnum">
                          <AnimatedNumber
                            value={l.tier.subtotal}
                            format={formatPrice}
                          />
                        </dd>
                      </div>
                    ))}
                    {detailedLines.map((l) =>
                      l.tier.teamSavings > 0 ? (
                        <div
                          key={`disc-${l.product.slug}`}
                          className="flex items-center justify-between"
                        >
                          <dt className="text-sm text-ink-2">
                            Team discount (
                            {formatDiscountPercent(l.tier.discountPercent)})
                          </dt>
                          <dd className="text-sm text-accent-ink tnum">
                            −
                            <AnimatedNumber
                              value={l.tier.teamSavings}
                              format={formatPrice}
                            />
                          </dd>
                        </div>
                      ) : null
                    )}
                    <div className="flex items-center justify-between border-t border-line pt-2.5">
                      <dt className="text-sm font-medium text-ink">Total</dt>
                      <dd className="text-base font-medium">
                        <AnimatedNumber
                          value={total}
                          format={formatPrice}
                        />
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-1.5 text-xs text-ink-3">
                    One-time payment · licences for every seat included. Your
                    cart is saved on this device.
                  </p>
                  <Button
                    href="/checkout"
                    variant="accent"
                    size="lg"
                    className="mt-4 w-full"
                    onClick={closeCart}
                  >
                    Continue to checkout
                  </Button>
                  <p className="mt-3 text-center text-xs text-ink-4">
                    {REFUND_WINDOW_LABEL}
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

/**
 * Seat stepper with the "X / 5 seats" progression. The five segments
 * fill as seats are added — a quiet way to see the pricing progression
 * without a countdown or a nudge.
 */
function SeatStepper({
  qty,
  tier,
  onChange,
  name,
}: {
  qty: number;
  tier: SeatTier;
  onChange: (qty: number) => void;
  name: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="mt-3.5 flex items-center justify-between gap-3">
      <span className="inline-flex items-center rounded-sm border border-line bg-paper">
        <button
          type="button"
          onClick={() => onChange(qty - 1)}
          disabled={qty <= 1}
          aria-label={`Remove one seat from ${name}`}
          className="flex h-7 w-7 items-center justify-center rounded-l-sm text-ink-3 transition-colors hover:bg-accent-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M2 6h8" />
          </svg>
        </button>
        <span className="w-8 text-center text-xs font-medium tnum" aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          onClick={() => onChange(qty + 1)}
          disabled={qty >= MAX_SEATS}
          aria-label={`Add one seat to ${name}`}
          className="flex h-7 w-7 items-center justify-center rounded-r-sm text-ink-3 transition-colors hover:bg-accent-soft hover:text-ink disabled:pointer-events-none disabled:opacity-40"
        >
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 2v8M2 6h8" />
          </svg>
        </button>
      </span>

      <span className="flex items-center gap-2.5" aria-hidden="true">
        <span className="flex gap-1">
          {Array.from({ length: MAX_SEATS }, (_, i) => (
            <motion.span
              key={i}
              className={`h-1 w-4 rounded-full ${
                i < qty ? "bg-accent" : "bg-line-strong"
              }`}
              initial={false}
              animate={{ scale: i < qty ? 1 : 0.85 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
              }
            />
          ))}
        </span>
        <span className="text-xs text-ink-4 tnum">
          {qty} / {MAX_SEATS} seats
        </span>
      </span>

      <span className="sr-only">
        {qty} of {MAX_SEATS} seats · {formatPrice(tier.perSeat)} per seat
      </span>
    </div>
  );
}

/**
 * The quiet tier note — states where the pricing stands and, when one
 * exists, what the next seat costs. Information, not pressure.
 */
function TierHint({ tier }: { tier: SeatTier }) {
  const reduced = useReducedMotion();
  const hint =
    tier.seats >= MAX_SEATS
      ? `${MAX_SEATS} seats · ${formatDiscountPercent(tier.discountPercent)} team discount · best team price`
      : tier.discountPercent > 0
        ? `${tier.seats} seats · ${formatDiscountPercent(
            tier.discountPercent
          )} team discount — next seat at ${formatPrice(tier.nextPerSeat ?? 0)}`
        : `Add 1 more seat → ${formatPrice(tier.nextPerSeat ?? 0)} / seat team pricing`;

  return (
    <motion.p
      key={hint}
      initial={reduced ? false : { opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-2 text-xs leading-relaxed text-ink-4"
      aria-live="polite"
    >
      {hint}
    </motion.p>
  );
}
