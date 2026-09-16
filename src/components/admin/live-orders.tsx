"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Panel, EmptyState, StatusPill } from "@/components/admin/admin-ui";
import { ScrollFadeX } from "@/components/admin/smooth-scroll";
import { money, dateShort, dateTime, shortId } from "@/components/admin/format";
import { getProduct } from "@/lib/products";
import type { OrderRow } from "@/lib/supabase/types";

/**
 * LiveOrdersTable — the Orders page's table, kept fresh in place.
 *
 * The server page renders the first load (SSR, no blank flash). On mount
 * this then polls /api/admin/orders on the same ~10s cadence as the
 * overview and swaps rows/total out from under the same markup — no
 * reload. New rows flash in with a quiet champagne wash (skipped under
 * prefers-reduced-motion); status changes on existing rows update in
 * place without a flash. Pauses while the tab is hidden.
 */

export type LiveOrdersInitial = {
  rows: OrderRow[];
  total: number;
  page: number;
  pages: number;
};

export type LiveOrdersQuery = {
  q: string;
  status: string;
  product: string;
  from: string;
  to: string;
};

const POLL_MS = 10_000;
const PAGE_SIZE = 25;
const FLASH_MS = 2400;

export function LiveOrdersTable({
  initial,
  query,
}: {
  initial: LiveOrdersInitial;
  query: LiveOrdersQuery;
}) {
  const reduced = useReducedMotion();
  const [rows, setRows] = useState<OrderRow[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [live, setLive] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const prevIds = useRef<Set<string>>(new Set(initial.rows.map((r) => r.id)));

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (query.q) p.set("q", query.q);
    if (query.status && query.status !== "all") p.set("status", query.status);
    if (query.product) p.set("product", query.product);
    if (query.from) p.set("from", query.from);
    if (query.to) p.set("to", query.to);
    p.set("page", String(initial.page));
    p.set("limit", String(PAGE_SIZE));
    return `/api/admin/orders?${p.toString()}`;
  }, [query, initial.page]);

  const poll = useCallback(async () => {
    const res = await fetch(buildUrl(), { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      rows: OrderRow[];
      total: number;
    };
    const prev = prevIds.current;
    const newIds = new Set(
      data.rows.map((r) => r.id).filter((id) => !prev.has(id))
    );
    prevIds.current = new Set(data.rows.map((r) => r.id));
    setRows(data.rows);
    setTotal(data.total);
    setLastSync(new Date());
    setLive(true);
    if (newIds.size > 0 && !reduced) {
      setFresh(newIds);
      setTimeout(() => setFresh(new Set()), FLASH_MS);
    }
  }, [buildUrl, reduced]);

  // Poll on an interval, but only while the tab is visible.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      poll();
      timer = setInterval(poll, POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVis = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [poll]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = pageHref(initial.page, pages, query);

  return (
    <Panel padded={false}>
      {/* Live status strip */}
      <div
        className="flex items-center justify-between border-b px-4 py-2 text-xs"
        style={{ borderColor: "var(--cc-line)", color: "var(--cc-text-4)" }}
      >
        <span className="inline-flex items-center gap-1.5">
          <LiveDot live={live} />
          {total.toLocaleString()} order{total === 1 ? "" : "s"}
          {fresh.size > 0 ? ` · ${fresh.size} new` : ""}
        </span>
        <span>
          {lastSync ? `synced ${timeAgoLight(lastSync.toISOString())}` : "syncing…"}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={total === 0 ? "No orders yet" : "No orders match these filters"}
          body={
            total === 0
              ? "Your first Veyra sale will appear here the moment it's confirmed."
              : "Try widening the date range or clearing the search."
          }
        />
      ) : (
        <ScrollFadeX>
          <table className="cc-table min-w-full">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Product</th>
                <th className="text-right">Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <OrderLine
                  key={o.id}
                  order={o}
                  fresh={fresh.has(o.id)}
                  reduced={reduced}
                />
              ))}
            </tbody>
          </table>
        </ScrollFadeX>
      )}

      {pages > 1 && rows.length > 0 && (
        <div
          className="flex items-center justify-between border-t px-4 py-3 text-xs"
          style={{ borderColor: "var(--cc-line)", color: "var(--cc-text-3)" }}
        >
          <span className="tnum">
            Page {initial.page} of {pages}
          </span>
          <div className="flex gap-2">
            {initial.page > 1 ? (
              <Link
                href={href(initial.page - 1)}
                className="inline-flex h-7 items-center rounded-sm border px-2.5 transition-colors hover:bg-[var(--cc-surface-2)]"
                style={{ borderColor: "var(--cc-line-strong)" }}
              >
                Previous
              </Link>
            ) : null}
            {initial.page < pages ? (
              <Link
                href={href(initial.page + 1)}
                className="inline-flex h-7 items-center rounded-sm border px-2.5 transition-colors hover:bg-[var(--cc-surface-2)]"
                style={{ borderColor: "var(--cc-line-strong)" }}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </Panel>
  );
}

/* — row — */
function OrderLine({
  order,
  fresh,
  reduced,
}: {
  order: OrderRow;
  fresh: boolean;
  reduced: boolean | null;
}) {
  const product = getProduct(order.product_slug);
  const paymentCell =
    order.status === "paid" ? (
      <span style={{ color: "var(--cc-success)" }}>Confirmed</span>
    ) : order.status === "failed" ? (
      <span style={{ color: "var(--cc-error)" }}>Failed</span>
    ) : order.status === "pending" ? (
      <span style={{ color: "var(--cc-warning)" }}>Awaiting</span>
    ) : (
      <span style={{ color: "var(--cc-text-4)" }}>—</span>
    );
  return (
    <tr
      className={fresh && !reduced ? "cc-row-flash" : undefined}
      style={fresh && !reduced ? { animationDuration: `${FLASH_MS}ms` } : undefined}
    >
      <td>
        <Link
          href={`/admin/orders/${order.id}`}
          className="font-mono text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--cc-accent-ink)" }}
        >
          {shortId(order.id)}
        </Link>
      </td>
      <td className="max-w-[200px] truncate" style={{ color: "var(--cc-text)" }}>
        {order.email}
      </td>
      <td className="max-w-[180px] truncate">{product?.name ?? order.product_slug}</td>
      <td className="text-right font-medium tnum" style={{ color: "var(--cc-text)" }}>
        {money(order.amount, order.currency)}
        {order.coupon_code ? (
          <span className="ml-1.5 text-[10px]" style={{ color: "var(--cc-text-4)" }}>
            {order.coupon_code.toUpperCase()}
          </span>
        ) : null}
      </td>
      <td className="whitespace-nowrap">{paymentCell}</td>
      <td>
        <StatusPill status={order.status} />
      </td>
      <td className="whitespace-nowrap" title={dateTime(order.created_at)} style={{ color: "var(--cc-text-4)" }}>
        {dateShort(order.created_at)}
      </td>
    </tr>
  );
}

/* — helpers (mirror the server page's link + time builders) — */
function pageHref(page: number, _pages: number, q: LiveOrdersQuery): (n: number) => string {
  return (n) => {
    const params = new URLSearchParams();
    if (q.q) params.set("q", q.q);
    if (q.status && q.status !== "all") params.set("status", q.status);
    if (q.product) params.set("product", q.product);
    if (q.from) params.set("from", q.from);
    if (q.to) params.set("to", q.to);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };
}

function timeAgoLight(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function LiveDot({ live }: { live: boolean }) {
  return (
    <span aria-hidden="true" className="relative inline-flex h-2 w-2">
      <span
        className={`absolute inset-0 rounded-full ${live ? "cc-live-pulse" : ""}`}
        style={{
          backgroundColor: live ? "var(--cc-success)" : "var(--cc-warning)",
          opacity: live ? 0.5 : 0.6,
        }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: live ? "var(--cc-success)" : "var(--cc-warning)" }}
      />
    </span>
  );
}

/* Tiny local ref helper so the poll's prev-ids survive re-renders. */
