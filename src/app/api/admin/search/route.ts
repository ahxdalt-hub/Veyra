import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { globalSearch } from "@/lib/admin/data";

/**
 * GET /api/admin/search?q= — grouped global search. Admin-gated on
 * every request (requireAdmin, fresh service-role re-read); results are
 * bounded (5 per group) by the data layer.
 */

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ orders: [], customers: [], products: [], licences: [], coupons: [] });
  }
  const results = await globalSearch(q);
  return NextResponse.json(results);
}
