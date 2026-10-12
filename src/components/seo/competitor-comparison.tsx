"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckIcon, CloseIcon, ShieldIcon, WifiOffIcon, InfinityIcon } from "@/components/ui/icons";
import { EASE } from "@/lib/motion";

/**
 * Local-First Advantage — Veyra vs Cloud CRMs.
 *
 * Design notes (this section previously rendered broken/unstyled):
 *  - Uses ONLY tokens that exist in globals.css (accent, accent-soft, ink-*,
 *    line). The old version referenced `moss`/`moss-dark`/`text-display`,
 *    which are NOT defined, so those cells silently rendered with no color —
 *    the real reason it looked flat and misaligned, not the icons.
 *  - A single, identical grid template is applied to the header row and every
 *    data row so the three columns line up exactly (the old header used
 *    `auto_1fr_1fr` while rows used `1fr_1fr_1fr`, which never aligned).
 *  - No gradients / glow / strikethrough — the system is editorial + restrained.
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

/* One template, reused by the header row and every data row, so columns align.
   minmax(0, …) lets long copy wrap instead of forcing the grid wider. */
const GRID = "grid grid-cols-1 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]";

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
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-eyebrow mb-3">Local-First Advantage</p>
          <h2 className="text-display-1">
            Why your data should live on
            <span className="font-serif italic text-accent"> your computer</span>, not their servers.
          </h2>
          <p className="mt-5 text-lg text-ink-3">
            Cloud CRMs rent you access and hold your data on their terms. Veyra is installed once and
            owned outright. Here&apos;s what local-first changes.
          </p>
        </motion.div>

        {/* Comparison table */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 30 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
          className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-lg border border-line-strong bg-surface shadow-sm"
        >
          {/* Header row — hidden on mobile (stacked cards carry their own labels) */}
          <div className={`${GRID} hidden border-b border-line-strong bg-paper md:grid`}>
            <div className="px-6 py-4">
              <span className="text-eyebrow">Feature</span>
            </div>
            <div className="border-x border-line bg-accent-soft/60 px-6 py-4">
              <p className="font-display text-base font-semibold text-accent-ink">Veyra (Local-First)</p>
              <p className="mt-0.5 text-xs text-ink-3">Your data · Your computer · Forever</p>
            </div>
            <div className="px-6 py-4">
              <p className="font-display text-base font-semibold text-ink-2">Cloud CRMs</p>
              <p className="mt-0.5 text-xs text-ink-3">Subscription software · Monthly fees</p>
            </div>
          </div>

          {/* Data rows */}
          {comparisonData.map((row, index) => (
            <motion.div
              key={row.feature}
              initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.2 + index * 0.04 }}
              className={`${GRID} items-center border-b border-line px-6 py-5 last:border-b-0 md:px-0`}
            >
              {/* Feature */}
              <div className="md:px-6">
                <span className="text-eyebrow mb-2 block md:hidden">Feature</span>
                <p className="font-medium text-ink">{row.feature}</p>
              </div>

              {/* Veyra — hero column, tinted + ruled so it reads as "ours" */}
              <div className="mt-3 flex items-start gap-2.5 border-x-0 border-line bg-accent-soft/40 px-4 py-3 md:mt-0 md:border-x md:bg-transparent md:px-6 md:py-0">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div>
                  <span className="text-eyebrow mb-1 block md:hidden">Veyra</span>
                  <p className="text-sm leading-relaxed text-ink">{row.veyra}</p>
                </div>
              </div>

              {/* Competitor — muted, no strikethrough */}
              <div className="mt-2 flex items-start gap-2.5 px-4 py-2 md:mt-0 md:px-6 md:py-0">
                <CloseIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
                <div>
                  <span className="text-eyebrow mb-1 block md:hidden">Cloud CRM</span>
                  <p className="text-sm leading-relaxed text-ink-3">{row.competitor}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Money teaser — flat tint, no gradient */}
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
          className="mx-auto mt-12 max-w-3xl rounded-lg border border-accent/25 bg-accent-soft px-8 py-8 text-center"
        >
          <p className="text-display-2 text-accent-ink">
            Own it in three years for the price of a few months of subscription
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-3">
            A typical CRM runs $30–$200 a month — $1,080 to $7,200 over three years. Veyra is a single
            one-time payment, and the system stays yours.
          </p>
        </motion.div>

        {/* Privacy highlights */}
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
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }}
              className={`rounded-lg border p-6 ${
                item.highlight ? "border-accent/30 bg-accent-soft/50" : "border-line bg-surface"
              }`}
            >
              <span
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-sm border ${
                  item.highlight ? "border-accent/30 bg-surface" : "border-line bg-paper"
                }`}
              >
                <item.icon className="h-5 w-5 text-accent" />
              </span>
              <h3 className="mb-2 font-display text-[1.0625rem] font-medium text-ink">{item.title}</h3>
              <p className="text-sm leading-relaxed text-ink-3">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* SEO Keyword Content — accessible, visually hidden */}
        <div className="mt-12 hidden text-sm text-ink-3">
          <p className="mb-2 font-medium text-ink">Local-first software alternatives:</p>
          <p>
            Searching for offline CRM, local database software, desktop business OS, or privacy-focused
            customer management? Veyra replaces cloud-based solutions like HubSpot, Salesforce, Pipedrive,
            Freshsales, and Zoho CRM with a truly local-first alternative. Your customer data stays
            encrypted on your Windows or Mac computer — never uploaded to third-party servers, never sold
            to data brokers, never used for ad targeting.
          </p>
        </div>
      </div>
    </section>
  );
}

