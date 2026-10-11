"use client";

import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import {
  DriveIcon,
  EyeOffIcon,
  InfinityIcon,
  WifiOffIcon,
} from "@/components/ui/icons";
import { faqPageJsonLd, type FaqEntry } from "@/lib/seo";
import { PurchaseCta } from "@/components/cgs/purchase-cta";
import { REFUND_WINDOW_LABEL } from "@/lib/site";

/**
 * WhyOverCloud — the "own it vs. rent it" positioning block, rebuilt to
 * convert a visitor who arrives mid-page (from the audit, an ad, or a
 * competitor comparison) and has no idea what Veyra is yet.
 *
 * Three moves, top to bottom:
 *   1. Orient — one line stating exactly what & where they are, so nobody
 *      has to scroll back to the hero to understand the product.
 *   2. Prove — a "Cloud CRM vs Veyra" comparison that makes the local /
 *      offline / one-time / private value obvious at a glance.
 *   3. Act — an inline add-to-cart button, so a convinced buyer can buy
 *      right here instead of scrolling back up to pricing.
 *
 * Four differentiator cards + the comparison rows also render as FAQPage
 * JSON-LD so answer engines can cite them; every Q&A is visible on the
 * page (policy-compliant). All copy is honest — no fabricated proof.
 */

type Reason = {
  icon: typeof DriveIcon;
  /** Short, scannable benefit — the search-targeted phrase. */
  claim: string;
  /** One-sentence proof. */
  body: string;
  /** The FAQ question this row answers (drives the JSON-LD). */
  q: string;
  /** The FAQ answer — fuller than `body`, still honest and concrete. */
  a: string;
};

const reasons: Reason[] = [
  {
    icon: DriveIcon,
    claim: "Local-first — your data stays on your computer",
    body: "Clients, deals, and notes live in a file you own, not on someone else's server you rent access to.",
    q: "Is the Client Growth System a local-first CRM?",
    a: "Yes. The Client Growth System is a local-first CRM: your clients, pipeline, proposals, and notes are stored in a workspace file on your own Windows or Mac computer. Nothing is hosted on someone else's server, so you are never renting access to your own business data.",
  },
  {
    icon: WifiOffIcon,
    claim: "Works offline — no internet needed day to day",
    body: "Run your whole workflow on a plane, in a dead zone, or anywhere the Wi-Fi drops. Only activation checks the network.",
    q: "Does the CRM work offline without an internet connection?",
    a: "Yes. After a one-time licence activation, the Client Growth System runs fully offline. Your daily workflow — prospecting, pipeline, proposals, delivery — never depends on an internet connection. Only initial activation and occasional licence checks need to be online.",
  },
  {
    icon: InfinityIcon,
    claim: "Lifetime deal — one payment, own it forever",
    body: "A single one-time purchase with no subscription, no per-seat renewal, and no feature held hostage behind a monthly fee.",
    q: "Is there a one-time purchase option instead of a subscription?",
    a: "Yes. The Client Growth System is sold as a one-time purchase — pay once and own that version for life. There is no monthly subscription, no recurring per-seat fee, and no feature locked behind an upgrade tier. Future major versions, if released, are priced separately and never forced.",
  },
  {
    icon: EyeOffIcon,
    claim: "Privacy-focused — no data mining, ever",
    body: "Your client information is never sold, scraped, or used to train anyone's model. What's on your machine stays on your machine.",
    q: "Is my client data private and free from data mining?",
    a: "Yes. Because your data is stored locally and never uploaded, there is no data mining, no resale of client information, and no use of your data to train third-party models. Your client list, deal values, and communications stay private on your own computer.",
  },
];

/**
 * The comparison — the clearest way to make "own vs. rent" obvious.
 * Each row contrasts a typical subscription cloud CRM with Veyra.
 * `true` marks the Veyra column as the advantage (renders a check),
 * `false` marks the cloud-CRM downside (renders a muted cross).
 */
type CompareRow = {
  dimension: string;
  cloud: string;
  veyra: string;
  veyraWins: boolean;
};

const compareRows: CompareRow[] = [
  {
    dimension: "Cost",
    cloud: "A monthly fee, per seat, forever",
    veyra: "One-time payment — you own it",
    veyraWins: true,
  },
  {
    dimension: "Where your data lives",
    cloud: "On their servers — you rent access",
    veyra: "On your computer — a file you own",
    veyraWins: true,
  },
  {
    dimension: "Works offline",
    cloud: "No — it needs the internet",
    veyra: "Yes — fully offline day to day",
    veyraWins: true,
  },
  {
    dimension: "Your privacy",
    cloud: "Data mined, resold, or used to train models",
    veyra: "Never sold, mined, or shared",
    veyraWins: true,
  },
  {
    dimension: "If you stop paying",
    cloud: "Access to your own data can end",
    veyra: "Nothing changes — it's yours for life",
    veyraWins: true,
  },
];

export function WhyOverCloud({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const faqEntries: FaqEntry[] = [
    ...reasons.map((r) => ({ q: r.q, a: r.a })),
    {
      q: "How is a local-first desktop CRM different from a cloud CRM?",
      a: "A cloud CRM stores your data on the provider's servers and charges a recurring subscription for access, and it usually needs an internet connection. A local-first desktop CRM like the Client Growth System keeps all your data in a file on your own computer, works offline, is sold as a one-time purchase you own, and never mines, resells, or shares your client information.",
    },
  ];

  return (
    <section className="border-b border-line bg-surface" aria-labelledby="why-over-cloud-title">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        {/* Orient — state plainly what & where they are, so no one has to
            scroll back to the hero to understand the product. */}
        <Reveal>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink-2">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            You&rsquo;re viewing the{" "}
            <strong className="font-medium text-ink">Client Growth System</strong> — Veyra&rsquo;s
            local-first business OS for freelancers, consultants &amp; small agencies.
          </p>
        </Reveal>

        <Reveal>
          <SectionHead
            eyebrow="Own it vs. rent it"
            title={
              <span id="why-over-cloud-title">
                Why choose Veyra over cloud-based CRMs?
              </span>
            }
            lead="Subscription CRMs charge you every month to keep access to data you created. Veyra inverts that: a local-first desktop system you buy once and truly own."
          />
        </Reveal>

        {/* Prove — the comparison that makes the value obvious at a glance. */}
        <Reveal delay={0.08}>
          <div className="mt-12 overflow-hidden rounded-lg border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                A typical cloud CRM compared with the Veyra Client Growth System.
              </caption>
              <thead>
                <tr className="bg-paper">
                  <th scope="col" className="w-[28%] px-5 py-3.5 align-bottom">
                    <span className="sr-only">Dimension</span>
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide text-ink-4">
                    Typical cloud CRM
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-xs font-medium uppercase tracking-wide text-accent">
                    Veyra · Client Growth System
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.dimension} className="border-t border-line">
                    <th scope="row" className="px-5 py-4 align-top font-medium text-ink">
                      {row.dimension}
                    </th>
                    <td className="px-5 py-4 align-top text-ink-3">
                      <span className="flex items-start gap-2">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        {row.cloud}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top text-ink">
                      <span className="flex items-start gap-2">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        {row.veyra}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Stagger className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {reasons.map((r) => (
            <StaggerItem key={r.claim} className="flex gap-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line bg-paper"
                aria-hidden
              >
                <r.icon className="h-5 w-5 text-accent" />
              </span>
              <div>
                <h3 className="text-[1.0625rem] font-medium text-ink">{r.claim}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-3">{r.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Act — buy right here, no scrolling back to pricing. */}
        <Reveal delay={0.1}>
          <div className="mt-14 rounded-lg border border-accent/25 bg-accent-soft/60 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-medium text-ink">
                  Own the system, not a subscription.
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-2">
                  One-time payment · {REFUND_WINDOW_LABEL} · updates included · works offline. Add it
                  to your cart right here — no need to scroll.
                </p>
              </div>
              <PurchaseCta slug={slug} name={name} />
            </div>
          </div>
        </Reveal>
      </div>

      {/* FAQ structured data — same Q&A, machine-readable for search and
          answer engines. Visible content above is the source of truth. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(faqEntries)) }}
      />
    </section>
  );
}
