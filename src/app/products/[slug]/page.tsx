import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProduct,
  getProducts,
  getCategory,
} from "@/lib/products";
import { formatPrice, site } from "@/lib/site";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/motion/reveal";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { CheckIcon } from "@/components/ui/icons";

/** Product detail — server-rendered, statically generated per product. */

export function generateStaticParams() {
  return getProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} — ${formatPrice(product.price)}`,
      description: product.shortDescription,
      url: `/products/${product.slug}`,
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const category = getCategory(product.category);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${site.url}/products/${product.slug}`,
    },
  };

  const related = getProducts()
    .filter((p) => p.slug !== product.slug)
    .slice(0, 2);

  return (
    <>
      <div className="border-b border-line bg-paper">
        <div className="container-page py-12 sm:py-14">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex flex-wrap items-center gap-2 text-xs text-ink-4">
                <li><Link href="/" className="hover:text-ink">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href="/shop" className="hover:text-ink">Shop</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ink-2">{product.name}</li>
              </ol>
            </nav>
            <p className="text-eyebrow mb-4">{category?.name}</p>
            <h1 className="text-display-1 max-w-2xl">{product.name}</h1>
            <p className="mt-5 max-w-xl text-lead">{product.cardDescription}</p>
          </Reveal>
        </div>
      </div>

      <div className="bg-surface">
        <div className="container-page py-14">
          <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
            {/* Main column */}
            <div>
              <Reveal>
                <section aria-labelledby="about-heading">
                  <h2 id="about-heading" className="text-display-2 text-[1.375rem]">
                    About this system
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-2">
                    {product.description}
                  </p>
                </section>
              </Reveal>

              <Reveal delay={0.05}>
                <section aria-labelledby="modules-heading" className="mt-12">
                  <h2 id="modules-heading" className="text-display-2 text-[1.375rem]">
                    What&rsquo;s inside
                  </h2>
                  <ul className="mt-5 divide-y divide-line border-y border-line">
                    {product.modules.map((m, i) => (
                      <li key={m.name} className="relative py-6 pl-12">
                        <span className="absolute left-0 top-7 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper spec text-ink-3">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="text-[1.0625rem] font-medium text-ink">
                          {m.name}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-accent">
                          {m.purpose}
                        </p>
                        <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-3">
                          {m.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            </div>

            {/* Purchase panel */}
            <Reveal delay={0.1}>
              <aside aria-label="Purchase" className="lg:sticky lg:top-28">
                <div className="rounded-md border border-line bg-paper p-6 shadow-sm">
                  <p className="text-3xl font-medium tnum text-ink">
                    {formatPrice(product.price)}
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
                    One-time purchase · Instant download
                  </p>
                  <div className="mt-5">
                    <AddToCartButton slug={product.slug} name={product.name} />
                  </div>
                  <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                    {product.specs.map((spec) => (
                      <li
                        key={spec.label}
                        className="flex items-start justify-between gap-4 text-xs"
                      >
                        <span className="spec pt-0.5 text-ink-4">{spec.label}</span>
                        <span className="text-right font-medium text-ink-2">
                          {spec.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 flex items-start gap-2.5 border-t border-line pt-5">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <p className="text-xs leading-relaxed text-ink-3">
                      14-day refund window. If it&rsquo;s not right, we refund
                      it — see the{" "}
                      <Link
                        href="/refund-policy"
                        className="font-medium text-accent underline-offset-2 hover:underline"
                      >
                        Refund Policy
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </aside>
            </Reveal>
          </div>

          {/* Related */}
          <section aria-labelledby="related-heading" className="mt-16 lg:mt-24">
            <Reveal>
              <div className="flex items-end justify-between">
                <h2 id="related-heading" className="text-display-2 text-[1.375rem]">
                  Also in the collection
                </h2>
                <Link
                  href="/shop"
                  className="text-sm font-medium text-accent hover:text-accent-deep"
                >
                  View all
                </Link>
              </div>
            </Reveal>
            <div className="mt-8 space-y-6">
              {related.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.05}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </section>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

