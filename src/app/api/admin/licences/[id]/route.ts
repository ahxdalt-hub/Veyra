import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getLicenceDetail } from "@/lib/admin/data";

/** GET /api/admin/licences/[id] — full licence detail for the drawer. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid licence id." }, { status: 422 });
  }
  const detail = await getLicenceDetail(id);
  if (!detail) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ detail });
}
