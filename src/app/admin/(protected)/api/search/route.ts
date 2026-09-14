import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { adminSearch } from "@/lib/admin/data";

/**
 * GET /admin/api/search?q=… — global admin search. Guarded by the admin
 * session; delegates to the same server-side data layer as the pages
 * (requireAdmin inside), so no unrestricted query is ever exposed.
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await adminSearch(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[admin-api] search failed:", err);
    return NextResponse.json(
      { error: "Search is unavailable right now." },
      { status: 502 }
    );
  }
}
