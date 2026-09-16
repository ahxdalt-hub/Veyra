import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getOrderStatusCounts,
  getLicenceStatusCounts,
  getMetrics,
  getPurchaseFrequency,
  getProductBreakdown,
  getRevenueSeries,
  getTotals,
  listCustomers,
  rangeBounds,
  type RangeKey,
} from "@/lib/admin/data";
import { getProduct } from "@/lib/products";
import { money, n } from "@/components/admin/format";
import { Panel, PageHeading, EmptyState, KV } from "@/components/admin/admin-ui";
import { BarRows, Donut, RevenueChart, type SeriesPoint } from "@/components/admin/charts";
import { RangeSelector } from "@/components/admin/range-selector";
import { MetricFigure } from "@/components/admin/metric";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const RANGES: RangeKey[] = ["today", "7d", "30d", "90d", "year", "all"];

/**
 * Analytics — each chart answers a real business question, computed from
 * the live database via the admin_* aggregation RPCs. Nothing here is
 * estimated or extrapolated; empty periods say so honestly.
 */

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const sp = await searchParams;
  const range: RangeKey = RANGES.includes(sp.range as RangeKey) ? (sp.range as RangeKey) : "90d";
  const { from, to } = rangeBounds(range);

  const [metrics, totals, series, breakdown, statuses, licStatuses, frequency, top] =
    await Promise.all([
      getMetrics(range),
      getTotals(),
      getRevenueSeries(range),
      getProductBreakdown(range),
      getOrderStatusCounts(range),
      getLicenceStatusCounts(),
      getPurchaseFrequency(),
      listCustomers({ limit: 8 }),
    ]);

  const aov = metrics && metrics.paid_orders > 0 ? Math.round(metrics.revenue / metrics.paid_orders) : 0;
  const conversion =
    metrics && metrics.orders > 0
      ? Math.round((metrics.paid_orders / metrics.orders) * 100)
      : null;

  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  const points = fillSeries(series, spanDays <= 3 ? "hour" : "day");

  return (
    <div>
      <PageHeading title="Analytics" meta="Every figure aggregates real rows" actions={<RangeSelector fallback="90d" />} />

      {/* Revenue */}
      <Panel title="Revenue over time">
        <RevenueChart points={points} />
      </Panel>

      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
        <MetricFigure label="Revenue" value={metrics?.revenue ?? null} />
        <MetricFigure label="Paid orders" value={metrics?.paid_orders ?? null} kind="number" />
        <MetricFigure label="Avg order value" value={metrics && metrics.paid_orders > 0 ? aov : null} />
        <MetricFigure
          label="Confirmation rate"
          value={conversion}
          kind="percent"
          fallback="—"
          context={conversion === null ? "no attempts in period" : "of payment attempts"}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* Products */}
        <Panel title="Revenue by product">
          {breakdown.length === 0 ? (
            <EmptyState title="No sales in this period" body="Product revenue shares appear as orders are confirmed." />
          ) : (
            <BarRows
              rows={breakdown.map((b) => ({
                label: getProduct(b.product_slug)?.name ?? b.product_slug,
                value: b.revenue,
                sub: `${money(b.revenue)} · ${b.units} seats`,
              }))}
            />
          )}
        </Panel>

        {/* Orders */}
        <Panel title="Order outcomes">
          {statuses.length === 0 ? (
            <EmptyState title="No orders in this period" body="The outcome mix appears as activity happens." />
          ) : (
            <Donut
              center={n(statuses.reduce((s, x) => s + x.count, 0))}
              slices={statuses.map((s) => ({
                label: s.status,
                value: s.count,
                color:
                  s.status === "paid"
                    ? "var(--cc-success)"
                    : s.status === "pending"
                      ? "var(--cc-warning)"
                      : s.status === "failed"
                        ? "var(--cc-error)"
                        : "var(--cc-text-4)",
              }))}
            />
          )}
        </Panel>

        {/* Customers */}
        <Panel title="Purchase frequency · all time">
          {frequency.length === 0 ? (
            <EmptyState title="No paying customers yet" body="Repeat behavior appears once purchases are confirmed." />
          ) : (
            <Donut
              center={n(frequency.reduce((s, x) => s + x.customers, 0))}
              slices={frequency.map((f) => ({
                label:
                  f.bucket === "once" ? "One purchase" : f.bucket === "twice" ? "Two purchases" : "Three or more",
                value: f.customers,
                color:
                  f.bucket === "once" ? "var(--cc-info)" : f.bucket === "twice" ? "var(--cc-accent)" : "var(--cc-success)",
              }))}
            />
          )}
        </Panel>

        {/* Licences */}
        <Panel title="Licences · all time">
          {licStatuses.length === 0 ? (
            <EmptyState title="No licences issued yet" body="Every confirmed purchase issues one automatically." />
          ) : (
            <div className="flex flex-wrap items-center gap-8">
              <Donut
                center={n(licStatuses.reduce((s, x) => s + x.count, 0))}
                slices={licStatuses.map((l) => ({
                  label: l.status,
                  value: l.count,
                  color: l.status === "active" ? "var(--cc-success)" : "var(--cc-error)",
                }))}
              />
              <div className="min-w-[140px] flex-1">
                <div className="space-y-0">
                  <KV k="Seats sold (active)" v={n(totals?.seats_active ?? 0)} />
                  <KV k="Leads captured" v={n(totals?.leads_all ?? 0)} />
                  <KV k="Customers total" v={n(totals?.customers_all ?? 0)} />
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Top customers */}
      <div className="mt-5">
        <Panel title="Top customers · lifetime revenue">
          {(top ?? []).length === 0 ? (
            <EmptyState title="No revenue data yet" body="The leaderboard ranks on real lifetime revenue." />
          ) : (
            <BarRows
              rows={(top ?? []).slice(0, 8).map((c) => ({
                label: c.full_name ?? c.username ?? c.email,
                value: c.revenue,
                sub: money(c.revenue),
              }))}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

/** Fill missing buckets so the line can't jump over empty time. */
function fillSeries(
  rows: { bucket: string; revenue: number; orders: number; paid: number }[],
  bucket: "hour" | "day"
): SeriesPoint[] {
  if (rows.length === 0) return [];
  const map = new Map(rows.map((r) => [new Date(r.bucket).getTime(), r]));
  const out: SeriesPoint[] = [];
  let cursor = new Date(rows[0].bucket);
  const end = new Date(rows[rows.length - 1].bucket);
  let guard = 0;
  while (cursor <= end && guard < 1000) {
    guard += 1;
    const row = map.get(cursor.getTime());
    out.push({
      label:
        bucket === "hour"
          ? `${cursor.getUTCHours()}:00`
          : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(cursor),
      full:
        bucket === "hour"
          ? new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric", timeZone: "UTC" }).format(cursor)
          : new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(cursor),
      revenue: row?.revenue ?? 0,
      orders: row?.orders ?? 0,
      paid: row?.paid ?? 0,
    });
    if (bucket === "hour") cursor = new Date(cursor.getTime() + 3600_000);
    else cursor = new Date(cursor.getTime() + 86_400_000);
  }
  return out;
}
