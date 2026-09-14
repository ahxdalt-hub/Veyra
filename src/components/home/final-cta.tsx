import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { getFeaturedProduct } from "@/lib/products";
import { formatPrice } from "@/lib/site";

/**
 * FinalCta — Section J.
 * A calm close focused on the flagship. No countdown timers, no urgency.
 */
export function FinalCta() {
  const product = getFeaturedProduct();
  const price = product.price;

  return (
    <section className="bg-paper">
      <div className="container-page py-20 sm:py-28 lg:py-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-lg border border-line bg-accent-soft/50 px-6 py-14 text-center sm:px-12 lg:py-20">
            {/* Hairline drafting corners — quiet detail */}
            <span aria-hidden="true" className="absolute left-6 top-6 h-3 w-3 border-l border-t border-accent/40" />
            <span aria-hidden="true" className="absolute right-6 top-6 h-3 w-3 border-r border-t border-accent/40" />
            <span aria-hidden="true" className="absolute bottom-6 left-6 h-3 w-3 border-b border-l border-accent/40" />
            <span aria-hidden="true" className="absolute bottom-6 right-6 h-3 w-3 border-b border-r border-accent/40" />

            <p className="text-eyebrow">Client Growth System — available now</p>
            <h2 className="text-display-1 mx-auto mt-4 max-w-2xl">
              Build a better system for growing your business.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lead">
              One structured system for the whole journey — foundation,
              acquisition, sales, delivery, retention, and growth. See exactly
              what&rsquo;s inside before you decide.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                href={`/products/${product.slug}`}
                variant="accent"
                size="lg"
                arrow
              >
                Explore Client Growth System
              </Button>
              <Button href="/shop" variant="outline" size="lg">
                View the collection
              </Button>
            </div>
            <p className="mt-6 text-xs text-ink-3">
              {formatPrice(price)} one-time · 14-day refund window · Updates
              included
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
