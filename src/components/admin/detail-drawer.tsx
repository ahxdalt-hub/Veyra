"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AdminCloseIcon } from "./admin-icons";

/**
 * DetailDrawer — the command center's inspection surface. Slides in
 * from the right on desktop, full-screen on mobile. Focus is moved into
 * the drawer on open, Escape closes, and the background never scrolls.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function DetailDrawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-80" role="presentation">
          <motion.button
            type="button"
            aria-label="Close details"
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${eyebrow ? eyebrow + " — " : ""}${title}`}
            className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-cc-line bg-cc-panel shadow-[-24px_0_64px_rgba(0,0,0,0.45)] sm:max-w-xl md:max-w-2xl"
            initial={reduced ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: reduced ? 0 : 0.38, ease: EASE }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-cc-line px-5 py-4">
              <div className="min-w-0">
                {eyebrow ? (
                  <p className="spec text-cc-text-4">{eyebrow}</p>
                ) : null}
                <h2 className="mt-1 truncate font-display text-lg font-medium tracking-[-0.01em] text-cc-text">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                autoFocus
                aria-label="Close details"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-cc-line text-cc-text-3 transition-colors hover:border-cc-line-strong hover:text-cc-text"
              >
                <AdminCloseIcon />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

            {footer ? (
              <footer className="border-t border-cc-line px-5 py-3">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/** Field group inside a drawer — label/value stack with hairline rule. */
export function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-cc-line/60 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-xs text-cc-text-3">{label}</dt>
      <dd className="min-w-0 text-right text-[0.8125rem] text-cc-text">
        {children}
      </dd>
    </div>
  );
}

export function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="spec mb-2 text-cc-text-4">{title}</h3>
      <div className="cc-edge rounded-md border border-cc-line bg-cc-panel-2 px-4 py-1.5">
        {children}
      </div>
    </section>
  );
}
