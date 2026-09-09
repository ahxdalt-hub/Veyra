"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SystemPreview } from "@/components/product/system-preview";

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

export function Hero() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <section className="relative overflow-hidden border-b border-line">
        <div className="container-page py-16 text-center sm:py-24">
          <p className="text-eyebrow mb-5">For consultants & independent studios</p>
          <h1 className="text-display-hero mx-auto max-w-4xl">
            Stop reinventing how you get clients.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lead">
            Ready-to-use business systems for lead management, outreach,
            follow-up, and onboarding — built as Notion and Google Sheets
            workspaces you can put into action the same day.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/shop" variant="accent" size="lg" arrow>
              Browse the systems
            </Button>
            <Button href="#featured" variant="outline" size="lg">
              See what&rsquo;s inside
            </Button>
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
          For consultants & independent studios
        </motion.p>
        <motion.h1
          custom={1}
          variants={rise}
          initial="hidden"
          animate="visible"
          className="text-display-hero mx-auto max-w-4xl"
        >
          Stop reinventing how you get clients.
        </motion.h1>
        <motion.p
          custom={2}
          variants={rise}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-6 max-w-xl text-lead"
        >
          Ready-to-use business systems for lead management, outreach,
          follow-up, and onboarding — built as Notion and Google Sheets
          workspaces you can put into action the same day.
        </motion.p>
        <motion.div
          custom={3}
          variants={rise}
          initial="hidden"
          animate="visible"
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button href="/shop" variant="accent" size="lg" arrow>
            Browse the systems
          </Button>
          <Button href="#featured" variant="outline" size="lg">
            See what&rsquo;s inside
          </Button>
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
