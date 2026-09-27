import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  commandCenterConfigured,
  getMetrics,
  getRevenueSeries,
  getProductBreakdown,
  getFreeClaims,
  getTotals,
  listNotifications,
  listOrders,
  type RangeKey,
} from "@/lib/admin/data";

/**
 * /api/admin/live — the command center's live-sync endpoint.
 *
 * Returns exactly the data the Overview page renders, for the requested
 * range, so the client can poll it (every ~10s) and the numbers, chart,
 * and feed update in place — no page reload. Every handler re-verifies
 * the admin session server-side; hiding the UI is not the protection.
 *
 * It is pure reads through the same bounded data layer as the page
 * (admin_* RPCs, capped lists) — the cost of a refresh is the cost of
 * the page's own first render.
 */

export const dynamic = "force-dynamic";

const RANGES: RangeKey[] = ["today", "7d", "30d", "90d", "year", "all"];

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const sp = new URL(request.url).searchParams;
  const range: RangeKey = RANGES.includes(sp.get("range") as RangeKey)
    ? (sp.get("range") as RangeKey)
    : "30d";

  const [metrics, totals, series, breakdown, orders, notifications, freeClaims] =
    await Promise.all([
      getMetrics(range),
      getTotals(),
      getRevenueSeries(range),
      getProductBreakdown(range),
      listOrders({ limit: 8 }),
      listNotifications({ limit: 7 }),
      getFreeClaims(range),
    ]);

  return NextResponse.json(
    {
      configured: commandCenterConfigured(),
      range,
      metrics,
      totals,
      series,
      breakdown,
      orders,
      notifications,
      freeClaims,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        // The browser (not the CDN) is the only cache that matters here;
        // never serve a stale dashboard.
        "Cache-Control": "no-store, must-revalidate",
      },
    }
  );
}
