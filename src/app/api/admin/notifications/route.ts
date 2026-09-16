import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from "@/lib/admin/data";

/**
 * /api/admin/notifications — the notification center's read model and
 * its only write surface (mark-read). Every handler re-verifies the
 * admin session server-side: hiding the bell in the UI is not the
 * protection.
 *
 *  GET  ?since=ISO        → { notifications, unread } (since = recent
 *                          window for reconnect resync, else full page)
 *  PATCH { id? }          → mark one read, or all.
 */

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const since = new URL(request.url).searchParams.get("since");
  const limit = Math.min(
    Number(new URL(request.url).searchParams.get("limit") ?? 30) || 30,
    100
  );
  if (since) {
    // Resync path: recent window only, no unread recomputation.
    const rows = await listNotifications({ limit });
    const filtered = (rows ?? []).filter((n) => n.created_at >= since);
    return NextResponse.json({ notifications: filtered, unread: await unreadNotificationCount() });
  }
  const [rows, unread] = await Promise.all([
    listNotifications({ limit }),
    unreadNotificationCount(),
  ]);
  return NextResponse.json({ notifications: rows ?? [], unread });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let body: { id?: unknown } | null = null;
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    body = null;
  }
  if (body && typeof body.id === "string" && /^[0-9a-f-]{36}$/i.test(body.id)) {
    const ok = await markNotificationRead(body.id);
    return NextResponse.json({ ok });
  }
  const count = await markAllNotificationsRead();
  return NextResponse.json({ ok: true, count });
}
