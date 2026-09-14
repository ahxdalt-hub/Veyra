"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { searchProducts } from "@/lib/products";
import { formatPrice } from "@/lib/site";
import { useSearch } from "./search-context";
import { SearchIcon } from "@/components/ui/icons";

/**
 * SearchDialog — accessible product search.
 * Remounts on open (fresh query state, no effect-setState), focuses
 * the input via ref callback, Escape closes, results are a listbox
 * of real buttons (keyboard- and pointer-operable).
 */

export function SearchDialogHost() {
  const { isOpen } = useSearch();
  return (
    <AnimatePresence>{isOpen ? <SearchDialog key="search" /> : null}</AnimatePresence>
  );
}

function SearchDialog() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const reduced = useReducedMotion();
  const { close } = useSearch();

  const results = useMemo(() => searchProducts(query), [query]);

  // Escape closes — a subscription, not a state reset.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-90 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      {/* Backdrop */}
      <motion.button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        onClick={close}
      />

      {/* Panel */}
      <motion.div
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-lg"
        initial={reduced ? false : { opacity: 0, y: -8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon className="h-4 w-4 shrink-0 text-ink-3" />
          <input
            ref={(el) => el?.focus()}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length > 0) {
                router.push(`/products/${results[0].slug}`);
                close();
              }
            }}
            placeholder="Search products, phases, workflows…"
            aria-label="Search products"
            aria-controls="search-results"
            className="h-13 w-full bg-transparent py-4 text-sm text-ink outline-none placeholder:text-ink-4"
          />
          <kbd className="spec hidden rounded-xs border border-line bg-paper px-1.5 py-1 text-ink-3 sm:block">
            ESC
          </kbd>
        </div>

        <div id="search-results" role="listbox" aria-label="Products">
          {query.trim() === "" ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-ink-3">
                Search by product name or workflow — e.g.{" "}
                <span className="text-ink-2">&ldquo;growth&rdquo;</span> or{" "}
                <span className="text-ink-2">&ldquo;acquisition&rdquo;</span>.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-ink-3">
                No products match &ldquo;{query}&rdquo;. Try{" "}
                <span className="text-ink-2">&ldquo;sales&rdquo;</span> or{" "}
                <span className="text-ink-2">&ldquo;onboarding&rdquo;</span>.
              </p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-2">
              {results.map((p) => (
                <li key={p.slug} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(`/products/${p.slug}`);
                      close();
                    }}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-accent-soft/70 focus-visible:bg-accent-soft/70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        {p.name}
                      </span>
                      <span className="block truncate text-xs text-ink-3">
                        {p.shortDescription}
                      </span>
                    </span>
                    <span className="spec shrink-0 text-ink-3 tnum">
                      {p.status === "available" && p.price !== null
                        ? formatPrice(p.price)
                        : "Coming soon"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
}
