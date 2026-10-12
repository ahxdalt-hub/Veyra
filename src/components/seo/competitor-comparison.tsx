"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckIcon, CloseIcon, ShieldIcon, WifiOffIcon, InfinityIcon } from "@/components/ui/icons";
import { EASE } from "@/lib/motion";

const comparisonData = [
  {
    feature: "Where your data lives",
    veyra: "On your computer — encrypted, fully yours",
    competitor: "On their servers — under their terms",
    veyraAdvantage: true,
  },
  {
    feature: "Internet access required",
    veyra: "Once, for activation — then fully offline",
    competitor: "Every time you open your business",
    veyraAdvantage: true,
  },
  {
    feature: "Pricing model",
    veyra: "One-time purchase ($79 founding / $149 regular)",
    competitor: "Recurring subscription, priced per month",
    veyraAdvantage: true,
  },
  {
    feature: "Cancellation policy",
    veyra: "Yours to keep — nothing to cancel",
    competitor: "Stop paying and access ends",
    veyraAdvantage: true,
  },
  {
    feature: "Cost over three years",
    veyra: "$79–$149, paid once",
    competitor: "$1,080–$7,200 (36 months of subscription)",
    veyraAdvantage: true,
  },
  {
    feature: "Data portability",
    veyra: "Full ownership — export anytime, in standard formats",
    competitor: "Export is limited to what the platform allows",
    veyraAdvantage: true,
  },
  {
    feature: "Offline capability",
    veyra: "Full functionality with no connection",
    competitor: "Requires an active connection",
    veyraAdvantage: true,
  },
  {
    feature: "Third-party access",
    veyra: "Your data stays on your machine",
    competitor: "Governed by the provider's privacy policy",
    veyraAdvantage: true,
  },
];

export function CompetitorComparison() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative border-t border-line bg-paper py-20 sm:py-24 lg:py-28">
      <div className="container-page">
        {/* Header */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center"
        >
          <p className="text-eyebrow mb-3">Local-First Advantage</p>
          <h2 className="text-display-1 max-w-3xl mx-auto">
            Why your data should live on<span className="font-serif italic text-accent"> your computer</span>, not their servers.
          </h2>
          <p className="mt-5 text-lg text-ink-3 max-w-2xl mx-auto">
            Cloud CRMs rent you access and hold your data on their terms. Veyra is installed once and owned outright. Here's what local-first changes.
          </p>
        </motion.div>

        {/* Comparison Table */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 30 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
          className="mt-14 overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
        >
          <div className="grid grid-cols-[auto_1fr_1fr] gap-px bg-line">
            {/* Header Row */}
            <div className="bg-surface px-6 py-5 text-sm font-semibold text-ink flex items-center">
              Feature
            </div>
            <div className="bg-gradient-to-br from-moss/10 to-accent-soft/30 px-6 py-5 text-center">
              <p className="text-display font-semibold text-moss">Veyra (Local-First)</p>
              <p className="mt-1 text-xs text-ink-3">Your data · Your computer · Forever</p>
            </div>
            <div className="bg-red-50 px-6 py-5 text-center">
              <p className="text-display font-semibold text-red-700">Cloud CRMs</p>
              <p className="mt-1 text-xs text-ink-3">Subscription software · Monthly fees</p>
            </div>

            {/* Comparison Rows */}
            {comparisonData.map((row, index) => (
              <motion.div
                key={row.feature}
                initial={reduceMotion ? undefined : { opacity: 0, x: -10 }}
                animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.2 + index * 0.04 }}
                className={`grid grid-cols-[1fr_1fr_1fr] ${
                  index % 2 === 0 ? "bg-surface" : "bg-surface/70"
                }`}
              >
                {/* Feature Name */}
                <div className="px-6 py-5">
                  <p className="font-medium text-ink">{row.feature}</p>
                </div>

                {/* Veyra Column */}
                <div className="px-6 py-5 flex items-center justify-center">
                  <div className="text-center">
                    <CheckIcon className="mx-auto mb-1 h-5 w-5 text-moss" />
                    <p className="text-sm font-medium text-moss-dark">{row.veyra}</p>
                  </div>
                </div>

                {/* Competitor Column */}
                <div className="px-6 py-5 flex items-center justify-center">
                  <div className="text-center">
                    <CloseIcon className="mx-auto mb-1 h-5 w-5 text-red-500" />
                    <p className="text-sm text-ink-3 line-through">{row.competitor}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Money-Saved Calculator Teaser */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
          className="mt-12 rounded-lg border border-moss/25 bg-gradient-to-br from-moss/20 to-accent-soft/40 p-8 text-center shadow-lg"
        >
          <p className="text-2xl font-display font-semibold text-moss-dark">
            Own it in three years for the price of a few months of subscription
          </p>
          <p className="mt-3 text-sm text-ink-3 max-w-xl mx-auto">
            A typical CRM runs $30–$200 a month — $1,080 to $7,200 over three years. Veyra is a single one-time payment, and the system stays yours.
          </p>
        </motion.div>

        {/* Privacy Highlight Section */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.6 }}
          className="mt-12 grid gap-6 md:grid-cols-3"
        >
          {[
            {
              icon: ShieldIcon,
              title: "Encrypted local storage",
              desc: "Your data lives on your device in encrypted files — never scanned by a third party, mined, or used for targeting.",
              highlight: true,
            },
            {
              icon: WifiOffIcon,
              title: "Works offline, permanently",
              desc: "Business happens everywhere — airports, cafés, travel. Run the full system with no connection required.",
              highlight: false,
            },
            {
              icon: InfinityIcon,
              title: "Owned outright",
              desc: "Buy once, use forever. Export anytime in standard formats. No subscription, no lock-in, no renewals.",
              highlight: false,
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }}
              className={`rounded-xl border p-6 ${
                item.highlight
                  ? "border-moss/40 bg-moss/10 shadow-md"
                  : "border-line bg-surface"
              }`}
            >
              <span
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-sm border ${
                  item.highlight
                    ? "border-moss/40 bg-surface"
                    : "border-line bg-paper"
                }`}
              >
                <item.icon
                  className={`h-5 w-5 ${item.highlight ? "text-moss-dark" : "text-accent"}`}
                />
              </span>
              <h3 className="font-display font-semibold text-ink mb-2">{item.title}</h3>
              <p className="text-sm text-ink-3 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* SEO Keyword Content - Hidden but accessible */}
        <div className="mt-12 text-sm text-ink-3 hidden">
          <p className="mb-2 font-medium text-ink">Local-first software alternatives:</p>
          <p>
            Searching for offline CRM, local database software, desktop business OS, or privacy-focused customer management? 
            Veyra replaces cloud-based solutions like HubSpot, Salesforce, Pipedrive, Freshsales, and Zoho CRM with a truly 
            local-first alternative. Your customer data stays encrypted on your Windows or Mac computer — never uploaded to 
            third-party servers, never sold to data brokers, never used for ad targeting.
          </p>
        </div>
      </div>
    </section>
  );
}
