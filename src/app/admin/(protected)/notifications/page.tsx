import type { Metadata } from "next";
import Link from "next/link";
import { listNotifications, adminDataLocal } from "@/lib/admin/data";
import { EmptyState } from "@/components/admin/admin-ui";
import { markAllNotificationsReadAction } from "@/app/admin/actions";
import { severityStyle } from "@/components/admin/notification-center";
import { formatDateTime } from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Notifications — Command Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/notifications — the persistent event history. Business events
 * (sale, customer) and SYSTEM alerts (payment failure, delivery, system)
 * are visually distinguished by kind marker, not noise. Read/unread is
 * shown with both a marker and text, never color alone.
 */

function kindLabel(kind: string): string {
  switch (kind) {
    case "sale":
      return "Business · Sale";
    case "customer":
      return "Business · Customer";
    case "payment_failed":
      return "System · Payment";
    case "delivery":
      return "System · Delivery";
    default:
      return "System · Alert";
  }
}

export default async function NotificationsPage() {
  const notifications = await listNotifications(100).catch(() => null);
  const unread = notifications?.filter((n) => !n.read_at).length ?? 0;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="spec text-cc-text-4">System</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
            Notifications
          </h1>
          <p className="mt-1 text-xs text-cc-text-3">
            Persistent history — dismissing never deletes the underlying
            business record.
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="h-9 rounded-sm border border-cc-line px-3 text-xs text-cc-text-2 transition-colors hover:border-cc-line-strong hover:text-cc-text"
            >
              Mark all read ({unread})
            </button>
          </form>
        ) : null}
      </div>

      <div className="cc-edge mt-5 overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        {notifications === null ? (
          <EmptyState
            title="Notifications unavailable"
            hint="The notification store could not be reached."
          />
        ) : notifications.length === 0 ? (
          <EmptyState
            title={adminDataLocal() ? "Notification store not connected" : "No notifications yet"}
            hint={
              adminDataLocal()
                ? "Notifications persist in Supabase (admin_notifications, migration 0004). Configure the service key to activate."
                : "Real events — sales, payment failures, system alerts — will appear here as they happen."
            }
          />
        ) : (
          <ul>
            {notifications.map((n) => {
              const sev = severityStyle(n.severity);
              const isUnread = !n.read_at;
              return (
                <li
                  key={n.id}
                  className={`border-b border-cc-line/60 last:border-b-0 ${
                    isUnread ? "bg-cc-panel-2/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 px-5 py-4">
                    <span
                      className={`mt-1.5 shrink-0 text-xs leading-none ${sev.text}`}
                      aria-hidden="true"
                    >
                      {sev.glyph}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <p
                          className={`text-[0.875rem] font-medium ${
                            isUnread ? "text-cc-text" : "text-cc-text-2"
                          }`}
                        >
                          {n.title}
                        </p>
                        {isUnread ? (
                          <span className="inline-flex items-center gap-1 rounded-xs border border-cc-accent/40 bg-cc-accent-soft px-1.5 py-px text-[0.5625rem] font-semibold uppercase tracking-wider text-cc-accent">
                            <span className="h-1 w-1 rounded-full bg-cc-accent" aria-hidden="true" />
                            Unread
                          </span>
                        ) : (
                          <span className="text-[0.625rem] uppercase tracking-wider text-cc-text-4">
                            Read
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[0.8125rem] leading-relaxed text-cc-text-3">
                        {n.message}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.625rem] uppercase tracking-wide text-cc-text-4">
                        <span>{kindLabel(n.kind)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDateTime(n.created_at)}</span>
                        {n.related_entity === "order" && n.related_slug ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <Link
                              href={`/admin/orders?focus=${n.related_slug}`}
                              className="text-cc-accent hover:underline"
                            >
                              View order
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
