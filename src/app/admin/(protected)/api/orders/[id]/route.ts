import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getOrderDetail } from "@/lib/admin/data";
import { insertAuditEvent } from "@/lib/admin/notifications";

/**
 * GET /admin/api/orders/[id] — order detail for the admin drawer.
 * Session-guarded; returns the full business view of one order (no
 * provider secrets exist in this projection by construction).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const order = await getOrderDetail(id);
    if (!order) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    await insertAuditEvent("order.view", {
      entity: "order",
      entityId: order.id,
    });
    return NextResponse.json({ order });
  } catch (err) {
    console.error("[admin-api] order detail failed:", err);
    return NextResponse.json(
      { error: "Could not load the order." },
      { status: 502 }
    );
  }
}
