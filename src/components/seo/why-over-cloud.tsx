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

/**
 * WhyOverCloud — the "own it vs. rent it" positioning block.
 *
 * Four real differentiators against subscription CRMs, each with a
 * purpose-built glyph (no keyboard emoji — consistent with the 16px
 * icon set) and SEO copy that targets the exact phrasing buyers search:
 * "local-first CRM", "offline CRM", "one-time CRM", "private CRM".
 *
 * The same data renders as FAQPage JSON-LD so answer engines can cite it
 * directly; every Q&A is also visible on the page (policy-compliant).
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

export function WhyOverCloud() {
  const faqEntries: FaqEntry[] = reasons.map((r) => ({ q: r.q, a: r.a }));

  return (
    <section className="border-b border-line bg-surface" aria-labelledby="why-over-cloud-title">
      <div className="container-page py-20 sm:py-24 lg:py-28">
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
