
import Link from "next/link";
import {
  getMetrics,
  getRevenueSeries,
  listOrders,
  listProductStats,
  listNotifications,
  adminDataLocal,
} from "@/lib/admin/data";
import {
  formatMinorAmount,
  relativeTime,
  OrderStatusBadgeCC,
  PanelHeader,
  EmptyState,
} from "@/components/admin/admin-ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { MetricCard } from "@/components/admin/metric-card";

/**
 * /admin — the Command Center.
 *
 * Hierarchy by business importance: revenue first (largest), then the
 * operational metrics; the revenue graph and recent sales dominate the
 * middle; product performance and system status close the page. Every
 * number is a real aggregation — the empty business state renders the
 * same layout with true zeros, never placeholders.
 */

export const dynamic = "force-dynamic";


export default async function AdminDashboard() {
  const isLocal = adminDataLocal();

  const [metrics, series, recent, productStats, notifications] =
    await Promise.all([
      getMetrics().catch(() => null),
      getRevenueSeries(30).catch(() => null),
      listOrders({ perPage: 6, page: 1 }).catch(() => null),
      listProductStats().catch(() => null),
      listNotifications(4).catch(() => []),
    ]);

  const dbDown = metrics === null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="spec text-cc-text-4">Command Center</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
            Business overview
          </h1>
        </div>
        <p className="text-xs text-cc-text-3">
          {dbDown
            ? "Live data unavailable — check system status in Settings."
            : `All values are live · ${metrics?.currencies?.[0] ?? "USD"}`}
        </p>
      </div>

      {dbDown ? (
        <div className="rounded-md border border-cc-bad/40 bg-cc-bad-soft px-5 py-4 text-sm text-cc-bad">
          The database could not be reached. Metrics below may be incomplete —
          see <Link href="/admin/settings" className="underline">system status</Link>.
        </div>
      ) : null}

      {/* TOP — revenue leads, then the operational metrics */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="col-span-2 md:col-span-2 md:row-span-1">
            <MetricCard
              label="Total Revenue"
              value={metrics?.totalRevenueMinor ?? 0}
              format="money"
              sub={
                metrics
                  ? `${metrics.totalPaidOrders} paid ${metrics.totalPaidOrders === 1 ? "order" : "orders"} · avg ${metrics.avgOrderValueMinor !== null ? formatMinorAmount(metrics.avgOrderValueMinor) : "—"}`
                  : "—"
              }
              accent
              delay={0}
            />
          </div>
          <MetricCard
            label="Orders"
            value={metrics?.totalOrders ?? 0}
            format="integer"
            sub={
              metrics
                ? `${metrics.pendingPayments} pending · ${metrics.failedPayments} failed`
                : undefined
            }
            delay={0.06}
          />
          <MetricCard
            label="Customers"
            value={metrics?.customers ?? 0}
            format="integer"
            sub="Distinct purchase emails"
            delay={0.12}
          />
          <MetricCard
            label="Products Sold"
            value={metrics?.productsSold ?? 0}
            format="integer"
            sub="Units across paid orders"
            delay={0.18}
          />
          <MetricCard
            label="Active Licences"
            value={metrics?.activeLicences ?? 0}
            format="integer"
            sub={`${metrics?.activeEntitlements ?? 0} active entitlements`}
            delay={0.24}
          />
        </div>
      </section>

      {/* MIDDLE — revenue graph + recent sales */}
      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
          <PanelHeader
            title="Revenue — last 30 days"
            hint="Paid orders only, grouped by day"
            action={
              <Link
                href="/admin/analytics"
                className="text-xs text-cc-text-3 transition-colors hover:text-cc-accent"
              >
                Full analytics →
              </Link>
            }
          />
          <div className="px-4 pb-4 pt-2">
            {series ? (
              <RevenueChart points={series.points} currency={series.currencies[0]} />
            ) : (
              <EmptyState title="Graph unavailable" hint="The revenue series could not be loaded." />
            )}
          </div>
        </div>

        <div className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
          <PanelHeader
            title="Recent sales"
            hint="Latest orders, all statuses"
            action={
              <Link
                href="/admin/orders"
                className="text-xs text-cc-text-3 transition-colors hover:text-cc-accent"
              >
                All orders →
              </Link>
            }
          />
          {recent && recent.rows.length > 0 ? (
            <ul>
              {recent.rows.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders?focus=${o.id}`}
                    className="flex items-center gap-3 border-b border-cc-line/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-cc-panel-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.8125rem] text-cc-text">
                        {o.productName}
                      </p>
                      <p className="truncate text-xs text-cc-text-3">
                        {o.email} · {relativeTime(o.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[0.8125rem] text-cc-text">
                        {formatMinorAmount(o.amount, o.currency)}
                      </p>
                      <div className="mt-1">
                        <OrderStatusBadgeCC status={o.status} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={recent ? "No orders yet" : "Sales unavailable"}
              hint={
                recent
                  ? "The first order will appear here the moment it happens."
                  : "Orders could not be loaded from the database."
              }
            />
          )}
        </div>
      </section>

      {/* LOWER — product performance + payment health + access status */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
          <PanelHeader
            title="Product performance"
            action={
              <Link
                href="/admin/products"
                className="text-xs text-cc-text-3 transition-colors hover:text-cc-accent"
              >
                All products →
              </Link>
            }
          />
          {productStats ? (
            <ul>
              {productStats
                .filter((p) => p.status === "available" || p.sales > 0)
                .map((p) => (
                  <li
                    key={p.slug}
                    className="flex items-center justify-between gap-3 border-b border-cc-line/60 px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] text-cc-text">
                        {p.name}
                      </p>
                      <p className="text-xs text-cc-text-3">
                        {p.status === "available"
                          ? `${p.sales} ${p.sales === 1 ? "sale" : "sales"} · ${formatMinorAmount(p.revenueMinor)}`
                          : "Coming soon"}
                      </p>
                    </div>
                    {p.price !== null ? (
                      <p className="tnum shrink-0 text-sm text-cc-accent">
                        ${p.price}
                      </p>
                    ) : (
                      <span className="spec shrink-0 text-cc-text-4">Soon</span>
                    )}
                  </li>
                ))}
            </ul>
          ) : (
            <EmptyState title="Product stats unavailable" />
          )}
        </div>

        <div className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
          <PanelHeader title="Payment health" />
          <dl className="px-4 py-2">
            {[
              {
                label: "Pending payments",
                value: metrics?.pendingPayments ?? "—",
                href: "/admin/payments?status=pending",
                tone: "info",
              },
              {
                label: "Failed payments",
                value: metrics?.failedPayments ?? "—",
                href: "/admin/payments?status=failed",
                tone: "bad",
              },
              {
                label: "Paid orders",
                value: metrics?.totalPaidOrders ?? "—",
                href: "/admin/payments?status=paid",
                tone: "good",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-cc-line/60 py-2.5 last:border-b-0"
              >
                <Link
                  href={row.href}
                  className="text-[0.8125rem] text-cc-text-2 transition-colors hover:text-cc-accent"
                >
                  {row.label}
                </Link>
                <dd
                  className={`tnum text-sm font-medium ${
                    row.tone === "good"
                      ? "text-cc-good"
                      : row.tone === "bad"
                        ? "text-cc-bad"
                        : row.tone === "info"
                          ? "text-cc-info"
                          : ""
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
          <PanelHeader
            title="Licences & access"
            action={
              <Link
                href="/admin/licences"
                className="text-xs text-cc-text-3 transition-colors hover:text-cc-accent"
              >
                All licences →
              </Link>
            }
          />
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="text-[0.8125rem] text-cc-text-2">Active licences</p>
              <p className="tnum text-sm text-cc-text">
                {metrics?.activeLicences ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[0.8125rem] text-cc-text-2">Active entitlements</p>
              <p className="tnum text-sm text-cc-text">
                {metrics?.activeEntitlements ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[0.8125rem] text-cc-text-2">Latest event</p>
              {notifications[0] ? (
                <p className="truncate text-xs text-cc-text-3" title={notifications[0].title}>
                  {notifications[0].title} · {relativeTime(notifications[0].created_at)}
                </p>
              ) : (
                <span className="text-xs text-cc-text-4">No events yet</span>
              )}
            </div>
            {isLocal ? (
              <p className="rounded-xs border border-cc-accent/30 bg-cc-accent-soft px-3 py-2 text-[0.6875rem] leading-relaxed text-cc-accent">
                Local mode — Supabase service key not configured, so licence
                and entitlement records read as zero.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
