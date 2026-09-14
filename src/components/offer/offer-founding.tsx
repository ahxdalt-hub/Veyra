import { Reveal } from "@/components/motion/reveal";
import { PriceAnchor } from "@/components/offer/price-anchor";
import { FoundingCta } from "@/components/offer/founding-cta";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { getFeaturedProduct } from "@/lib/products";
import { REFUND_WINDOW_LABEL } from "@/lib/site";

/**
 * OfferFounding — the close.
 *
 * A premium offer panel: the founding-price framing, the anchor, and the
 * single primary action. No countdown, no scarcity, no theatre — the
 * urgency is the genuine founding-customer concept. Numbers resolve from
 * the pricing module.
 */
export function OfferFounding() {
  const product = getFeaturedProduct();
  const founding = {
    price: FOUNDING_PRICE,
    regularPrice: REGULAR_PRICE,
    save: REGULAR_PRICE - FOUNDING_PRICE,
  };

  return (
    <section id="get" className="scroll-mt-24 bg-paper">
      <div className="container-page py-20 sm:py-24 lg:py-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-lg border border-accent/25 bg-accent-soft/60 px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
            {/* Hairline drafting corners — the house detail for offers */}
            <span aria-hidden="true" className="absolute left-5 top-5 h-3 w-3 border-l border-t border-accent/40" />
            <span aria-hidden="true" className="absolute right-5 top-5 h-3 w-3 border-r border-t border-accent/40" />
            <span aria-hidden="true" className="absolute bottom-5 left-5 h-3 w-3 border-b border-l border-accent/40" />
            <span aria-hidden="true" className="absolute bottom-5 right-5 h-3 w-3 border-b border-r border-accent/40" />

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
              {/* Framing */}
              <div className="min-w-0">
                <p className="text-eyebrow">Founding customer offer</p>
                <h2 className="mt-4 text-display-1">
                  Get in at the{" "}
                  <span className="em-serif">founding price.</span>
                </h2>
                <p className="mt-5 max-w-md text-lead">
                  The Client Growth System is launching at{" "}
                  <span className="font-medium tnum text-ink">
                    ${founding.price}
                  </span>{" "}
                  for founding customers. The intended regular price is{" "}
                  <span className="font-medium tnum text-ink">
                    ${founding.regularPrice}
                  </span>
                  .
                </p>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-2">
                  Early customers get the founding price before the product
                  moves toward its regular price — and keep everything that
                  comes with it: every future revision, a per-seat licence
                  for individuals and small teams, and the{" "}
                  {REFUND_WINDOW_LABEL}.
                </p>
              </div>

              {/* The offer card */}
              <div className="min-w-0 rounded-lg border border-line bg-surface p-7 shadow-sm sm:p-9">
                <PriceAnchor
                  regularPrice={founding.regularPrice}
                  price={founding.price}
                  save={founding.save}
                />
                <div className="mt-8 border-t border-line pt-7">
                  <FoundingCta
                    slug={product.slug}
                    name={product.name}
                    price={founding.price}
                    className="w-full"
                  />
                  <p className="mt-4 text-center text-xs text-ink-3">
                    One-time purchase · No subscription · Instant digital
                    delivery
                  </p>
                  <p className="mt-1.5 text-center text-xs text-ink-4">
                    Per-seat licence — up to 5 seats per purchase ·{" "}
                    {REFUND_WINDOW_LABEL}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
