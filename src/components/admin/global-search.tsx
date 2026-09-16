"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SearchIcon, ArrowUpRightIcon } from "@/components/admin/icons";

/**
 * Global search — a keyboard-first command palette (⌘K / Ctrl+K) over
 * orders, customers, products, licences, and coupons. Debounced
 * server-side search; grouped results; arrow keys + Enter navigate.
 * No client-side table dumps: every query hits /api/admin/search with
 * the term.
 */

type Results = {
  orders: { id: string; email: string; status: string; amountLabel: string; created_at: string }[];
  customers: { email: string; name: string | null; orders: number; revenue: number }[];
  products: { slug: string; name: string; status: string }[];
  licences: { id: string; reference: string; email: string; product: string; status: string }[];
  coupons: { code: string; label: string; active: boolean }[];
};

type Flat = { href: string; label: string; sub: string; group: string };

function flatten(r: Results): Flat[] {
  return [
    ...r.orders.map((o) => ({
      href: `/admin/orders/${o.id}`,
      label: `${o.email}`,
      sub: `Order · ${o.status} · ${o.amountLabel}`,
      group: "Orders",
    })),
    ...r.customers.map((c) => ({
      href: `/admin/customers?email=${encodeURIComponent(c.email)}`,
      label: c.name ?? c.email,
      sub: `${c.orders} order${c.orders === 1 ? "" : "s"} · $${(c.revenue / 100).toFixed(0)} lifetime`,
      group: "Customers",
    })),
    ...r.licences.map((l) => ({
      href: `/admin/licences?focus=${l.id}`,
      label: l.reference,
      sub: `${l.product} · ${l.email} · ${l.status}`,
      group: "Licences",
    })),
    ...r.products.map((p) => ({
      href: `/admin/products?focus=${p.slug}`,
      label: p.name,
      sub: `Product · ${p.status}`,
      group: "Products",
    })),
    ...r.coupons.map((c) => ({
      href: `/admin/coupons?focus=${c.code}`,
      label: c.code.toUpperCase(),
      sub: `${c.label} · ${c.active ? "active" : "inactive"}`,
      group: "Coupons",
    })),
  ];
}

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Results carry the term that produced them — freshness and the
  // spinner derive from that comparison, no extra state.
  const [data, setData] = useState<{ term: string; results: Results } | null>(null);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The term whose fetch started last — in-flight responses for older
  // terms are discarded by it. Written only inside timers, never render.
  const firedTerm = useRef("");

  const openPalette = useCallback(() => {
    setQuery("");
    setData(null);
    setIndex(0);
    setOpen(true);
  }, []);

  // ⌘K / Ctrl+K opens from anywhere in the command center.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const term = query.trim();
    if (!term) return;
    debounce.current = setTimeout(async () => {
      firedTerm.current = term;
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const results = (await res.json()) as Results;
        // Drop stale responses: only apply if this is still the last term fired.
        if (firedTerm.current !== term) return;
        setData({ term, results });
        setIndex(0);
      } catch {
        /* transient — the next keystroke retries */
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  const searching = !!query.trim() && data?.term !== query.trim();
  const items = useMemo(
    () => (data && data.term === query.trim() ? flatten(data.results) : []),
    [data, query]
  );
  const groups = useMemo(() => {
    const map = new Map<string, { item: Flat; i: number }[]>();
    items.forEach((item, i) => {
      const list = map.get(item.group) ?? [];
      list.push({ item, i });
      map.set(item.group, list);
    });
    return [...map.entries()];
  }, [items]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = items[index];
      if (hit) go(hit.href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
            : "flex h-8 w-full max-w-md items-center gap-2.5 rounded-sm border px-3 text-left text-sm transition-colors"
        }
        style={{
          color: "var(--cc-text-3)",
          borderColor: "var(--cc-line-strong)",
          backgroundColor: compact ? undefined : "var(--cc-bg-2)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--cc-accent-line)";
          if (compact) e.currentTarget.style.backgroundColor = "var(--cc-surface-2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--cc-line-strong)";
          if (compact) e.currentTarget.style.backgroundColor = "";
        }}
      >
        <SearchIcon className="h-4 w-4 shrink-0" />
        {!compact && (
          <>
            <span className="flex-1 truncate">Search orders, customers, licences…</span>
            <kbd
              className="hidden rounded-sm border px-1.5 py-0.5 font-mono text-[10px] sm:block"
              style={{ borderColor: "var(--cc-line-strong)", color: "var(--cc-text-4)" }}
            >
              ⌘K
            </kbd>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[80]"
              style={{ backgroundColor: "rgba(10, 9, 7, 0.55)" }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="Search Veyra"
              initial={reduced ? false : { opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-1/2 top-[18%] z-[81] w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border shadow-2xl"
              style={{ backgroundColor: "var(--cc-surface)", borderColor: "var(--cc-line-strong)" }}
            >
              <div className="flex items-center gap-3 border-b px-4" style={{ borderColor: "var(--cc-line)" }}>
                <SearchIcon className="h-4 w-4 shrink-0" style={{ color: "var(--cc-text-3)" }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Search orders, customers, products, licences, coupons…"
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--cc-text-4)]"
                  style={{ color: "var(--cc-text)" }}
                  spellCheck={false}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={items.length > 0}
                  aria-controls="cc-search-results"
                />
                {searching && (
                  <span
                    className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
                    style={{ borderColor: "var(--cc-accent)", borderTopColor: "transparent" }}
                  />
                )}
              </div>

              <div id="cc-search-results" className="max-h-[360px] overflow-y-auto p-2" role="listbox">
                {!query.trim() ? (
                  <div className="px-3 py-8 text-center">
                    <p className="text-sm" style={{ color: "var(--cc-text-3)" }}>
                      Type to search across the business.
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--cc-text-4)" }}>
                      ↑↓ to navigate · Enter to open · Esc to close
                    </p>
                  </div>
                ) : items.length === 0 && !searching ? (
                  <p className="px-3 py-8 text-center text-sm" style={{ color: "var(--cc-text-3)" }}>
                    No matches for “{query.trim()}”.
                  </p>
                ) : (
                  groups.map(([group, entries]) => (
                    <div key={group} className="mb-1">
                      <p className="cc-label px-3 py-1.5" style={{ color: "var(--cc-text-4)" }}>
                        {group}
                      </p>
                      {entries.map(({ item, i }) => (
                        <button
                          key={`${item.href}-${i}`}
                          type="button"
                          role="option"
                          aria-selected={i === index}
                          onClick={() => go(item.href)}
                          onMouseEnter={() => setIndex(i)}
                          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors"
                          style={{
                            backgroundColor: i === index ? "var(--cc-surface-2)" : undefined,
                          }}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm" style={{ color: "var(--cc-text)" }}>
                              {item.label}
                            </span>
                            <span className="block truncate text-xs" style={{ color: "var(--cc-text-3)" }}>
                              {item.sub}
                            </span>
                          </span>
                          <ArrowUpRightIcon
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: i === index ? "var(--cc-accent-ink)" : "var(--cc-text-4)" }}
                          />
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
