import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategory, getProductsByCategory } from "@/lib/products";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/motion/reveal";

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  return {
    title: `${category.name} systems`,
    description: category.description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: {
      title: `${category.name} systems — Standard Practice`,
      description: category.description,
      url: `/categories/${category.slug}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const products = getProductsByCategory(category.slug);

  return (
    <>
      <div className="border-b border-line bg-paper">
        <div className="container-page py-14 sm:py-16">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-ink-4">
                <li><Link href="/" className="hover:text-ink">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href="/shop" className="hover:text-ink">Shop</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ink-2">
                  {category.name}
                </li>
              </ol>
            </nav>
            <p className="text-eyebrow mb-4">Category</p>
            <h1 className="text-display-1 max-w-2xl">
              {category.name} systems
            </h1>
            <p className="mt-5 max-w-xl text-lead">{category.description}</p>
          </Reveal>
        </div>
      </div>

      <div className="bg-surface">
        <div className="container-page py-12">
          {/* Category rail */}
          <div className="mb-10 flex flex-wrap items-center gap-2">
            <span className="spec mr-2 text-ink-4">Categories:</span>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                aria-current={c.slug === category.slug ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  c.slug === category.slug
                    ? "border-accent/40 bg-accent-soft text-accent-ink"
                    : "border-line bg-paper text-ink-2 hover:border-accent/40 hover:bg-accent-soft/60"
                }`}
              >
                {c.name}
                <span className="tnum text-ink-4">
                  {getProductsByCategory(c.slug).length}
                </span>
              </Link>
            ))}
          </div>

          <div className="space-y-6">
            {products.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.05}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
