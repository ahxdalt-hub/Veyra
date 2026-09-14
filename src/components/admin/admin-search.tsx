"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AdminSearchIcon } from "./admin-icons";

/**
 * AdminSearch — ⌘K global search across orders, customers, products,
 * and licences. Queries the (admin-guarded) /admin/api/search route
 * server-side; results identify their entity type.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type Result = {
  type: "order" | "customer" | "product" | "licence";
  title: string;
  subtitle: string;
  href: string;
};

const typeLabel: Record<Result["type"], string> = {
  order: "Order",
  customer: "Customer",
  product: "Product",
  licence: "Licence",
};

export function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const reduced = useReducedMotion();

  // ⌘K / Ctrl+K opens; Escape closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced server search — every state update happens inside the
  // timeout callback, never synchronously in the effect body.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(async () => {
      const q = query.trim();
      setLoading(true);
      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(
          `/admin/api/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = (await res.json()) as { results: Result[] };
          setResults(data.results);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => window.clearTimeout(t);
  }, [query, open]);

  return (
    <>
      <button
        type="button"
        aria-label="Search (Ctrl+K)"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-sm border border-cc-line px-3 text-cc-text-3 transition-colors hover:border-cc-line-strong hover:text-cc-text"
      >
        <AdminSearchIcon className="h-4 w-4" />
        <span className="hidden text-xs md:inline">Search</span>
        <kbd className="hidden rounded-xs border border-cc-line bg-cc-panel px-1.5 py-0.5 font-mono text-[0.625rem] text-cc-text-4 md:inline">
          ⌘K
        </kbd>
      </button>

      <AnimatePresence>
        {open ? (
          <div
            className="fixed inset-0 z-90 flex items-start justify-center px-4 pt-[12vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Search the command center"
          >
            <motion.button
              type="button"
              aria-label="Close search"
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="relative w-full max-w-lg overflow-hidden rounded-md border border-cc-line bg-cc-panel shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
              initial={reduced ? false : { opacity: 0, y: -10, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: EASE }}
            >
              <div className="flex items-center gap-3 border-b border-cc-line px-4">
                <AdminSearchIcon className="h-4 w-4 shrink-0 text-cc-text-3" />
                <input
                  ref={(el) => el?.focus()}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                    if (e.key === "Enter" && results[0]) {
                      router.push(results[0].href);
                      setOpen(false);
                    }
                  }}
                  placeholder="Search orders, customers, products, licences…"
                  className="h-12 flex-1 bg-transparent text-sm text-cc-text placeholder:text-cc-text-4 focus:outline-none"
                  aria-label="Search query"
                />
                <kbd className="rounded-xs border border-cc-line bg-cc-panel-2 px-1.5 py-0.5 font-mono text-[0.625rem] text-cc-text-4">
                  esc
                </kbd>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {query.trim().length < 2 ? (
                  <p className="px-4 py-8 text-center text-xs text-cc-text-3">
                    Type at least two characters — names, emails, order ids,
                    licence references.
                  </p>
                ) : loading ? (
                  <div className="space-y-2 p-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="cc-skeleton h-10" />
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-cc-text-3">
                    No matches in orders, customers, products, or licences.
                  </p>
                ) : (
                  <ul role="listbox" aria-label="Search results">
                    {results.map((r) => (
                      <li key={`${r.type}-${r.href}-${r.title}`}>
                        <button
                          type="button"
                          onClick={() => {
                            router.push(r.href);
                            setOpen(false);
                          }}
                          className="flex w-full items-center gap-3 border-b border-cc-line/50 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-cc-panel-2"
                        >
                          <span className="shrink-0 rounded-xs border border-cc-line bg-cc-panel-2 px-1.5 py-0.5 text-[0.5625rem] font-medium uppercase tracking-wider text-cc-text-3">
                            {typeLabel[r.type]}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.8125rem] text-cc-text">
                              {r.title}
                            </span>
                            <span className="block truncate text-xs text-cc-text-3">
                              {r.subtitle}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
