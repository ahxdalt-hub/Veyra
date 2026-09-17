"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SparkIcon } from "@/components/ui/icons";

/**
 * DemoCta — the "Try Live Demo" secondary action next to the offer's
 * founding-price CTA.
 *
 * The interactive demo is still being polished, so the click opens a
 * compact announcement modal instead of navigating anywhere. The modal
 * reuses the storefront's dialog language (see search-dialog and the
 * cart drawer): a light ink/25 scrim with a whisper of blur, one surface
 * panel, expo-out entrance, Escape / scrim / Close to dismiss, body
 * scroll locked while open, focus moved to the primary action. The
 * primary action routes to the founding-offer section of the flagship
 * product page — the purchase CTA that already exists there.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function DemoCta({
  size = "lg",
  className = "",
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <SparkIcon className="h-4 w-4" />
        Try Live Demo
      </Button>

      <AnimatePresence>
        {open ? <DemoNoticeModal onClose={() => setOpen(false)} /> : null}
      </AnimatePresence>
    </>
  );
}

function DemoNoticeModal({ onClose }: { onClose: () => void }) {
  const reduced = useReducedMotion();

  // Lock body scroll while open (same pattern as the cart drawer).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escape closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-90 flex items-end justify-center px-4 pb-10 sm:items-center sm:pb-0">
      {/* Scrim — light, like the cart drawer's; click-outside closes */}
      <motion.button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        onClick={onClose}
      />

      {/* Panel — takes focus on open (the standard dialog pattern) */}
      <motion.div
        ref={(el) => el?.focus()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-notice-title"
        aria-describedby="demo-notice-body"
        className="relative w-full max-w-sm overflow-hidden rounded-lg border border-line bg-surface shadow-lg outline-none"
        initial={reduced ? false : { opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.26, ease: EASE }}
      >
        {/* Hairline drafting corners — the house detail for offers */}
        <span aria-hidden="true" className="absolute left-3.5 top-3.5 h-2.5 w-2.5 border-l border-t border-accent/40" />
        <span aria-hidden="true" className="absolute right-3.5 top-3.5 h-2.5 w-2.5 border-r border-t border-accent/40" />
        <span aria-hidden="true" className="absolute bottom-3.5 left-3.5 h-2.5 w-2.5 border-b border-l border-accent/40" />
        <span aria-hidden="true" className="absolute bottom-3.5 right-3.5 h-2.5 w-2.5 border-b border-r border-accent/40" />

        <div className="px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8">
          {/* Mark */}
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/25 bg-accent-soft text-accent"
          >
            <SparkIcon className="h-4.5 w-4.5" />
          </span>

          <h2 id="demo-notice-title" className="mt-5 text-display-2">
            Demo experience is being{" "}
            <span className="em-serif">polished.</span>
          </h2>

          <p id="demo-notice-body" className="mt-3 text-sm leading-relaxed text-ink-2">
            We&rsquo;re adding the final touches to make your first look at
            Veyra worth the click.
          </p>

          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
            Expect the interactive demo soon.
          </p>

          <div className="mt-7 flex flex-col-reverse items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>
            <Button
              href="/products/client-growth-system#get"
              variant="accent"
              size="md"
              arrow
              onClick={onClose}
            >
              Explore the Product
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
