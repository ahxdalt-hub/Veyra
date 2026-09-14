import type { Metadata } from "next";
import Link from "next/link";
import { getAvailableProducts, getComingSoonProducts } from "@/lib/products";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/motion/reveal";

export const metadata: Metadata = {
  title: "Products",
  description:
    "The Veyra collection — practical business systems for freelancers, consultants, service businesses, and small agencies. Client Growth System available now.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Veyra products",
    description:
      "Practical business systems you can actually run. One-time payment, instant digital delivery.",
    url: "/shop",
  },
};

export default function ShopPage() {
  const available = getAvailableProducts();
  const comingSoon = getComingSoonProducts();

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
                <li aria-current="page" className="text-ink-2">Products</li>
              </ol>
            </nav>
            <h1 className="text-display-1 max-w-2xl">
              The Veyra collection.
            </h1>
            <p className="mt-5 max-w-xl text-lead">
              Practical business systems, packaged to be used. One-time
              payment, instant digital delivery — and a pipeline of systems in
              development.
            </p>
          </Reveal>
        </div>
      </div>

      {/* Available */}
      <div className="bg-surface">
        <div className="container-page py-12">
          <p className="mb-6 text-xs text-ink-4 tnum">
            {available.length} available
          </p>
          <div className="space-y-6">
            {available.map((p, i) => (
              <Reveal key={p.slug} delay={Math.min(i * 0.05, 0.2)}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>

          {comingSoon.length > 0 ? (
            <div className="mt-16">
              <div className="flex items-baseline gap-4">
                <h2 className="text-eyebrow">Coming soon</h2>
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
          ) : null}
        </div>
      </div>
    </>
  );
}
