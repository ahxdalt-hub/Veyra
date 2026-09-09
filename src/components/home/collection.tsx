import Link from "next/link";
import { getShopProducts, categories, getProductsByCategory } from "@/lib/products";
import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";

/**
 * Collection — Section G.
 * Selected products with the architecture for a growing catalog:
 * category rail (derived from data, not hardcoded) + product rows.
 */

export function Collection() {
  const products = getShopProducts().slice(0, 3);

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
              View all systems
            </Button>
          </div>
        </Reveal>

        {/* Category rail — architecture for future growth */}
        <Reveal delay={0.08}>
          <div className="mt-10 flex flex-wrap items-center gap-2 border-y border-line py-4">
            <span className="spec mr-2 text-ink-4">Browse by workflow:</span>
            {categories.map((c) => {
              const count = getProductsByCategory(c.slug).length;
              return (
                <Link
                  key={c.slug}
                  href={`/categories/${c.slug}`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink-2 transition-colors hover:border-accent/40 hover:bg-accent-soft/60 hover:text-accent-ink"
                >
                  {c.name}
                  <span className="tnum text-ink-4">{count}</span>
                </Link>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-10 space-y-6">
          {products.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.06}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-xs text-ink-4">
            {getShopProducts().length} systems · New systems added as they&rsquo;re
            built and tested.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
