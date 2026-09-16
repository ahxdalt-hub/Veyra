import type { Metadata } from "next";
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
import { LiveOverview, type LiveOverviewData } from "@/components/admin/live-overview";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const RANGES: RangeKey[] = ["today", "7d", "30d", "90d", "year", "all"];

/**
 * Overview / Command Center — "How is Veyra doing right now? What needs
 * attention? What happened recently?"
 *
 * The server renders the FIRST data load so the page is complete on
 * first paint. After that, LiveOverview keeps every number, chart, and
 * feed moving in place via /api/admin/live — no reload, no flicker.
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

  const initial: LiveOverviewData = {
    configured,
    range,
    metrics,
    totals,
    series,
    breakdown,
    orders,
    notifications: notifications ?? [],
  };

  return <LiveOverview initial={initial} />;
}
