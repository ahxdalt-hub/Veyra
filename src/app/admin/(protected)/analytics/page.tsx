import type { Metadata } from "next";
import Link from "next/link";
import {
  getMetrics,
  getRevenueSeries,
  getPeriodRevenue,
  listProductStats,
  listCustomers,
} from "@/lib/admin/data";
import { formatMinorAmount, EmptyState } from "@/components/admin/admin-ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { MetricCard } from "@/components/admin/metric-card";

export const metadata: Metadata = {
  title: "Analytics — Command Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/analytics — revenue and orders over time, product performance,
 * and customer composition. Time ranges are real windows over real
 * data; the previous-period comparison is computed, and when either
 * period has no data the comparison is simply not shown (no fake
 * percentages).
 */

const RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "365", label: "1 year", days: 365 },
] as const;


/** Window bounds for the requested range, resolved once per request. */
function rangeWindow(days: number): { fromIso: string; toIso: string } {
  const now = Date.now();
  return {
    fromIso: new Date(now - days * 24 * 60 * 60 * 1000).toISOString(),
    toIso: new Date(now + 60 * 1000).toISOString(),
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const rangeKey = RANGES.some((r) => r.key === sp.range) ? sp.range : "30";
  const range = RANGES.find((r) => r.key === rangeKey)!;
  const days = range.days;

  // Window bounds computed once, before any rendering — the page is
  // dynamic per request, so this is the request's "now".
  const { fromIso, toIso } = rangeWindow(days);

  const [series, period, productStats, customers, allTime] = await Promise.all([
    getRevenueSeries(days).catch(() => null),
    getPeriodRevenue(fromIso, toIso).catch(() => null),
    listProductStats().catch(() => null),
    listCustomers().catch(() => null),
    getMetrics().catch(() => null),
  ]);

  // Previous-period comparison — only when the previous window has data.
  let deltaPct: number | null = null;
  if (period && period.revenueMinor > 0) {
    const spanMs = new Date(toIso).getTime() - new Date(fromIso).getTime();
    const prevFrom = new Date(new Date(fromIso).getTime() - spanMs).toISOString();
    const prev = await getPeriodRevenue(prevFrom, fromIso).catch(() => null);
    if (prev && prev.revenueMinor > 0) {
      deltaPct =
        ((period.revenueMinor - prev.revenueMinor) / prev.revenueMinor) * 100;
    }
  }

  // Customers acquired within the window (first order inside it).
  const newCustomers = customers
    ? customers.filter((c) => c.lastPurchaseAt && c.lastPurchaseAt >= fromIso)
        .length
    : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="spec text-cc-text-4">Business Operations</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
            Analytics
          </h1>
        </div>
        <nav aria-label="Time range" className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/analytics?range=${r.key}`}
              aria-current={r.key === rangeKey ? "page" : undefined}
              className={`rounded-sm border px-3 py-1.5 text-xs transition-colors ${
                r.key === rangeKey
                  ? "border-cc-accent/50 bg-cc-accent-soft font-medium text-cc-accent"
                  : "border-cc-line text-cc-text-3 hover:border-cc-line-strong hover:text-cc-text-2"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Period metrics */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label={`Revenue — ${range.label}`}
          value={period?.revenueMinor ?? 0}
          format="money"
          sub={
            deltaPct !== null
              ? `${deltaPct >= 0 ? "▲" : "▼"} ${Math.abs(deltaPct).toFixed(1)}% vs previous ${range.label}`
              : "No comparable previous period"
          }
          accent
        />
        <MetricCard
          label="Orders — period"
          value={period?.orders ?? 0}
          format="integer"
          sub={`All time: ${allTime?.totalOrders ?? 0}`}
          delay={0.06}
        />
        <MetricCard
          label="New customers"
          value={newCustomers ?? 0}
          format="integer"
          sub={`All time: ${customers?.length ?? 0}`}
          delay={0.12}
        />
        <MetricCard
          label="Avg order value"
          value={
            period && period.orders > 0
              ? Math.round(period.revenueMinor / period.orders)
              : 0
          }
          format="money"
          sub="Paid orders, this period"
          delay={0.18}
        />
      </section>

      {/* Revenue graph */}
      <section className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cc-line px-5 py-3.5">
          <div>
            <h2 className="font-display text-[0.9375rem] font-medium text-cc-text">
              Daily revenue
            </h2>
            <p className="mt-0.5 text-xs text-cc-text-3">
              Paid orders only · zero axes, real days
            </p>
          </div>
        </div>
        <div className="px-4 pb-4 pt-2">
          {series ? (
            <RevenueChart points={series.points} currency={series.currencies[0]} height={280} />
          ) : (
            <EmptyState title="Graph unavailable" />
          )}
        </div>
      </section>

      {/* Product performance */}
      <section className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        <div className="border-b border-cc-line px-5 py-3.5">
          <h2 className="font-display text-[0.9375rem] font-medium text-cc-text">
            Sales by product
          </h2>
          <p className="mt-0.5 text-xs text-cc-text-3">All time, real records</p>
        </div>
        {productStats === null ? (
          <EmptyState title="Product analytics unavailable" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-cc-line text-cc-text-4">
                  <th scope="col" className="px-4 py-2.5 text-left spec">Product</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Sales</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Revenue</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Entitlements</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Licences</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Price</th>
                </tr>
              </thead>
              <tbody>
                {productStats.map((p) => (
                  <tr
                    key={p.slug}
                    className="border-b border-cc-line/50 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-cc-text">{p.name}</td>
                    <td className="px-4 py-3 text-xs text-cc-text-3">
                      {p.status === "available" ? "Available" : "Coming soon"}
                    </td>
                    <td className="tnum px-4 py-3 text-cc-text-2">
                      {p.status === "available" ? p.sales : "—"}
                    </td>
                    <td className="tnum px-4 py-3 text-cc-text-2">
                      {p.status === "available" ? formatMinorAmount(p.revenueMinor) : "—"}
                    </td>
                    <td className="tnum px-4 py-3 text-cc-text-2">
                      {p.status === "available" ? p.activeEntitlements : "—"}
                    </td>
                    <td className="tnum px-4 py-3 text-cc-text-2">
                      {p.status === "available" ? p.licenceCount : "—"}
                    </td>
                    <td className="tnum px-4 py-3 text-cc-text">
                      {p.price !== null ? `$${p.price}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
