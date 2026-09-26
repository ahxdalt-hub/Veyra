"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal, useMotionPreference } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { CloseIcon, SparkIcon } from "@/components/ui/icons";

/**
 * CgsDemo — the "Try Live Demo" section.
 *
 * The interactive demo is still under development, so the button opens an
 * honest announcement modal instead of a broken route or a fake
 * application. The dialog follows the storefront's modal pattern (see the
 * cart drawer and search dialog): light scrim with a whisper of blur,
 * Escape / scrim / close-button to dismiss, body scroll locked while
 * open, focus moved into the dialog and restored to the trigger on close,
 * Tab trapped inside, and fully static under prefers-reduced-motion.
 *
 * The secondary action closes the dialog and scrolls to the workflow
 * section — no fabricated demo content, no email capture, no waitlist.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function CgsDemo() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <section
      id="demo"
      className="scroll-mt-24 border-y border-line bg-accent-soft text-ink"
      aria-labelledby="demo-heading"
    >
      <div className="relative container-page overflow-hidden py-20 sm:py-24 lg:py-28">
        {/* Faint drafting grid on the champagne band — house texture */}
        <div
          aria-hidden="true"
          className="bg-blueprint-faint absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        />
        <Reveal className="relative">
          {/* Bordered bronze frame — the house detail for offer moments */}
          <div className="relative mx-auto max-w-3xl rounded-lg border border-accent/25 bg-surface/60 px-6 py-14 text-center shadow-sm sm:px-10 lg:py-16">
            <span aria-hidden="true" className="absolute left-4 top-4 h-3 w-3 border-l border-t border-accent/45" />
            <span aria-hidden="true" className="absolute right-4 top-4 h-3 w-3 border-r border-t border-accent/45" />
            <span aria-hidden="true" className="absolute bottom-4 left-4 h-3 w-3 border-b border-l border-accent/45" />
            <span aria-hidden="true" className="absolute bottom-4 right-4 h-3 w-3 border-b border-r border-accent/45" />

            <p className="text-eyebrow">Live demo</p>
            {/* Bronze rule with a centered spark — a quiet divider */}
            <p aria-hidden="true" className="mx-auto mt-6 flex max-w-xs items-center gap-3">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent/40" />
              <span className="h-1.5 w-1.5 rotate-45 border border-accent/50 bg-accent-soft" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/40" />
            </p>
            <h2 id="demo-heading" className="mt-6 text-display-1">
              See the system{" "}
              <span className="em-serif text-accent">in action.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lead">
              Get a closer look at how Client Growth System brings your
              business workflow together.
            </p>
            <div className="mt-9">
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(true)}
                aria-haspopup="dialog"
                className="group/demo relative inline-flex h-12 items-center gap-2.5 rounded-sm bg-ink px-6 text-[0.9375rem] font-medium text-paper shadow-sm transition-[color,background-color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-ink-2 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <SparkIcon className="h-4 w-4 text-amber" />
                Try the live demo
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      <AnimatePresence>
        {open ? (
          <DemoNoticeModal
            onClose={() => setOpen(false)}
            returnFocusTo={triggerRef}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The modal                                                           */
/* ------------------------------------------------------------------ */

function DemoNoticeModal({
  onClose,
  returnFocusTo,
}: {
  onClose: () => void;
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  const reduced = useMotionPreference();
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open (same pattern as the cart drawer).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Move focus into the dialog on open, restore it to the trigger on close.
  // preventScroll on restore: the secondary action ("Explore the workflow")
  // scrolls the page to the workflow section on close — an unguarded
  // focus() would yank the view back to the trigger mid-scroll. When the
  // dialog closes any other way the trigger is already in view.
  useEffect(() => {
    const trigger = returnFocusTo.current;
    panelRef.current?.focus();
    return () => trigger?.focus({ preventScroll: true });
  }, [returnFocusTo]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Tab trap: keep focus inside the dialog.
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  function exploreWorkflow() {
    onClose();
    // Let the dialog unmount before scrolling the page underneath.
    requestAnimationFrame(() => {
      document
        .getElementById("workflow")
        ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  }

  return (
    <div
      className="fixed inset-0 z-90 flex items-end justify-center px-4 pb-10 sm:items-center sm:pb-0"
      onKeyDown={handleKeyDown}
    >
      {/* Scrim — click to dismiss */}
      <motion.button
        type="button"
        tabIndex={-1}
        aria-label="Close dialog"
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        aria-describedby="demo-modal-body"
        className="relative w-full max-w-md overflow-hidden rounded-lg border border-line bg-surface text-left text-ink shadow-lg outline-none"
        initial={reduced ? false : { opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: reduced ? 0 : 0.28, ease: EASE }}
      >
        {/* Hairline drafting corners — the house detail for offers */}
        <span aria-hidden="true" className="absolute left-3.5 top-3.5 h-2.5 w-2.5 border-l border-t border-accent/40" />
        <span aria-hidden="true" className="absolute right-3.5 top-3.5 h-2.5 w-2.5 border-r border-t border-accent/40" />
        <span aria-hidden="true" className="absolute bottom-3.5 left-3.5 h-2.5 w-2.5 border-b border-l border-accent/40" />
        <span aria-hidden="true" className="absolute bottom-3.5 right-3.5 h-2.5 w-2.5 border-b border-r border-accent/40" />

        {/* Close — top-right, always visible */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-ink-3 transition-colors hover:border-ink/25 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>

        <div className="px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-9">
          {/* The mark — a quiet pulse of motion, the only one */}
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-accent-soft text-accent"
          >
            <SparkIcon className="h-5 w-5" />
          </span>

          <span className="spec mt-6 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-accent-ink">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
            Coming soon
          </span>

          <h3 id="demo-modal-title" className="mt-4 text-display-2">
            Live demo in progress
          </h3>

          <p id="demo-modal-body" className="mt-3 text-sm leading-relaxed text-ink-2">
            We&rsquo;re putting the finishing touches on the interactive
            experience. The live demo is currently being polished and will
            be available soon.
          </p>

          <div className="mt-7 flex flex-col-reverse items-stretch gap-2.5 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="ghost" size="md" onClick={onClose}>
              Close
            </Button>
            <Button variant="accent" size="md" onClick={exploreWorkflow} arrow>
              Explore the workflow
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
