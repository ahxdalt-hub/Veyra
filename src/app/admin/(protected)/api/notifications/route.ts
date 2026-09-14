import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { listNotifications } from "@/lib/admin/data";

/**
 * GET /admin/api/notifications — fresh notification snapshot for the
 * open notification center. Admin-session-guarded; returns only the
 * notification projection (no business rows beyond what the center
 * already displays).
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const notifications = await listNotifications(30);
    return NextResponse.json({ notifications });
  } catch (err) {
    console.error("[admin-api] notifications failed:", err);
    return NextResponse.json(
      { error: "Could not load notifications." },
      { status: 502 }
    );
  }
}
