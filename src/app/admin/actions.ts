"use server";

import { redirect } from "next/navigation";
import {
  authenticateAdmin,
  clearAdminSession,
  isAdminAuthenticated,
} from "@/lib/admin/auth";
import { insertAuditEvent } from "@/lib/admin/notifications";
import {
  markNotificationRead as dbMarkRead,
  markAllNotificationsRead as dbMarkAllRead,
} from "@/lib/admin/data";

/**
 * Admin server actions. Every action re-verifies the signed session
 * cookie server-side before doing anything — the middleware's edge check
 * is convenience, these are the enforcement.
 */

export type LoginState = { error?: string };

export async function adminLoginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter the admin password." };

  const ok = await authenticateAdmin(password);
  if (!ok) {
    // Neutral message; no hint about configuration state.
    return { error: "That password is incorrect." };
  }

  await insertAuditEvent("admin.login");

  const nextRaw = String(formData.get("next") ?? "/admin");
  // Open-redirect guard: only in-app admin paths.
  const next =
    nextRaw.startsWith("/admin") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/admin";
  redirect(next);
}

export async function adminLogoutAction(): Promise<void> {
  // Only audit a logout of an actual session.
  if (await isAdminAuthenticated()) {
    await insertAuditEvent("admin.logout");
  }
  await clearAdminSession();
  redirect("/admin/login");
}

async function requireSession(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new Error("UNAUTHORIZED");
  }
}

export async function markNotificationReadAction(id: string): Promise<void> {
  await requireSession();
  await dbMarkRead(id);
  await insertAuditEvent("notification.read", {
    entity: "admin_notification",
    entityId: id,
  });
}

export async function markAllNotificationsReadAction(): Promise<void> {
  await requireSession();
  await dbMarkAllRead();
  await insertAuditEvent("notification.read_all");
}
