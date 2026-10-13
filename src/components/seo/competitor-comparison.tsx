import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import {
  CheckIcon,
  CloseIcon,
  InfinityIcon,
  ShieldIcon,
  WifiOffIcon,
} from "@/components/ui/icons";

/**
 * Local-First Advantage — Veyra vs Cloud CRMs.
 *
 * Rebuilt on the shared house primitives (Reveal / Stagger / StaggerItem +
 * SectionHead) instead of hand-rolled framer-motion. That matters for more
 * than tidiness: the previous version branched JSX directly on
 * useReducedMotion(), which the reveal primitive documents as a hydration
 * hazard (SSR and first client render diverge, freezing content at opacity
 * 0). Reveal gates the swap until after hydration, so reduced-motion users
 * get plain, immediately-visible markup.
 *
 * Design follows the editorial system: warm paper + one bronze accent,
 * hairline rules, restrained shadows, and NO gradients or glow. Only tokens
 * defined in globals.css are used (accent, accent-soft, ink-*, line*).
 *
 * Layout: a single grid template is shared by the header row and every data
 * row so the three columns line up exactly; the Veyra column reads as a
 * continuous tinted "this is ours" rail with accent checks, while the Cloud
 * CRM column stays muted. On mobile the grid collapses to stacked blocks
 * that carry their own labels. The 3-year cost is reframed as a stat
 * contrast, and a hidden SEO block keeps the long-tail keywords crawlable.
 */

const comparisonData = [
  {
    feature: "Where your data lives",
    veyra: "On your computer — encrypted, fully yours",
    competitor: "On their servers — under their terms",
  },
  {
    feature: "Internet access required",
    veyra: "Once, for activation — then fully offline",
    competitor: "Every time you open your business",
  },
  {
    feature: "Pricing model",
    veyra: "One-time purchase ($79 founding / $149 regular)",
    competitor: "Recurring subscription, priced per month",
  },
  {
    feature: "Cancellation policy",
    veyra: "Yours to keep — nothing to cancel",
    competitor: "Stop paying and access ends",
  },
  {
    feature: "Cost over three years",
    veyra: "$79–$149, paid once",
    competitor: "$1,080–$7,200 (36 months of subscription)",
  },
  {
    feature: "Data portability",
    veyra: "Full ownership — export anytime, in standard formats",
    competitor: "Export is limited to what the platform allows",
  },
  {
    feature: "Offline capability",
    veyra: "Full functionality with no connection",
    competitor: "Requires an active connection",
  },
  {
    feature: "Third-party access",
    veyra: "Your data stays on your machine",
    competitor: "Governed by the provider's privacy policy",
  },
];

const highlights = [
  {
    icon: ShieldIcon,
    title: "Encrypted local storage",
    desc: "Your data lives on your device in encrypted files — never scanned by a third party, mined, or used for targeting.",
  },
  {
    icon: WifiOffIcon,
    title: "Works offline, permanently",
    desc: "Business happens everywhere — airports, cafés, travel. Run the full system with no connection required.",
  },
  {
    icon: InfinityIcon,
    title: "Owned outright",
    desc: "Buy once, use forever. Export anytime in standard formats. No subscription, no lock-in, no renewals.",
  },
];

/* One grid template, reused by the header row and every data row, so the
   three columns align. minmax(0, …) lets long copy wrap instead of forcing
   the grid wider. */
const GRID =
  "grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]";

export function CompetitorComparison() {
  return (
    <section className="border-t border-line bg-paper py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        {/* Header */}
        <Reveal>
          <SectionHead
            align="center"
            eyebrow="Local-First Advantage"
            title={
              <>
                Why your data should live on{" "}
                <span className="em-serif text-accent">your computer</span>, not
                their servers.
              </>
            }
            lead="Cloud CRMs rent you access and hold your data on their terms. Veyra is installed once and owned outright. Here's what local-first changes."
          />
        </Reveal>

        {/* Comparison */}
        <Reveal delay={0.12}>
          <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-lg border border-line-strong bg-surface shadow-sm">
            {/* Header row — hidden on mobile; stacked rows carry their own labels */}
            <div className={`${GRID} hidden border-b border-line-strong bg-paper md:grid`}>
              <div className="px-6 py-4">
                <span className="text-eyebrow">Feature</span>
              </div>
              <div className="border-x border-accent/15 bg-accent-soft/70 px-6 py-4">
                <p className="font-display text-base font-semibold text-accent-ink">
                  Veyra · Local-First
                </p>
                <p className="mt-0.5 text-xs text-ink-3">
                  Your data · Your computer · Forever
                </p>
              </div>
              <div className="px-6 py-4">
                <p className="font-display text-base font-semibold text-ink-2">
                  Cloud CRMs
                </p>
                <p className="mt-0.5 text-xs text-ink-3">
                  Subscription software · Monthly fees
                </p>
              </div>
            </div>

            {/* Data rows */}
            <Stagger step={0.04}>
              {comparisonData.map((row) => (
                <StaggerItem key={row.feature}>
                  <div
                    className={`${GRID} items-center border-b border-line px-6 py-5 last:border-b-0 md:px-0`}
                  >
                    {/* Feature */}
                    <div className="md:px-6">
                      <span className="text-eyebrow mb-2 block md:hidden">
                        Feature
                      </span>
                      <p className="font-medium text-ink">{row.feature}</p>
                    </div>

                    {/* Veyra — hero column: tinted + ruled so it reads as "ours" */}
                    <div className="mt-3 flex items-start gap-2.5 border-x-0 border-accent/15 bg-accent-soft/40 px-4 py-3 md:mt-0 md:border-x md:px-6 md:py-0">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <div>
                        <span className="text-eyebrow mb-1 block md:hidden">
                          Veyra
                        </span>
                        <p className="text-sm leading-relaxed text-ink">
                          {row.veyra}
                        </p>
                      </div>
                    </div>

                    {/* Competitor — muted, no strikethrough */}
                    <div className="mt-2 flex items-start gap-2.5 px-4 py-2 md:mt-0 md:px-6 md:py-0">
                      <CloseIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
                      <div>
                        <span className="text-eyebrow mb-1 block md:hidden">
                          Cloud CRM
                        </span>
                        <p className="text-sm leading-relaxed text-ink-3">
                          {row.competitor}
                        </p>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </Reveal>

        {/* Money teaser — cost reframed as a stat contrast, flat tint */}
        <Reveal delay={0.15}>
          <div className="mx-auto mt-12 max-w-3xl rounded-lg border border-accent/25 bg-accent-soft px-8 py-8">
            <p className="text-center font-display text-display-2 text-accent-ink">
              Own it in three years for the price of a few months of
              subscription
            </p>
            <div className="mt-7 grid grid-cols-2 gap-4">
              <div className="rounded-md border border-line bg-surface px-4 py-5 text-center">
                <p className="text-eyebrow">Veyra</p>
                <p className="tnum mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">
                  $79–$149
                </p>
                <p className="mt-1 text-xs text-ink-3">Paid once · yours to keep</p>
              </div>
              <div className="rounded-md border border-line bg-surface px-4 py-5 text-center">
                <p className="text-eyebrow">Cloud CRM</p>
                <p className="tnum mt-1 font-display text-2xl font-semibold text-ink-2 sm:text-3xl">
                  $1,080–$7,200
                </p>
                <p className="mt-1 text-xs text-ink-3">36 months of subscription</p>
              </div>
            </div>
            <p className="mx-auto mt-6 max-w-xl text-sm text-ink-3">
              A typical CRM runs $30–$200 a month — $1,080 to $7,200 over three
              years. Veyra is a single one-time payment, and the system stays
              yours.
            </p>
          </div>
        </Reveal>

        {/* Privacy highlights */}
        <Stagger className="mt-12 grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <StaggerItem key={item.title}>
              <div className="flex h-full flex-col rounded-lg border border-line bg-surface p-6">
                <span
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-paper"
                  aria-hidden
                >
                  <item.icon className="h-5 w-5 text-accent" />
                </span>
                <h3 className="mb-2 font-display text-[1.0625rem] font-medium text-ink">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink-3">{item.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* SEO Keyword Content — accessible, visually hidden */}
        <div className="mt-12 hidden text-sm text-ink-3">
          <p className="mb-2 font-medium text-ink">Local-first software alternatives:</p>
          <p>
            Searching for offline CRM, local database software, desktop business
            OS, or privacy-focused customer management? Veyra replaces
            cloud-based solutions like HubSpot, Salesforce, Pipedrive,
            Freshsales, and Zoho CRM with a truly local-first alternative. Your
            customer data stays encrypted on your Windows or Mac computer —
            never uploaded to third-party servers, never sold to data brokers,
            never used for ad targeting.
          </p>
        </div>
      </div>
    </section>
  );
}