import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { listLicences } from "@/lib/admin/data";

/**
 * GET /api/admin/licences?q=&status=&product=&page= — the licence drawer
 * and list controls read through this (admin-gated). GET /api/admin/
 * licences/[id] returns one licence's full detail.
 */

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 25) || 25, 100);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const result = await listLicences({
    search: url.searchParams.get("q") ?? undefined,
    status: (url.searchParams.get("status") as "active" | "revoked") ?? undefined,
    productSlug: url.searchParams.get("product") ?? undefined,
    limit,
    offset,
  });
  return NextResponse.json(result ?? { rows: [], total: 0 });
}
