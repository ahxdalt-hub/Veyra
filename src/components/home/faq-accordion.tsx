"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

/**
 * FAQ — Section I, accessible accordion.
 * Button + region pattern (aria-expanded/aria-controls), height animation
 * via framer-motion, keyboard-native disclosure. FAQPage JSON-LD is
 * emitted separately on the page (server-side).
 */

export type FaqItem = {
  q: string;
  a: string;
};

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion();
  const listId = useId();

  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item, i) => {
        const expanded = open === i;
        const panelId = `${listId}-panel-${i}`;
        const btnId = `${listId}-btn-${i}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                id={btnId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : i)}
                className="group flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-accent"
              >
                <span className="text-[0.9375rem] font-medium text-ink transition-colors group-hover:text-accent">
                  {item.q}
                </span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                    expanded
                      ? "border-accent bg-accent text-white"
                      : "border-line text-ink-3 group-hover:border-accent/50 group-hover:text-accent"
                  }`}
                >
                  {expanded ? <MinusIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  initial={reduced ? { height: 0 } : { height: 0, opacity: 0 }}
                  animate={reduced ? { height: "auto" } : { height: "auto", opacity: 1 }}
                  exit={reduced ? { height: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-6 pr-10 text-sm leading-relaxed text-ink-3">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
