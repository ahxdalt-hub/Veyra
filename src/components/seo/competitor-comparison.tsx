"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import { EASE } from "@/lib/motion";

const comparisonData = [
  {
    feature: "Where Your Data Lives",
    veyra: "Your computer — fully encrypted, fully yours",
    competitor: "Their servers — potentially sold to data brokers",
    veyraAdvantage: true,
  },
  {
    feature: "Internet Access Required",
    veyra: "Only for initial activation — works offline forever",
    competitor: "Every single time you want to access your business",
    veyraAdvantage: true,
  },
  {
    feature: "Pricing Model",
    veyra: "One-time purchase ($79 founding / $149 regular)",
    competitor: "$30-200/month forever (rented access)",
    veyraAdvantage: true,
  },
  {
    feature: "Cancellation Policy",
    veyra: "You own it — no cancellations needed",
    competitor: "Stop paying = lose ALL your data immediately",
    veyraAdvantage: true,
  },
  {
    feature: "Price Over 3 Years",
    veyra: "$79–$149 one-time",
    competitor: "$10,800–$72,000+ monthly subscriptions",
    veyraAdvantage: true,
  },
  {
    feature: "Data Ownership Rights",
    veyra: "Full ownership — export anytime, move anywhere",
    competitor: "Limited export rights, often in unusable formats",
    veyraAdvantage: true,
  },
  {
    feature: "Offline Capability",
    veyra: "Full functionality without internet",
    competitor: "Completely broken offline",
    veyraAdvantage: true,
  },
  {
    feature: "Third-Party Access",
    veyra: "No one else can scan or mine your data",
    competitor: "They analyze your data to sell ads/improve models",
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
            Cloud CRMs rent you access and own your data. Veyra gives you complete control. Here's how being local-first changes everything.
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
              <p className="mt-1 text-xs text-ink-3">Hosted rentals · Monthly fees</p>
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
            Save $10,000+ over 3 years · Complete privacy guaranteed
          </p>
          <p className="mt-3 text-sm text-ink-3 max-w-xl mx-auto">
            While cloud subscriptions slowly drain your budget and own your customer data, you get full ownership with Veyra for a one-time payment that's less than ONE month of HubSpot's basic plan.
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
              title: "🔒 Encrypted Local Storage",
              desc: "Your data lives on your device in encrypted files. No third-party server scanning, no ad targeting, no data mining.",
              highlight: true,
            },
            {
              title: "🌐 Works Offline Forever",
              desc: "Business happens everywhere — airports, coffee shops, travel. Access your full system without worrying about connectivity.",
              highlight: false,
            },
            {
              title: "💰 True Ownership Rights",
              desc: "Buy once, use forever. Export your data anytime in standard formats. Never locked into their ecosystem again.",
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
