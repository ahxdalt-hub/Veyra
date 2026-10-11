"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SystemPreview } from "@/components/product/system-preview";
import {
  DriveIcon,
  EyeOffIcon,
  InfinityIcon,
  ShieldIcon,
  SparkIcon,
  WifiOffIcon,
} from "@/components/ui/icons";
import { REFUND_WINDOW_LABEL } from "@/lib/site";

/**
 * Hero — Section A.
 * Concrete outcome-led copy: who it's for, what changes. One entrance
 * sequence (staggered rise+fade), a gentle float on the visual, and
 * reduced-motion fallbacks throughout.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.12, duration: 0.7, ease: EASE },
  }),
};

/** Compact trust micro-line placed directly under the primary CTA — it
 *  removes "what if I don't like it" hesitation at the exact moment of
 *  decision. Every item is honest and resolved from site config, so no
 *  claim here can drift from the product pages, cart, or refund policy. */
function TrustRow() {
  return (
    <p className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-3">
      <span className="inline-flex items-center gap-1.5">
        <InfinityIcon className="h-3.5 w-3.5 text-accent" />
        One-time payment
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ShieldIcon className="h-3.5 w-3.5 text-accent" />
        {REFUND_WINDOW_LABEL}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <SparkIcon className="h-3.5 w-3.5 text-accent" />
        Updates included
      </span>
      <span className="inline-flex items-center gap-1.5">
        <WifiOffIcon className="h-3.5 w-3.5 text-accent" />
        Works offline
      </span>
    </p>
  );
}

export function Hero() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <section className="relative overflow-hidden border-b border-line">
        <div className="container-page py-16 text-center sm:py-24">
          <p className="text-eyebrow mb-5">For freelancers, consultants & small agencies</p>
          <h1 className="text-display-hero mx-auto max-w-4xl">
            A local-first business operating system<br />
            you actually own.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lead">
            No monthly fees. No cloud dependencies. Your data lives on your computer, not in someone else&apos;s CRM database. One-time purchase for Windows &amp; macOS.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/products/client-growth-system" variant="accent" size="lg" arrow>
              Get Lifetime Access
            </Button>
            <Button href="#collection" variant="outline" size="lg">
              See the collection
            </Button>
          </div>
          <TrustRow />

          
          {/* SEO: keyword-rich paragraph */}
          <div className="mt-8 text-left max-w-2xl bg-accent-soft/30 rounded-lg p-6 border border-accent/20">
            <p className="font-semibold text-accent-ink mb-3">Why choose Veyra over cloud CRMs?</p>
            <ul className="space-y-2 text-sm text-ink-3">
              <li className="flex items-center gap-2.5">
                <DriveIcon className="h-4 w-4 shrink-0 text-accent" />
                <span><strong className="font-medium text-ink">Local-first</strong> = your data, your computer, always accessible</span>
              </li>
              <li className="flex items-center gap-2.5">
                <WifiOffIcon className="h-4 w-4 shrink-0 text-accent" />
                <span><strong className="font-medium text-ink">Works offline</strong> = no internet dependency for daily use</span>
              </li>
              <li className="flex items-center gap-2.5">
                <InfinityIcon className="h-4 w-4 shrink-0 text-accent" />
                <span><strong className="font-medium text-ink">Lifetime deal</strong> = one payment, forever access</span>
              </li>
              <li className="flex items-center gap-2.5">
                <EyeOffIcon className="h-4 w-4 shrink-0 text-accent" />
                <span><strong className="font-medium text-ink">Privacy-focused</strong> = no data mining, no selling your client info</span>
              </li>
            </ul>
          </div>
          
          <div className="mt-16 sm:mt-20">
            <SystemPreview />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Faint drafting grid — texture, not decoration */}
      <div className="absolute inset-0 bg-blueprint-faint [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_75%)]" aria-hidden="true" />

      <div className="container-page relative py-16 text-center sm:py-24 lg:py-28">
        <motion.p
          custom={0}
          variants={rise}
          initial="hidden"
          animate="visible"
          className="text-eyebrow mx-auto mb-5 inline-block"
        >
          For freelancers, consultants & small agencies
        </motion.p>
        <motion.h1
          custom={1}
          variants={rise}
          initial="hidden"
          animate="visible"
          className="text-display-hero mx-auto max-w-4xl"
        >
          A local-first business operating system<br />
          you actually own.
        </motion.h1>
        <motion.p
          custom={2}
          variants={rise}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-6 max-w-xl text-lead"
        >
          No monthly fees. No cloud dependencies. Your data lives on your computer,
          not in someone else&apos;s CRM database. One-time purchase for Windows &amp; macOS.
        </motion.p>
        <motion.div
          custom={3}
          variants={rise}
          initial="hidden"
          animate="visible"
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button href="/products/client-growth-system" variant="accent" size="lg" arrow>
            Get Lifetime Access
          </Button>
          <Button href="#collection" variant="outline" size="lg">
            See the collection
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: EASE }}
        >
          <TrustRow />
        </motion.div>

        {/* SEO: keyword-rich paragraph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: EASE }}
          className="mt-8 text-left max-w-2xl mx-auto bg-accent-soft/30 rounded-lg p-6 border border-accent/20 shadow-sm"
        >
          <p className="font-semibold text-accent-ink mb-3">Why choose Veyra over cloud CRMs?</p>
          <ul className="space-y-2 text-sm text-ink-3">
            <li className="flex items-center gap-2.5">
              <DriveIcon className="h-4 w-4 shrink-0 text-accent" />
              <span><strong className="font-medium text-ink">Local-first</strong> = your data, your computer, always accessible</span>
            </li>
            <li className="flex items-center gap-2.5">
              <WifiOffIcon className="h-4 w-4 shrink-0 text-accent" />
              <span><strong className="font-medium text-ink">Works offline</strong> = no internet dependency for daily use</span>
            </li>
            <li className="flex items-center gap-2.5">
              <InfinityIcon className="h-4 w-4 shrink-0 text-accent" />
              <span><strong className="font-medium text-ink">Lifetime deal</strong> = one payment, forever access</span>
            </li>
            <li className="flex items-center gap-2.5">
              <EyeOffIcon className="h-4 w-4 shrink-0 text-accent" />
              <span><strong className="font-medium text-ink">Privacy-focused</strong> = no data mining, no selling your client info</span>
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.9, ease: EASE }}
          className="mt-16 sm:mt-20"
        >
          <SystemPreview />
        </motion.div>
      </div>
    </section>
  );
}
