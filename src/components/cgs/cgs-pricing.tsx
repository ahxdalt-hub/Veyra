"use client";

import { useState } from "react";
import { Reveal } from "@/components/motion/reveal";
import { CheckIcon } from "@/components/ui/icons";
import { PurchaseCta } from "@/components/cgs/purchase-cta";
import {
  MAX_SEATS,
  formatDiscountPercent,
  seatTier,
} from "@/lib/pricing";
import { formatPrice, REFUND_WINDOW_LABEL } from "@/lib/site";

/**
 * CgsPricing — the pricing section.
 *
 * The seat tiers render straight from the pricing module (the same one
 * checkout charges through), and selecting seats shows the per-seat price
 * and the payable total before anything enters the cart. The CTA adds the
 * product to the existing cart; seat quantity is adjusted there through
 * the same cart context — this section never computes money locally for
 * any purpose other than displaying what the server's tiers already say.
 *
 * When the founding release is genuinely closed (founding.ts, real paid
 * order count), the regular price is displayed and the founding framing
 * is dropped — the availability copy follows the same source of truth.
 */

export function CgsPricing({
  slug,
  name,
  price,
  regularPrice,
  foundingActive,
  foundingLimit,
}: {
  slug: string;
  name: string;
  price: number;
  regularPrice: number;
  foundingActive: boolean;
  foundingLimit: number;
}) {
  const [seats, setSeats] = useState(1);
  const tier = seatTier(seats);

  return (
    <section
      id="get"
      className="scroll-mt-24 border-b border-line bg-paper"
      aria-labelledby="pricing-heading"
    >
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <div className="max-w-3xl">
            <p className="text-eyebrow mb-4">Pricing</p>
            <h2 id="pricing-heading" className="text-display-1">
              Own your client-growth system.
            </h2>
            <p className="mt-5 max-w-2xl text-lead">
              One-time purchase. No recurring subscription.{" "}
              {foundingActive ? (
                <>
                  The founding release is limited to the first{" "}
                  <span className="font-medium tnum text-ink">
                    {foundingLimit}
                  </span>{" "}
                  customers — the regular price is {formatPrice(regularPrice)}.
                </>
              ) : (
                <>
                  The founding release for the first {foundingLimit}{" "}
                  customers is closed. The current price is{" "}
                  {formatPrice(price)}.
                </>
              )}
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
          {/* The offer card */}
          <Reveal delay={0.06}>
            <div className="relative overflow-hidden rounded-lg border border-accent/25 bg-surface p-7 shadow-sm sm:p-9">
              {/* Hairline drafting corners — the house detail */}
              <span aria-hidden="true" className="absolute left-4 top-4 h-3 w-3 border-l border-t border-accent/40" />
              <span aria-hidden="true" className="absolute right-4 top-4 h-3 w-3 border-r border-t border-accent/40" />

              <p className="text-eyebrow">{name}</p>
              <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="font-display text-6xl leading-none tracking-[-0.02em] text-ink tnum">
                  {formatPrice(price)}
                </p>
                <p className="pb-1.5 text-sm font-medium text-ink-2">
                  one-time
                </p>
                {foundingActive ? (
                  <p className="pb-1.5 flex items-baseline gap-2 text-sm">
                    <span className="relative text-ink-4 tnum">
                      {formatPrice(regularPrice)}
                      <span
                        aria-hidden="true"
                        className="absolute left-[-4%] right-[-4%] top-1/2 h-px -rotate-3 bg-ink-4/70"
                      />
                    </span>
                    <span className="spec text-accent">founding price</span>
                  </p>
                ) : null}
              </div>
              <p className="mt-4 text-sm text-ink-2">
                {foundingActive ? (
                  <>
                    Founding price for the first {foundingLimit} customers.
                    Includes every future revision and the{" "}
                    {REFUND_WINDOW_LABEL}.
                  </>
                ) : (
                  <>
                    Includes every future revision and the{" "}
                    {REFUND_WINDOW_LABEL}.
                  </>
                )}
              </p>

              {/* Seat selector — individuals and small teams */}
              <div className="mt-8 border-t border-line pt-7">
                <p className="spec text-ink-4">
                  Licensed seats — up to {MAX_SEATS} per purchase
                </p>
                <div
                  className="mt-3.5 flex items-center gap-2"
                  role="group"
                  aria-label="Choose number of seats"
                >
                  {Array.from({ length: MAX_SEATS }, (_, i) => i + 1).map(
                    (n) => {
                      const active = n === seats;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSeats(n)}
                          aria-pressed={active}
                          className={`h-10 w-10 rounded-sm border text-sm font-medium tnum transition-colors duration-200 ${
                            active
                              ? "border-accent bg-accent text-white shadow-xs"
                              : "border-line bg-paper text-ink-2 hover:border-ink/25 hover:text-ink"
                          }`}
                        >
                          {n}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Live reading of the selected tier — per-seat and total */}
                <p
                  className="mt-4 text-sm text-ink-2 tnum"
                  aria-live="polite"
                >
                  <span className="font-medium text-ink">
                    {formatPrice(tier.perSeat)}
                  </span>{" "}
                  per seat × {tier.seats} {tier.seats === 1 ? "seat" : "seats"}{" "}
                  ={" "}
                  <span className="font-medium text-ink">
                    {formatPrice(tier.total)}
                  </span>{" "}
                  total
                  {tier.discountPercent > 0 ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink">
                      <CheckIcon className="h-3 w-3" />
                      {formatDiscountPercent(tier.discountPercent)} team
                      discount
                    </span>
                  ) : null}
                </p>
                <p className="mt-2 text-xs text-ink-3">
                  Designed for individuals and small teams. Each purchase
                  supports up to {MAX_SEATS} licensed users.
                </p>
              </div>

              <div className="mt-8 border-t border-line pt-7">
                <PurchaseCta
                  slug={slug}
                  name={name}
                  className="w-full"
                />
                <p className="mt-3 text-center text-xs text-ink-3">
                  Secure checkout · Instant digital delivery
                </p>
                <p className="mt-1.5 text-center text-xs text-ink-4">
                  Seat quantity can be adjusted in the cart before checkout.
                </p>
              </div>
            </div>
          </Reveal>

          {/* The published tier ladder — straight from the pricing module */}
          <Reveal delay={0.12}>
            <div className="lg:pt-4">
              <h3 className="text-display-2">Team pricing, up front.</h3>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
                The per-seat price steps down as seats are added —{" "}
                {foundingActive ? "at the founding price" : "at today's price"}
                , resolved by the same pricing configuration the checkout
                charges through. No rules invented here.
              </p>
              <dl className="mt-8 divide-y divide-line border-y border-line">
                {Array.from({ length: MAX_SEATS }, (_, i) => i + 1).map(
                  (n) => {
                    const t = seatTier(n);
                    return (
                      <div
                        key={n}
                        className="flex items-baseline justify-between gap-4 py-4"
                      >
                        <dt className="text-sm font-medium text-ink">
                          {n} {n === 1 ? "seat" : "seats"}
                        </dt>
                        <dd className="text-right text-sm tnum">
                          <span className="text-ink-2">
                            {formatPrice(t.perSeat)}
                          </span>
                          <span className="text-ink-4"> / seat · </span>
                          <span className="font-medium text-ink">
                            {formatPrice(t.total)}
                          </span>
                          {t.discountPercent > 0 ? (
                            <span className="ml-2 text-xs text-accent-ink">
                              {formatDiscountPercent(t.discountPercent)} off
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    );
                  }
                )}
              </dl>
              <ul className="mt-8 space-y-2.5">
                {[
                  "One-time purchase. No recurring subscription.",
                  "Every future revision included.",
                  "Windows desktop application — installed on your machine.",
                  `${REFUND_WINDOW_LABEL} on every purchase.`,
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-sm text-ink-2">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
