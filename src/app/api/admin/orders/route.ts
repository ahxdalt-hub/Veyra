import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { commandCenterConfigured, listOrders, type OrderFilters } from "@/lib/admin/data";
import type { OrderStatus } from "@/lib/orders";

/**
 * /api/admin/orders — the live view of the Orders page.
 *
 * Mirrors listOrders() with query params so the client can poll the SAME
 * bounded, admin-gated read the server page uses: new orders, a status
 * change on a visible row, or a total bump all land without a reload.
 * Every request re-verifies the admin session server-side.
 *
 * Params: q, status, product, from, to, page, limit — the same
 * vocabulary the URL already carries (?q=, ?status=, …).
 */

export const dynamic = "force-dynamic";

const KNOWN_STATUSES: (OrderStatus | "all")[] = [
  "all",
  "paid",
  "pending",
  "failed",
  "cancelled",
  "refunded",
];
const PAGE_SIZE = 25;

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const statusRaw = sp.get("status");
  const status = KNOWN_STATUSES.includes(statusRaw as OrderStatus | "all")
    ? (statusRaw as OrderStatus | "all")
    : "all";
  const page = Math.max(1, Number(sp.get("page") || 1));

  const filters: OrderFilters = {
    search: sp.get("q")?.trim() || undefined,
    status: status === "all" ? undefined : status,
    productSlug: sp.get("product")?.trim() || undefined,
    from: sp.get("from") ? new Date(sp.get("from")!) : undefined,
    to: sp.get("to") ? new Date(`${sp.get("to")}T23:59:59`) : undefined,
    limit: Math.min(Number(sp.get("limit") || PAGE_SIZE), 100),
    offset: (page - 1) * (Math.min(Number(sp.get("limit") || PAGE_SIZE), 100)),
  };

  const result = await listOrders(filters);
  return NextResponse.json(
    {
      configured: commandCenterConfigured(),
      rows: result?.rows ?? [],
      total: result?.total ?? 0,
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}
