import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { listNotifications } from "@/lib/admin/data";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSearch } from "@/components/admin/admin-search";
import { NotificationCenter } from "@/components/admin/notification-center";

export const metadata: Metadata = {
  title: "Command Center — Veyra",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#14120d",
  width: "device-width",
  initialScale: 1,
};

/**
 * Admin layout — every route below /admin (except /admin/login, which
 * is outside this layout's auth by construction) re-verifies the signed
 * session cookie server-side before rendering. Data flows down: the
 * notification snapshot is read once here and passed to the client
 * chrome, which keeps it fresh via the admin API.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");

  const notifications = await listNotifications(30).catch(() => []);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <AdminShell
      unreadCount={unreadCount}
      searchSlot={<AdminSearch />}
      notificationsSlot={
        <NotificationCenter
          initial={notifications}
          refreshHref="/admin/api/notifications"
        />
      }
    >
      {children}
    </AdminShell>
  );
}
