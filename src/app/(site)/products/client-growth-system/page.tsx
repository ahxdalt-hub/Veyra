import type { Metadata } from "next";
import Link from "next/link";
import { getProduct, phaseMeta, PHASE_ORDER } from "@/lib/products";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { CURRENCY, site } from "@/lib/site";
import { OfferHero } from "@/components/offer/offer-hero";
import { OfferProblem } from "@/components/offer/offer-problem";
import { OfferSystem, type OfferStage } from "@/components/offer/offer-system";
import { OfferIncludes } from "@/components/offer/offer-includes";
import { OfferExperience } from "@/components/offer/offer-experience";
import { OfferValue } from "@/components/offer/offer-pricing";
import { OfferFounding } from "@/components/offer/offer-founding";
import { OfferFaq } from "@/components/offer/offer-faq";

/**
 * Client Growth System — the flagship's offer presentation.
 *
 * A dedicated static route that shadows the generic [slug] product page
 * for this one product: the full pricing/offer presentation — problem,
 * the six-stage system, what's inside, the product experience, the value
 * story, and the founding-customer offer — closed by an honest FAQ.
 *
 * Every commercial number (price, regular price, saving) is resolved
 * from the catalog here and passed down as props. The CTA enters the
 * existing cart; checkout re-validates against the same catalog.
 */

const FLAGSHIP = "client-growth-system";

/** The founding-price presentation, resolved from the pricing module —
 *  the same numbers checkout charges and the product page anchors. */
const founding = {
  price: FOUNDING_PRICE,
  regularPrice: REGULAR_PRICE,
  save: REGULAR_PRICE - FOUNDING_PRICE,
};

export function generateMetadata(): Metadata {
  const product = getProduct(FLAGSHIP);
  if (!product) return {};
  return {
    title: `${product.name} — $${founding.price} founding customer price`,
    description: product.shortDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} — $${founding.price} founding customer price (regular $${founding.regularPrice})`,
      description: product.shortDescription,
      url: `/products/${product.slug}`,
      type: "website",
    },
  };
}

export default function ClientGrowthSystemOfferPage() {
  const product = getProduct(FLAGSHIP);
  if (!product) return null;

  // The six stages, resolved from the catalog: workflow copy + phase
  // blurbs + the modules that live in each stage.
  const stages: OfferStage[] = PHASE_ORDER.map((phase, i) => {
    const workflow = product.workflow.find((w) => w.phase === phase);
    return {
      phase,
      n: String(i + 1).padStart(2, "0"),
      label: phaseMeta[phase].label,
      blurb: phaseMeta[phase].blurb,
      headline: workflow?.headline ?? phaseMeta[phase].label,
      detail: workflow?.detail ?? phaseMeta[phase].blurb,
      modules: product.modules
        .filter((m) => m.phase === phase)
        .map((m) => ({ name: m.name, purpose: m.purpose })),
    } satisfies OfferStage;
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      price: founding.price,
      priceCurrency: CURRENCY,
      availability: "https://schema.org/InStock",
      url: `${site.url}/products/${product.slug}`,
    },
  };

  return (
    <>
      {/* ------------------------------------------------------------ */}
      {/* Breadcrumb                                                    */}
      {/* ------------------------------------------------------------ */}
      <div className="border-b border-line bg-paper">
        <div className="container-page py-3.5">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-ink-4">
              <li><Link href="/" className="hover:text-ink">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/shop" className="hover:text-ink">Products</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-ink-2">{product.name}</li>
            </ol>
          </nav>
        </div>
      </div>

      <OfferHero
        slug={product.slug}
        name={product.name}
        price={founding.price}
        regularPrice={founding.regularPrice}
        save={founding.save}
      />
      <OfferProblem />
      <section className="border-b border-line bg-paper">
        <div className="container-page py-20 sm:py-24 lg:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-eyebrow mb-4">The system</p>
            <h2 className="text-display-1">
              One operating system. Six{" "}
              <span className="em-serif">connected stages.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-lead">
              BUILD → ACQUIRE → SELL → DELIVER → RETAIN → GROW — each stage
              feeds the next, so the system works as one journey. Select a
              stage to see what happens inside it.
            </p>
          </div>
          <OfferSystem stages={stages} />
        </div>
      </section>
      <OfferIncludes />
      <OfferExperience />
      <OfferValue />
      <OfferFounding />
      <OfferFaq />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
