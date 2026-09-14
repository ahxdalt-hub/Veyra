import Link from "next/link";
import { getAvailableProducts, getComingSoonProducts } from "@/lib/products";
import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";

/**
 * Collection — Section G.
 * The Veyra product line: what's available now, and what's coming.
 * Coming-soon products render without price or purchase path.
 */
export function Collection() {
  const available = getAvailableProducts();
  const comingSoon = getComingSoonProducts();

  return (
    <section id="collection" className="scroll-mt-24 border-b border-line bg-surface">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHead
              eyebrow="The collection"
              title="Systems for every stage of client work."
              className="mb-0"
            />
            <Button href="/shop" variant="outline" size="md" arrow>
              View all products
            </Button>
          </div>
        </Reveal>

        <div className="mt-10 space-y-6">
          {available.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>

        {/* Coming soon — announced, not purchasable */}
        {comingSoon.length > 0 ? (
          <Reveal delay={0.08}>
            <div className="mt-14">
              <div className="flex items-baseline gap-4">
                <h3 className="text-eyebrow">Coming soon</h3>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              </div>
              <ul className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                {comingSoon.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/products/${p.slug}`}
                      className="group block rounded-sm border border-dashed border-line-strong bg-paper px-4 py-3.5 transition-colors hover:border-ink/25"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-ink group-hover:text-accent">
                          {p.name}
                        </span>
                        <span className="spec shrink-0 text-ink-4">
                          In development
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-ink-3">
                        {p.tagline}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : null}

        <Reveal delay={0.1}>
          <p className="mt-10 text-center text-xs text-ink-4">
            One system available today · More systems added as they&rsquo;re
            built and tested.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
