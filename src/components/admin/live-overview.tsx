"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MetricFigure } from "@/components/admin/metric";
import { RevenueChart, BarRows, type SeriesPoint } from "@/components/admin/charts";
import { Panel, PageHeading, EmptyState, StatusPill } from "@/components/admin/admin-ui";
import { RangeSelector } from "@/components/admin/range-selector";
import { money, timeAgo, dateShort, shortId } from "@/components/admin/format";
import { getProduct } from "@/lib/products";
import type {
  AdminMetrics,
  AdminTotals,
  AdminNotificationRow,
  OrderRow,
} from "@/lib/supabase/types";
import type { RangeKey, RevenuePoint, ProductBreakdown } from "@/lib/admin/data";

/**
 * LiveOverview — the Overview page's data, kept fresh in place.
 *
 * The server page renders it with the first data load (so there's no
 * blank flash and the initial paint is full SSR). On mount it then polls
 * /api/admin/live on a calm ~10s cadence and swaps the numbers, chart,
 * and feed out from under the same components — no reload, no flicker.
 * MetricFigure's CountUp re-eases the numerals whenever a value moves,
 * so the dashboard reads as a live control room rather than a static
 * snapshot. Pauses while the tab is hidden; resumes on return.
 */

export type LiveOverviewData = {
  configured: boolean;
  range: RangeKey;
  metrics: AdminMetrics | null;
  totals: AdminTotals | null;
  series: RevenuePoint[];
  breakdown: ProductBreakdown[];
  orders: { rows: OrderRow[]; total: number } | null;
  notifications: AdminNotificationRow[];
};

const POLL_MS = 10_000;
const RANGE_LABEL: Record<RangeKey, string> = {
  today: "today",
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  year: "this year",
  all: "all time",
};

export function LiveOverview({ initial }: { initial: LiveOverviewData }) {
  const [data, setData] = useState<LiveOverviewData>(initial);
  const [live, setLive] = useState(false); // flips true after the first successful poll
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const range = data.range;

  const poll = useCallback(async () => {
    const res = await fetch(`/api/admin/live?range=${encodeURIComponent(range)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const next = (await res.json()) as LiveOverviewData;
    setData({ ...next, range });
    setLive(true);
    setLastSync(new Date());
  }, [range]);

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
  }, [poll, range]);

  const { metrics, totals, series, breakdown, orders, notifications, configured } = data;

  const aov =
    metrics && metrics.paid_orders > 0
      ? Math.round(metrics.revenue / metrics.paid_orders)
      : 0;

  return (
    <div>
      <PageHeading
        title="Overview"
        meta={
          configured ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <LiveDot live={live} />
                Live database · showing {RANGE_LABEL[range]}
              </span>
              {lastSync ? (
                <span className="ml-2 text-xs" style={{ color: "var(--cc-text-4)" }}>
                  · synced {timeAgo(lastSync.toISOString())}
                </span>
              ) : null}
            </>
          ) : (
            "Supabase is not configured on this deployment — metrics will appear once connected."
          )
        }
        actions={<RangeSelector />}
      />

      {/* — Core metrics — */}
      <Panel>
        <div className="grid grid-cols-2 gap-x-8 gap-y-7 md:grid-cols-4">
          <MetricFigure
            label="Revenue"
            value={metrics?.revenue ?? null}
            context={totals ? `of ${money(totals.revenue_all)} all-time` : undefined}
            highlight
          />
          <MetricFigure
            label="Orders"
            value={metrics?.orders ?? null}
            kind="number"
            context={
              metrics
                ? `${metrics.paid_orders} paid · ${metrics.pending_orders} pending · ${metrics.failed_orders} failed`
                : undefined
            }
          />
          <MetricFigure
            label="Avg order value"
            value={metrics && metrics.paid_orders > 0 ? aov : null}
            context={
              metrics && metrics.paid_orders > 0
                ? `over ${metrics.paid_orders} paid orders`
                : "no paid orders in period"
            }
          />
          <MetricFigure
            label="Customers"
            value={totals?.customers_all ?? null}
            kind="number"
            context={metrics ? `${metrics.new_customers} new in period` : undefined}
          />
          <MetricFigure
            label="Active licences"
            value={totals?.licences_active ?? null}
            kind="number"
            context={
              metrics ? `${metrics.licences_issued} issued in period` : undefined
            }
          />
          <MetricFigure
            label="Seats sold"
            value={totals?.seats_active ?? null}
            kind="number"
            context="across active entitlements"
          />
          <MetricFigure
            label="Downloads"
            value={metrics?.downloads ?? null}
            kind="number"
            context="in period"
          />
          <MetricFigure
            label="Products sold"
            value={breakdown.reduce((s, b) => s + b.units, 0)}
            kind="number"
            context={
              breakdown.length > 0
                ? `${breakdown.length} product${breakdown.length === 1 ? "" : "s"}`
                : "in period"
            }
          />
        </div>
      </Panel>

      {/* — Revenue chart — */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title={`Revenue · ${RANGE_LABEL[range]}`}>
          <RevenueChart points={seriesToPoints(series, range)} />
        </Panel>

        <Panel title="Revenue by product">
          {breakdown.length === 0 ? (
            <EmptyState
              title="No sales in this period"
              body="Once orders are confirmed, each product's share of revenue appears here."
            />
          ) : (
            <BarRows
              rows={breakdown.map((b) => ({
                label: getProduct(b.product_slug)?.name ?? b.product_slug,
                value: b.revenue,
              }))}
            />
          )}
        </Panel>
      </div>

      {/* — Attention + activity — */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Recent orders"
          action={
            <Link href="/admin/orders" className="text-xs" style={{ color: "var(--cc-accent-ink)" }}>
              View all →
            </Link>
          }
          padded={false}
        >
          {orders === null ? (
            <div className="p-4">
              <EmptyState
                title="Database not connected"
                body="Add your Supabase credentials to see live orders."
              />
            </div>
          ) : orders.rows.length === 0 ? (
            <EmptyState
              title="No orders yet"
              body="Your first Veyra sale will appear here the moment it's confirmed."
            />
          ) : (
            <table className="cc-table w-full">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {orders.rows.map((o) => (
                  <OrderRowLink key={o.id} order={o} />
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel
          title="What happened"
          action={
            <Link href="/admin/activity" className="text-xs" style={{ color: "var(--cc-accent-ink)" }}>
              Full timeline →
            </Link>
          }
        >
          {notifications.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: "var(--cc-text-4)" }}>
              No activity yet. Orders, payments, licences, and new customers
              record themselves here as they happen.
            </p>
          ) : (
            <ol className="space-y-0">
              {notifications.map((item, i) => (
                <li key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          item.severity === "success"
                            ? "var(--cc-success)"
                            : item.severity === "warning"
                              ? "var(--cc-warning)"
                              : item.severity === "error"
                                ? "var(--cc-error)"
                                : "var(--cc-info)",
                      }}
                    />
                    {i < notifications.length - 1 && (
                      <span aria-hidden="true" className="w-px flex-1" style={{ backgroundColor: "var(--cc-line)" }} />
                    )}
                  </div>
                  <div className={`min-w-0 ${i < notifications.length - 1 ? "pb-4" : ""}`}>
                    <p className="text-sm leading-snug" style={{ color: "var(--cc-text-2)" }}>
                      {item.message}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--cc-text-4)" }}>
                      {item.title} · {timeAgo(item.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}

function OrderRowLink({ order }: { order: OrderRow }) {
  const product = getProduct(order.product_slug);
  return (
    <tr>
      <td>
        <Link href={`/admin/orders/${order.id}`} className="block truncate font-medium hover:underline" style={{ color: "var(--cc-text)", maxWidth: 200 }}>
          {order.email}
        </Link>
        <span className="font-mono text-[10px]" style={{ color: "var(--cc-text-4)" }}>
          {shortId(order.id)}
        </span>
      </td>
      <td className="max-w-[160px] truncate">{product?.name ?? order.product_slug}</td>
      <td className="text-right font-medium tnum" style={{ color: "var(--cc-text)" }}>
        {money(order.amount, order.currency)}
      </td>
      <td>
        <StatusPill status={order.status} />
      </td>
      <td className="whitespace-nowrap" style={{ color: "var(--cc-text-4)" }}>
        {dateShort(order.created_at)}
      </td>
    </tr>
  );
}

/** A quiet pulsing dot that goes solid green once the first live
 *  sync lands; amber-ish pulse until then. */
function LiveDot({ live }: { live: boolean }) {
  return (
    <span aria-hidden="true" className="relative inline-flex h-2 w-2">
      <span
        className={`absolute inset-0 rounded-full ${live ? "cc-live-pulse" : ""}`}
        style={{ backgroundColor: live ? "var(--cc-success)" : "var(--cc-warning)", opacity: live ? 0.5 : 0.6 }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ backgroundColor: live ? "var(--cc-success)" : "var(--cc-warning)" }}
      />
    </span>
  );
}

/* — helpers — */
function seriesToPoints(rows: RevenuePoint[], range: RangeKey): SeriesPoint[] {
  if (rows.length === 0) return [];
  const hourly = range === "today" || range === "7d";
  const out: SeriesPoint[] = [];
  let cursor = new Date(rows[0].bucket);
  const end = new Date(rows[rows.length - 1].bucket);
  const map = new Map(rows.map((r) => [new Date(r.bucket).getTime(), r]));
  let guard = 0;
  while (cursor <= end && guard < 1000) {
    guard += 1;
    const key = cursor.getTime();
    const row = map.get(key);
    out.push({
      label: hourly
        ? `${cursor.getHours()}:00`
        : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(cursor),
      full: hourly
        ? new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric" }).format(cursor)
        : new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(cursor),
      revenue: row?.revenue ?? 0,
      orders: row?.orders ?? 0,
      paid: row?.paid ?? 0,
    });
    if (hourly) cursor = new Date(cursor.getTime() + 3600_000);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
