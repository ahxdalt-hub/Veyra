import type { Metadata } from "next";
import Link from "next/link";
import { getShopProducts, categories, getProductsByCategory } from "@/lib/products";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Shop all systems",
  description:
    "Browse every Standard Practice business system — client acquisition, follow-up, pipeline, and onboarding. Instant download, one-time purchase.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop all systems — Standard Practice",
    description:
      "Ready-to-use business systems for client work. Instant download, one-time purchase.",
    url: "/shop",
  },
};

export default function ShopPage() {
  const products = getShopProducts();

  return (
    <>
      {/* Page header */}
      <div className="border-b border-line bg-paper">
        <div className="container-page py-14 sm:py-16 lg:py-20">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-ink-4">
                <li>
                  <Link href="/" className="transition-colors hover:text-ink">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ink-2">Shop</li>
              </ol>
            </nav>
            <h1 className="text-display-1 max-w-2xl">
              Every system, built for implementation.
            </h1>
            <p className="mt-5 max-w-xl text-lead">
              One-time purchase, instant download, yours to run forever. Each
              system is self-contained — the flagship connects them all.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Category rail */}
      <div className="border-b border-line bg-surface">
        <div className="container-page flex flex-wrap items-center gap-2 py-4">
          <span className="spec mr-2 text-ink-4">Filter by workflow:</span>
          {categories.map((c) => {
            const count = getProductsByCategory(c.slug).length;
            return (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink-2 transition-colors hover:border-accent/40 hover:bg-accent-soft/60 hover:text-accent-ink"
              >
                {c.name}
                <span className="tnum text-ink-4">{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Product list */}
      <div className="bg-surface">
        <div className="container-page py-12">
          <p className="mb-6 text-xs text-ink-4 tnum">
            {products.length} systems
          </p>
          <div className="space-y-6">
            {products.map((p, i) => (
              <Reveal key={p.slug} delay={Math.min(i * 0.05, 0.2)}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
