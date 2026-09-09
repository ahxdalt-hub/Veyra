import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { getShopProducts } from "@/lib/products";
import { formatPrice } from "@/lib/site";

/**
 * FinalCta — Section J.
 * Practical, calm close: browse, no countdown timers, no false urgency.
 */

export function FinalCta() {
  const cheapest = Math.min(...getShopProducts().map((p) => p.price));

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

            <p className="text-eyebrow">Get started</p>
            <h2 className="text-display-1 mx-auto mt-4 max-w-2xl">
              Pick the system that fixes your busiest bottleneck.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lead">
              Browse the collection, read exactly what&rsquo;s inside each one,
              and start with the workflow that costs you the most time today.
              Systems from {formatPrice(cheapest)}, delivered instantly.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/shop" variant="accent" size="lg" arrow>
                Browse the systems
              </Button>
              <Button href="/resources" variant="outline" size="lg">
                Start with the free audit
              </Button>
            </div>
            <p className="mt-6 text-xs text-ink-3">
              One-time purchase · 14-day refund window · Free quarterly updates
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
