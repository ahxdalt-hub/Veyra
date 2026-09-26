import type { Metadata } from "next";
import Link from "next/link";
import { getProduct, phaseMeta, PHASE_ORDER } from "@/lib/products";
import { FOUNDING_PRICE, MAX_SEATS, REGULAR_PRICE } from "@/lib/pricing";
import { FOUNDING_LIMIT, getFoundingStatus } from "@/lib/founding";
import { CURRENCY, REFUND_WINDOW_LABEL, formatPrice, site } from "@/lib/site";
import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import { FaqAccordion, type FaqItem } from "@/components/home/faq-accordion";
import { CheckIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { CgsHero } from "@/components/cgs/cgs-hero";
import { CgsWorkflow, type CgsStage } from "@/components/cgs/cgs-workflow";
import { CgsDemo } from "@/components/cgs/cgs-demo";
import { CgsPricing } from "@/components/cgs/cgs-pricing";
import { PurchaseCta } from "@/components/cgs/purchase-cta";

/**
 * Client Growth System — the product sales page.
 *
 * Composition rule for this route: every commercial number (founding vs
 * regular price, seat tiers, the founding limit) is resolved from the
 * pricing and founding modules here, server-side, and passed down as
 * props. Founding availability follows the real paid-order count — when
 * the allocation is genuinely closed, the regular price is displayed.
 * CTAs enter the existing cart; checkout re-validates independently.
 *
 * Content rule: everything here describes the actual product — a Windows
 * desktop application delivering an installer and per-seat licences
 * through the customer account. No invented features, statistics, or
 * fabricated screenshots.
 */

const FLAGSHIP = "client-growth-system";

/* ------------------------------------------------------------------ */
/* Static section copy — editorial content, not commerce state          */
/* ------------------------------------------------------------------ */

const PROBLEMS = [
  {
    t: "Scattered tools",
    d: "Prospecting, follow-ups, sales, and client delivery live in different places that never talk to each other.",
  },
  {
    t: "Forgotten prospects",
    d: "Conversations go quiet because nothing was holding the follow-up — not because the client said no.",
  },
  {
    t: "Unclear next steps",
    d: "Opportunities sit in limbo when the process for moving each one forward isn't written down anywhere.",
  },
  {
    t: "Inconsistent delivery",
    d: "Onboarding and retention depend on memory and mood, so good clients get handled differently every time.",
  },
  {
    t: "Reactive growth",
    d: "The business responds to busy periods instead of running a system that compounds week after week.",
  },
];

// Capability sections follow the catalog's stage order — the modules
// listed under each stage are the catalog's own, filtered by phase.
const CAPABILITY_PHASES = PHASE_ORDER;

const DELIVERY_STEPS = [
  {
    n: "01",
    t: "Purchase",
    d: "Buy Client Growth System through the secure Veyra checkout.",
  },
  {
    n: "02",
    t: "Download",
    d: "Access the installer and licence through your Veyra customer account.",
  },
  {
    n: "03",
    t: "Install",
    d: "Install the Windows desktop application on your computer.",
  },
  {
    n: "04",
    t: "Build your system",
    d: "Set up your business, organize client acquisition, manage sales, and run your client workflow.",
  },
];

const OWNERSHIP_POINTS = [
  {
    t: "A real desktop application",
    d: "Client Growth System is a Windows desktop application — installed and run on your own computer, not a tab in someone else's cloud.",
  },
  {
    t: "Your business data, stored locally",
    d: "Business data is designed to be stored locally on your device. Your client records and workflow live with you.",
  },
  {
    t: "Built for offline work",
    d: "Normal business workflows are designed for offline use after activation. An internet connection is required for initial licence activation and applicable licence operations.",
  },
  {
    t: "Purchased, not rented",
    d: "The product is bought once rather than billed as a recurring subscription.",
  },
];

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */

export async function generateMetadata(): Promise<Metadata> {
  const product = getProduct(FLAGSHIP);
  if (!product) return {};
  const foundingActive = (await getFoundingStatus()) === "active";
  const price = foundingActive ? FOUNDING_PRICE : REGULAR_PRICE;
  return {
    title: product.name,
    description:
      "Build a more systematic service business with Veyra Client Growth System. Manage client acquisition, sales, onboarding, retention, and growth in one practical Windows desktop application.",
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} — ${formatPrice(price)} one-time purchase`,
      description:
        "Turn scattered client work into a system for consistent growth. Client acquisition, sales, delivery, retention, and growth — one Windows desktop application.",
      url: `/products/${product.slug}`,
      type: "website",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function ClientGrowthSystemPage() {
  const product = getProduct(FLAGSHIP);
  if (!product) return null;

  // The real source of truth for the founding allocation — no fake
  // scarcity, no invented countdown. When closed, the regular price
  // is what a customer sees and pays.
  const foundingActive = (await getFoundingStatus()) === "active";
  const price = foundingActive ? FOUNDING_PRICE : REGULAR_PRICE;

  // The six stages, resolved from the catalog: workflow copy + the
  // modules that live in each stage.
  const stages: CgsStage[] = PHASE_ORDER.map((phase, i) => {
    const workflow = product.workflow.find((w) => w.phase === phase);
    return {
      phase,
      n: String(i + 1).padStart(2, "0"),
      label: phaseMeta[phase].label,
      headline: workflow?.headline ?? phaseMeta[phase].label,
      detail: workflow?.detail ?? phaseMeta[phase].blurb,
      modules: product.modules
        .filter((m) => m.phase === phase)
        .map((m) => ({ name: m.name, purpose: m.purpose })),
    } satisfies CgsStage;
  });

  // Capability groups — the stages' modules, straight from the catalog,
  // so nothing is claimed here that the application doesn't contain.
  const capabilityGroups = CAPABILITY_PHASES.map((phase) => ({
    phase,
    label: phaseMeta[phase].label,
    blurb: phaseMeta[phase].blurb,
    modules: product.modules
      .filter((m) => m.phase === phase)
      .map((m) => ({ name: m.name, purpose: m.purpose })),
  })).filter((g) => g.modules.length > 0);

  const faqItems: FaqItem[] = [
    {
      q: "What is Client Growth System?",
      a: "It is a Windows desktop business operating system for running the connected client-growth workflow: establishing your business foundation, acquiring clients, selling, delivering, retaining, and reviewing growth — six connected stages inside one practical application, not a template folder or a course.",
    },
    {
      q: "Who is it for?",
      a: "Freelancers, consultants, independent service providers, and small service businesses who run client work and want the growth side of the business to run on structure instead of memory.",
    },
    {
      q: "Is it a subscription?",
      a: `No. The current product is sold as a one-time purchase — ${foundingActive ? `the founding price is ${formatPrice(FOUNDING_PRICE)}, and the intended regular price is ${formatPrice(REGULAR_PRICE)}` : `the price is ${formatPrice(REGULAR_PRICE)}`}. There is no recurring charge. Veyra may release other products in the future, each sold on its own terms.`,
    },
    {
      q: "Does it work offline?",
      a: "Business workflows are designed to work locally on your computer after successful licence activation. An internet connection is needed for initial activation and applicable licence operations.",
    },
    {
      q: "What happens after I purchase?",
      a: "Once your one-time payment is confirmed, your order is recorded against your account. You sign in to your Veyra customer account, access the Windows installer and your licence, install the application, and activate it by signing in. Delivery details also arrive by email.",
    },
    {
      q: "How many people can use one purchase?",
      a: `The licence is per seat: one purchase covers one person, and small teams can license up to ${MAX_SEATS} seats in a single checkout. The per-seat price steps down slightly as seats are added — the current tier ladder is shown in the pricing section above.`,
    },
    {
      q: "Is the live demo available?",
      a: "Not yet. The interactive demo is currently being polished and is coming soon. The “Try the live demo” button on this page tells you its status — it never opens a broken route or a fake application.",
    },
    {
      q: "What platforms are supported?",
      a: "Windows only. Client Growth System is currently released as a Windows desktop application; macOS, Linux, and mobile versions are not available and are not being promised.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    brand: { "@type": "Brand", name: site.name },
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: CURRENCY,
      availability: "https://schema.org/InStock",
      url: `${site.url}/products/${product.slug}`,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
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

      {/* ------------------------------------------------------------ */}
      {/* 1 · Hero                                                      */}
      {/* ------------------------------------------------------------ */}
      <CgsHero
        slug={product.slug}
        name={product.name}
        price={price}
        regularPrice={REGULAR_PRICE}
        foundingActive={foundingActive}
        foundingLimit={FOUNDING_LIMIT}
      />

      {/* ------------------------------------------------------------ */}
      {/* 2 · The problem                                               */}
      {/* ------------------------------------------------------------ */}
      <section
        aria-labelledby="problem-heading"
        className="border-b border-line bg-surface"
      >
        <div className="container-page py-20 sm:py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-20">
            <Reveal>
              {/* Sticky column — the headline and the promise travel down
                  with the numbered list, so the left side stays occupied
                  beside a tall column of problems. */}
              <div className="lg:sticky lg:top-28">
                <p className="text-eyebrow mb-4">The problem</p>
                <h2 id="problem-heading" className="text-display-1">
                  Your business shouldn&rsquo;t depend on keeping{" "}
                  <span className="em-serif">everything in your head.</span>
                </h2>

                {/* Bronze rule with a centered diamond — house divider */}
                <p aria-hidden="true" className="mt-8 flex max-w-[16rem] items-center gap-3">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent/40" />
                  <span className="h-1.5 w-1.5 rotate-45 border border-accent/50 bg-accent-soft" />
                  <span className="h-px flex-1 bg-gradient-to-l from-accent/40 to-transparent" />
                </p>

                {/* The promise — the answer framed like the offer moments */}
                <div className="relative mt-8 rounded-lg border border-accent/25 bg-accent-soft/60 p-6 shadow-sm">
                  <span aria-hidden="true" className="absolute left-3.5 top-3.5 h-2.5 w-2.5 border-l border-t border-accent/45" />
                  <span aria-hidden="true" className="absolute right-3.5 top-3.5 h-2.5 w-2.5 border-r border-t border-accent/45" />
                  <span aria-hidden="true" className="absolute bottom-3.5 left-3.5 h-2.5 w-2.5 border-b border-l border-accent/45" />
                  <span aria-hidden="true" className="absolute bottom-3.5 right-3.5 h-2.5 w-2.5 border-b border-r border-accent/45" />
                  <p className="text-sm font-medium leading-relaxed text-ink-2">
                    <CheckIcon className="mb-1 mr-2 inline h-4 w-4 text-accent" />
                    Client Growth System connects the moving parts, so you
                    can focus on{" "}
                    <span className="font-display italic text-accent-ink">
                      running your business.
                    </span>
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <ul className="divide-y divide-line border-y border-line">
                {PROBLEMS.map((p, i) => (
                  <li
                    key={p.t}
                    className="group flex gap-5 px-1 py-6 transition-colors duration-200 hover:bg-accent-soft/40"
                  >
                    <span
                      aria-hidden="true"
                      className="spec tnum mt-1 w-7 shrink-0 text-ink-4 transition-colors duration-200 group-hover:text-accent"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-[0.9375rem] font-medium text-ink">
                        {p.t}
                      </h3>
                      <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-3">
                        {p.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 3 · The six-stage workflow                                    */}
      {/* ------------------------------------------------------------ */}
      <CgsWorkflow stages={stages} />

      {/* ------------------------------------------------------------ */}
      {/* 4 · Product capabilities                                      */}
      {/* ------------------------------------------------------------ */}
      <section
        aria-labelledby="capabilities-heading"
        className="border-b border-line bg-paper"
      >
        <div className="container-page py-20 sm:py-24 lg:py-28">
          <Reveal>
            <SectionHead
              eyebrow="Capabilities"
              title={
                <>
                  Everything connected to the way you{" "}
                  <span className="em-serif">actually work.</span>
                </>
              }
              lead="Each stage of the workflow contains the working modules for that stage — define once, reuse every week. Every capability below maps to a module inside the application."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-14 divide-y divide-line border-y border-line">
              {capabilityGroups.map((g) => (
                <div
                  key={g.phase}
                  className="grid gap-x-12 gap-y-3 py-8 lg:grid-cols-[13rem_minmax(0,1fr)]"
                >
                  <div>
                    <h3 className="font-display text-xl italic text-accent">
                      {g.label}
                    </h3>
                    <p className="mt-1.5 max-w-[13rem] text-xs leading-relaxed text-ink-3">
                      {g.blurb}
                    </p>
                  </div>
                  <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
                    {g.modules.map((m) => (
                      <li
                        key={m.name}
                        className="flex items-start gap-3 py-1"
                      >
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {m.name}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
                            {m.purpose}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 5 · How it works — purchase to working system                 */}
      {/* ------------------------------------------------------------ */}
      <section
        aria-labelledby="how-heading"
        className="border-b border-line bg-surface"
      >
        <div className="container-page py-20 sm:py-24 lg:py-28">
          <Reveal>
            <SectionHead
              eyebrow="How it works"
              title="From purchase to a working business system."
              lead="Four steps from checkout to a running workflow — digital delivery, no waiting."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <ol className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
              {DELIVERY_STEPS.map((s) => (
                <li key={s.n} className="border-t border-line-strong pt-5">
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
            <p className="mt-10 max-w-2xl text-xs leading-relaxed text-ink-3">
              An internet connection is needed for initial licence
              activation and applicable licence operations. Normal business
              use is designed to work locally on your Windows computer
              after successful activation.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 6 · Local-first and ownership                                 */}
      {/* ------------------------------------------------------------ */}
      <section
        aria-labelledby="ownership-heading"
        className="border-b border-line bg-paper"
      >
        <div className="container-page py-20 sm:py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <Reveal>
              <p className="text-eyebrow mb-4">Local-first</p>
              <h2 id="ownership-heading" className="text-display-1">
                Your business workspace.{" "}
                <span className="em-serif">On your computer.</span>
              </h2>
              <p className="mt-6 max-w-md text-lead">
                This is software you own and run on your own machine — a
                desktop workspace for your business, not another
                subscription tab in someone else&rsquo;s cloud.
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
                {OWNERSHIP_POINTS.map((p) => (
                  <div key={p.t} className="bg-surface p-6 lg:p-7">
                    <h3 className="text-[1.0625rem] font-medium text-ink">
                      {p.t}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-3">
                      {p.d}
                    </p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 7 · Try the live demo                                         */}
      {/* ------------------------------------------------------------ */}
      <CgsDemo />

      {/* ------------------------------------------------------------ */}
      {/* 8 · Pricing                                                   */}
      {/* ------------------------------------------------------------ */}
      <CgsPricing
        slug={product.slug}
        name={product.name}
        price={price}
        regularPrice={REGULAR_PRICE}
        foundingActive={foundingActive}
        foundingLimit={FOUNDING_LIMIT}
      />

      {/* ------------------------------------------------------------ */}
      {/* 9 · FAQ                                                       */}
      {/* ------------------------------------------------------------ */}
      <section
        id="faq"
        className="scroll-mt-24 border-b border-line bg-surface"
      >
        <div className="container-page py-20 sm:py-24 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
            <Reveal>
              {/* Sticky column — the question block and the at-a-glance card
                  travel down with the accordion, so the left side carries
                  real decision-supporting information instead of empty space. */}
              <div className="lg:sticky lg:top-28">
                <SectionHead eyebrow="FAQ" title="Before you decide." />
                <p className="mt-6 max-w-sm text-sm text-ink-3">
                  Something we didn&rsquo;t cover? Write to{" "}
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="font-medium text-accent underline-offset-4 hover:underline"
                  >
                    {site.contact.email}
                  </a>{" "}
                  — we answer personally.
                </p>

                {/* The spec sheet — catalog data, same source the purchase
                    panel and checkout resolve. Honest facts, no filler. */}
                <div className="relative mt-8 max-w-sm overflow-hidden rounded-lg border border-line bg-paper p-6 shadow-sm">
                  <span aria-hidden="true" className="absolute left-3.5 top-3.5 h-2.5 w-2.5 border-l border-t border-accent/40" />
                  <span aria-hidden="true" className="absolute right-3.5 top-3.5 h-2.5 w-2.5 border-r border-t border-accent/40" />

                  <div className="flex items-baseline justify-between gap-3">
                    <p className="spec text-ink-4">The system at a glance</p>
                    <p className="font-display text-xl italic text-ink tnum">
                      {formatPrice(price)}
                    </p>
                  </div>
                  <dl className="mt-4 divide-y divide-line border-t border-line">
                    {product.specs.map((s) => (
                      <div
                        key={s.label}
                        className="flex items-start justify-between gap-4 py-2.5"
                      >
                        <dt className="spec pt-0.5 text-ink-4">{s.label}</dt>
                        <dd className="text-right text-xs font-medium text-ink-2">
                          {s.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-xs leading-relaxed text-ink-3">
                    {foundingActive ? (
                      <>
                        Founding price for the first{" "}
                        <span className="tnum font-medium text-ink">
                          {FOUNDING_LIMIT}
                        </span>{" "}
                        customers · regular {formatPrice(REGULAR_PRICE)}.
                      </>
                    ) : (
                      <>Regular price — the founding release is closed.</>
                    )}
                  </p>
                  <div className="mt-5">
                    <PurchaseCta slug={product.slug} name={product.name} size="md" className="w-full" />
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <FaqAccordion items={faqItems} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 10 · Final CTA                                                */}
      {/* ------------------------------------------------------------ */}
      <section
        aria-labelledby="final-cta-heading"
        className="bg-paper"
      >
        <div className="container-page py-20 sm:py-24 lg:py-32">
          <Reveal>
            <div className="relative overflow-hidden rounded-lg border border-accent/25 bg-accent-soft/60 px-6 py-14 text-center sm:px-10 lg:px-14 lg:py-20">
              {/* Hairline drafting corners — the house detail for offers */}
              <span aria-hidden="true" className="absolute left-5 top-5 h-3 w-3 border-l border-t border-accent/40" />
              <span aria-hidden="true" className="absolute right-5 top-5 h-3 w-3 border-r border-t border-accent/40" />
              <span aria-hidden="true" className="absolute bottom-5 left-5 h-3 w-3 border-b border-l border-accent/40" />
              <span aria-hidden="true" className="absolute bottom-5 right-5 h-3 w-3 border-b border-r border-accent/40" />

              <p className="text-eyebrow mx-auto mb-4">
                Veyra · {product.name}
              </p>
              <h2
                id="final-cta-heading"
                className="text-display-1 mx-auto max-w-2xl"
              >
                Your next stage of growth starts with a{" "}
                <span className="em-serif">better system.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lead">
                Bring your client acquisition, sales, delivery, and
                retention into one connected workflow.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <PurchaseCta slug={product.slug} name={product.name} />
                <Button href="#workflow" variant="outline" size="lg">
                  Explore the system
                </Button>
              </div>
              <p className="mt-6 text-xs text-ink-3">
                {formatPrice(price)} one-time · {REFUND_WINDOW_LABEL} ·
                Up to {MAX_SEATS} licensed seats per purchase
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
