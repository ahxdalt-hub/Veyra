import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts, phaseMeta, PHASE_ORDER } from "@/lib/products";
import { formatPrice, site } from "@/lib/site";
import { Reveal } from "@/components/motion/reveal";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Product detail — server-rendered, statically generated per product.
 *
 * Available products get the full treatment: what it is, who it's for,
 * the problem, the workflow, what's included, delivery, price, and a
 * real purchase path. Coming-soon products render the same shell with
 * a restrained "in development" panel — no price, no purchase path.
 */

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
      title: product.price !== null
        ? `${product.name} — ${formatPrice(product.price)}`
        : `${product.name} — coming soon`,
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

  const available = product.status === "available" && product.price !== null;

  const jsonLd = available
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.shortDescription,
        brand: { "@type": "Brand", name: site.name },
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: `${site.url}/products/${product.slug}`,
        },
      }
    : {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.shortDescription,
        brand: { "@type": "Brand", name: site.name },
      };

  // Modules grouped in journey order.
  const byPhase = PHASE_ORDER.map((phase) => ({
    phase,
    modules: product.modules.filter((m) => m.phase === phase),
  })).filter((g) => g.modules.length > 0);

  return (
    <>
      {/* ------------------------------------------------------------ */}
      {/* Header + purchase panel                                       */}
      {/* ------------------------------------------------------------ */}
      <div className="border-b border-line bg-paper">
        <div className="container-page py-12 sm:py-14">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex flex-wrap items-center gap-2 text-xs text-ink-4">
                <li><Link href="/" className="hover:text-ink">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href="/shop" className="hover:text-ink">Products</Link></li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ink-2">{product.name}</li>
              </ol>
            </nav>
            <div className="grid gap-10 lg:grid-cols-[2fr_1fr] lg:gap-16">
              <div>
                <p className="text-eyebrow mb-4">
                  {available ? "Available now" : "Coming soon"}
                </p>
                <h1 className="text-display-1 max-w-2xl">{product.name}</h1>
                <p className="mt-4 max-w-xl font-display text-xl italic text-ink-2">
                  {product.tagline}
                </p>
                <p className="mt-6 max-w-xl text-lead">
                  {product.cardDescription}
                </p>
              </div>
              <PurchasePanel product={product} available={available} />
            </div>
          </Reveal>
        </div>
      </div>

      {available ? (
        <div className="bg-surface">
          <div className="container-page py-14 lg:py-20">
            {/* ------------------------------------------------------ */}
            {/* What it is                                              */}
            {/* ------------------------------------------------------ */}
            <Reveal>
              <section aria-labelledby="what-heading" className="max-w-2xl">
                <p className="text-eyebrow mb-3">What it is</p>
                <h2 id="what-heading" className="text-display-2">
                  One system for the whole client-growth journey.
                </h2>
                <p className="mt-5 text-sm leading-relaxed text-ink-2 sm:text-[0.9375rem]">
                  {product.description}
                </p>
              </section>
            </Reveal>

            {/* ------------------------------------------------------ */}
            {/* Who it's for / problem                                  */}
            {/* ------------------------------------------------------ */}
            <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-2 lg:gap-16">
              <Reveal>
                <section aria-labelledby="who-heading" className="max-w-xl">
                  <p className="text-eyebrow mb-3">Who it&rsquo;s for</p>
                  <h2 id="who-heading" className="text-display-2">
                    Built for people who run client work.
                  </h2>
                  <p className="mt-5 text-sm leading-relaxed text-ink-2 sm:text-[0.9375rem]">
                    {product.audience}
                  </p>
                  <p className="mt-4 border-l-2 border-accent pl-4 text-sm font-medium text-ink-2">
                    {product.outcome}
                  </p>
                </section>
              </Reveal>
              <Reveal delay={0.08}>
                <section aria-labelledby="problem-heading" className="max-w-xl">
                  <p className="text-eyebrow mb-3">The problem it solves</p>
                  <h2 id="problem-heading" className="text-display-2">
                    The process is scattered. So is the execution.
                  </h2>
                  <p className="mt-5 text-sm leading-relaxed text-ink-2 sm:text-[0.9375rem]">
                    {product.problem}
                  </p>
                </section>
              </Reveal>
            </div>

            {/* ------------------------------------------------------ */}
            {/* How the system works — the journey                      */}
            {/* ------------------------------------------------------ */}
            <Reveal>
              <section aria-labelledby="workflow-heading" className="mt-16 lg:mt-24">
                <p className="text-eyebrow mb-3">How the system works</p>
                <h2 id="workflow-heading" className="text-display-2 max-w-2xl">
                  Six phases, run in order.
                </h2>
                <ol className="mt-10 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                  {product.workflow.map((step, i) => (
                    <li key={step.phase} className="group bg-paper p-6 transition-colors duration-300 hover:bg-accent-soft/50 lg:p-7">
                      <div className="flex items-baseline justify-between">
                        <span className="spec tnum text-accent">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="spec text-ink-4">
                          {phaseMeta[step.phase].label}
                        </span>
                      </div>
                      <h3 className="mt-4 text-[1.0625rem] font-medium text-ink">
                        {step.headline}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-3">
                        {step.detail}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>

            {/* ------------------------------------------------------ */}
            {/* What's included — modules by phase                      */}
            {/* ------------------------------------------------------ */}
            <Reveal>
              <section aria-labelledby="included-heading" className="mt-16 lg:mt-24">
                <p className="text-eyebrow mb-3">What&rsquo;s included</p>
                <h2 id="included-heading" className="text-display-2 max-w-2xl">
                  Twelve modules across six phases.
                </h2>

                <div className="mt-10 space-y-0 divide-y divide-line border-y border-line">
                  {byPhase.map(({ phase, modules }) => (
                    <div
                      key={phase}
                      className="grid gap-4 py-8 lg:grid-cols-[13rem_1fr] lg:gap-12"
                    >
                      <div>
                        <h3 className="font-display text-xl italic text-accent">
                          {phaseMeta[phase].label}
                        </h3>
                        <p className="mt-1.5 max-w-[11rem] text-xs leading-relaxed text-ink-3">
                          {phaseMeta[phase].blurb}
                        </p>
                      </div>
                      <ul className="divide-y divide-line/70">
                        {modules.map((m) => (
                          <li key={m.name} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-baseline gap-x-3">
                              <h4 className="text-[1.0625rem] font-medium text-ink">
                                {m.name}
                              </h4>
                              <span className="text-xs font-medium text-accent">
                                {m.purpose}
                              </span>
                            </div>
                            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-3">
                              {m.detail}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* ------------------------------------------------------ */}
            {/* How it's delivered                                      */}
            {/* ------------------------------------------------------ */}
            <Reveal>
              <section aria-labelledby="delivery-heading" className="mt-16 lg:mt-24">
                <p className="text-eyebrow mb-3">How it&rsquo;s delivered</p>
                <h2 id="delivery-heading" className="text-display-2 max-w-2xl">
                  Buy once. Delivered digitally. Run it for good.
                </h2>
                <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-3">
                  {[
                    {
                      n: "01",
                      t: "Complete your purchase",
                      d: "One-time payment through secure checkout. No subscription.",
                    },
                    {
                      n: "02",
                      t: "Payment verified",
                      d: "Your payment is confirmed and your order is recorded against your email.",
                    },
                    {
                      n: "03",
                      t: "The system is delivered",
                      d: "Delivery details arrive by email, and you start running the system — starting at Build.",
                    },
                  ].map((s) => (
                    <li key={s.n} className="border-t border-line pt-5">
                      <span className="spec tnum text-accent">{s.n}</span>
                      <h3 className="mt-2.5 text-[1.0625rem] font-medium text-ink">
                        {s.t}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-3">
                        {s.d}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------------- */
        /* Coming soon — no purchase path, honest panel                */
        /* ---------------------------------------------------------- */
        <div className="bg-surface">
          <div className="container-page py-14 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-[2fr_1fr] lg:gap-16">
              <Reveal>
                <section aria-labelledby="about-heading" className="max-w-2xl">
                  <p className="text-eyebrow mb-3">About this product</p>
                  <h2 id="about-heading" className="text-display-2">
                    In development.
                  </h2>
                  <p className="mt-5 text-sm leading-relaxed text-ink-2 sm:text-[0.9375rem]">
                    {product.description}
                  </p>
                  <p className="mt-5 text-sm leading-relaxed text-ink-2 sm:text-[0.9375rem]">
                    {product.problem}
                  </p>
                </section>
              </Reveal>
              <Reveal delay={0.08}>
                <aside
                  aria-label="Availability"
                  className="rounded-md border border-dashed border-line-strong bg-paper p-6"
                >
                  <span className="spec inline-block rounded-full border border-line-strong bg-surface px-2.5 py-1 text-ink-3">
                    Coming soon
                  </span>
                  <p className="mt-4 text-sm leading-relaxed text-ink-2">
                    This product is in development and is not available for
                    purchase yet. When it ships, it will be announced on this
                    page and across the site.
                  </p>
                  <div className="mt-5 border-t border-line pt-5">
                    <Link
                      href="/products/client-growth-system"
                      className="text-sm font-medium text-accent hover:text-accent-deep"
                    >
                      Available today: Client Growth System →
                    </Link>
                  </div>
                </aside>
              </Reveal>
            </div>
          </div>
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Purchase panel                                                      */
/* ------------------------------------------------------------------ */

function PurchasePanel({
  product,
  available,
}: {
  product: NonNullable<ReturnType<typeof getProduct>>;
  available: boolean;
}) {
  if (!available) {
    return (
      <aside aria-label="Availability" className="lg:pt-2">
        <div className="rounded-md border border-dashed border-line-strong bg-surface p-6">
          <span className="spec inline-block rounded-full border border-line-strong bg-paper px-2.5 py-1 text-ink-3">
            Coming soon
          </span>
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            Not available for purchase yet.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Purchase" className="lg:pt-2">
      <div className="rounded-md border border-line bg-surface p-6 shadow-sm">
        <p className="text-3xl font-medium tnum text-ink">
          {formatPrice(product.price!)}
        </p>
        <p className="mt-1 text-xs text-ink-3">
          One-time payment · Instant digital delivery
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
            14-day refund window. If it&rsquo;s not right, we refund it — see
            the{" "}
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
  );
}
