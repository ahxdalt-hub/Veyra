import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getMetrics,
  getRevenueSeries,
  getTotals,
  getProductBreakdown,
  listOrders,
  listNotifications,
  commandCenterConfigured,
  type RangeKey,
} from "@/lib/admin/data";
import { money, timeAgo, dateShort, shortId } from "@/components/admin/format";
import { MetricFigure } from "@/components/admin/metric";
import { RevenueChart, BarRows, type SeriesPoint } from "@/components/admin/charts";
import { RangeSelector } from "@/components/admin/range-selector";
import { Panel, PageHeading, EmptyState, StatusPill, CcButton } from "@/components/admin/admin-ui";
import { getProduct } from "@/lib/products";
import type { OrderRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const RANGES: RangeKey[] = ["today", "7d", "30d", "90d", "year", "all"];

/**
 * Overview / Command Center — "How is Veyra doing right now? What needs
 * attention? What happened recently?" Every number on this page is a
 * real aggregate from the live database (admin_* RPCs, 0012). Empty
 * periods render honest empty states — never filler.
 */

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");

  const sp = await searchParams;
  const range: RangeKey = RANGES.includes(sp.range as RangeKey)
    ? (sp.range as RangeKey)
    : "30d";

  const configured = commandCenterConfigured();
  const [metrics, totals, series, breakdown, orders, notifications] =
    await Promise.all([
      getMetrics(range),
      getTotals(),
      getRevenueSeries(range),
      getProductBreakdown(range),
      listOrders({ limit: 8 }),
      listNotifications({ limit: 7 }),
    ]);

  const rangeLabel = {
    today: "today",
    "7d": "last 7 days",
    "30d": "last 30 days",
    "90d": "last 90 days",
    year: "this year",
    all: "all time",
  }[range];

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
              Live database · showing {rangeLabel}
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
            context={metrics ? `${metrics.licences_issued} issued in period` : undefined}
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
            context={breakdown.length > 0 ? `${breakdown.length} product${breakdown.length === 1 ? "" : "s"}` : "in period"}
          />
        </div>
      </Panel>

      {/* — Revenue chart — */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Panel title={`Revenue · ${rangeLabel}`}>
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
              body="Your first Veyra sale will appear here — and toast the command center the moment it's confirmed."
              action={<CcButton href="/admin/orders" variant="outline" size="sm">Open orders</CcButton>}
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
          {(notifications ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: "var(--cc-text-4)" }}>
              No activity yet. Orders, payments, licences, and new customers
              record themselves here as they happen.
            </p>
          ) : (
            <ol className="space-y-0">
              {notifications!.slice(0, 7).map((item, i) => (
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
                    {i < 6 && <span aria-hidden="true" className="w-px flex-1" style={{ backgroundColor: "var(--cc-line)" }} />}
                  </div>
                  <div className={`min-w-0 ${i < 6 ? "pb-4" : ""}`}>
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
      <td><StatusPill status={order.status} /></td>
      <td className="whitespace-nowrap" style={{ color: "var(--cc-text-4)" }}>
        {dateShort(order.created_at)}
      </td>
    </tr>
  );
}

/** Turn sparse bucketed rows into a continuous, readable series: fill
 *  empty days/hours with zeroes so the line can't jump misleadingly. */
function seriesToPoints(
  rows: { bucket: string; revenue: number; orders: number; paid: number }[],
  range: RangeKey
): SeriesPoint[] {
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
