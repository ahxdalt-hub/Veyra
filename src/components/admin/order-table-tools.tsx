"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OrderStatus } from "@/lib/orders";

/**
 * OrderTableTools — the filter bar above the orders table. Debounced
 * search + selects/dates that all write into the URL, so the server
 * component re-renders a correctly filtered page and links stay
 * shareable. All fields share the .cc-ctl geometry (see admin.css) so
 * their borders sit on one line.
 */

export function OrderTableTools({
  statuses,
}: {
  statuses: (OrderStatus | "all")[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();

  const currentStatus = search.get("status") ?? "all";
  const currentFrom = search.get("from") ?? "";
  const currentTo = search.get("to") ?? "";

  // Local mirror of the search box so typing feels instant; the URL
  // updates after a short debounce.
  const [q, setQ] = useState(search.get("q") ?? "");
  const committed = useRef(q);
  useEffect(() => {
    const fromUrl = search.get("q") ?? "";
    if (fromUrl !== committed.current) {
      setQ(fromUrl);
      committed.current = fromUrl;
    }
  }, [search]);

  const apply = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(search.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v && !(k === "status" && v === "all")) params.set(k, v);
        else params.delete(k);
      }
      params.delete("page"); // filters reset pagination
      start(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    },
    [pathname, router, search, start]
  );

  useEffect(() => {
    if (q === committed.current) return;
    const t = setTimeout(() => {
      committed.current = q;
      apply({ q });
    }, 300);
    return () => clearTimeout(t);
  }, [q, apply]);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      style={{ opacity: pending ? 0.65 : 1, transition: "opacity 0.15s" }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by email or order id…"
        aria-label="Search orders"
        className="cc-ctl w-72"
      />
      <select
        aria-label="Filter by status"
        value={currentStatus}
        onChange={(e) => apply({ status: e.target.value })}
        className="cc-ctl"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      <label className="cc-date">
        <span className="cc-label" style={{ color: "var(--cc-text-4)" }}>
          From
        </span>
        <input
          type="date"
          value={currentFrom}
          onChange={(e) => apply({ from: e.target.value })}
        />
      </label>
      <label className="cc-date">
        <span className="cc-label" style={{ color: "var(--cc-text-4)" }}>
          To
        </span>
        <input
          type="date"
          value={currentTo}
          onChange={(e) => apply({ to: e.target.value })}
        />
      </label>
    </div>
  );
}
