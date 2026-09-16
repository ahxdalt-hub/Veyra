import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  listNotifications,
  listAuditEvents,
} from "@/lib/admin/data";
import { dateTime, timeAgo } from "@/components/admin/format";
import { Panel, PageHeading, EmptyState } from "@/components/admin/admin-ui";
import { UrlSelect } from "@/components/admin/url-select";
import { MarkAllReadButton } from "@/components/admin/mark-all-read";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

/**
 * Activity — the operational timeline. Merged from the two real sources:
 * business events (orders, payments, customers, licences, coupons,
 * deliveries — written by server code as they happen) and administrative
 * actions (who did what in the command center). Nothing is fabricated;
 * the feed only contains events that actually occurred.
 */

type Sp = { kind?: string; read?: string };

const KIND_LABEL: Record<string, string> = {
  sale: "Sale confirmed",
  payment_failed: "Payment failed",
  customer: "New customer",
  licence: "Licence event",
  coupon: "Coupon change",
  delivery: "Delivery",
  system: "System",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const sp = await searchParams;
  const kindFilter = sp.kind ?? "";
  const unreadOnly = sp.read === "unread";

  const [notifications, auditEvents] = await Promise.all([
    listNotifications({ limit: 100 }),
    listAuditEvents(60),
  ]);

  type FeedItem = {
    key: string;
    at: string;
    title: string;
    message: string;
    source: "business" | "admin";
    actor?: string | null;
    href?: string;
    unread?: boolean;
    severity?: string;
  };

  const items: FeedItem[] = [];
  for (const n of notifications ?? []) {
    if (kindFilter && n.kind !== kindFilter) continue;
    if (unreadOnly && n.read_at) continue;
    const id = n.related_id ?? "";
    items.push({
      key: `n-${n.id}`,
      at: n.created_at,
      title: KIND_LABEL[n.kind] ?? n.title,
      message: n.message,
      source: "business",
      severity: n.severity,
      unread: !n.read_at,
      href:
        n.kind === "sale" || n.kind === "payment_failed"
          ? id
            ? `/admin/orders/${id}`
            : "/admin/orders"
          : n.kind === "licence"
            ? "/admin/licences"
            : n.kind === "customer"
              ? "/admin/customers"
              : n.kind === "coupon"
                ? "/admin/coupons"
                : n.kind === "delivery"
                  ? "/admin/downloads"
                  : undefined,
    });
  }
  for (const a of auditEvents ?? []) {
    if (kindFilter) continue; // audit rows are admin-only; skip when filtering business kinds
    if (unreadOnly) continue; // audit has no read state
    items.push({
      key: `a-${a.id}`,
      at: a.created_at,
      title: "Admin action",
      message: a.detail ?? a.action,
      source: "admin",
      actor: a.actor_email ?? undefined,
    });
  }
  items.sort((x, y) => (x.at < y.at ? 1 : -1));

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <div>
      <PageHeading
        title="Activity"
        meta="Every operational event Veyra has actually recorded"
        actions={
          unreadCount > 0 ? <MarkAllReadButton count={unreadCount} /> : null
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <UrlSelect
          param="kind"
          label="Filter by event type"
          options={[
            { value: "", label: "All events" },
            { value: "sale", label: "Sales" },
            { value: "payment_failed", label: "Payment failures" },
            { value: "customer", label: "New customers" },
            { value: "licence", label: "Licences" },
            { value: "coupon", label: "Coupons" },
            { value: "delivery", label: "Deliveries" },
          ]}
        />
        <UrlSelect
          param="read"
          label="Filter by read state"
          options={[
            { value: "", label: "Read and unread" },
            { value: "unread", label: "Unread only" },
          ]}
        />
      </div>

      <Panel>
        {items.length === 0 ? (
          <EmptyState
            title="No activity yet"
            body="Orders, payments, licences, coupons, and admin actions record themselves here as they happen. Nothing historical is invented."
          />
        ) : (
          <ol>
            {items.map((item, i) => {
              const color =
                item.source === "admin"
                  ? "var(--cc-info)"
                  : item.severity === "success"
                    ? "var(--cc-success)"
                    : item.severity === "warning"
                      ? "var(--cc-warning)"
                      : item.severity === "error"
                        ? "var(--cc-error)"
                        : "var(--cc-text-4)";
              const body = (
                <div className="flex gap-3.5">
                  <div className="flex flex-col items-center pt-[6px]">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: color,
                        boxShadow: item.unread ? `0 0 0 3px ${color}22` : undefined,
                      }}
                    />
                    {i < items.length - 1 && (
                      <span aria-hidden="true" className="w-px flex-1" style={{ backgroundColor: "var(--cc-line)" }} />
                    )}
                  </div>
                  <div className={`min-w-0 flex-1 ${i < items.length - 1 ? "pb-5" : ""}`}>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="cc-label" style={{ color: "var(--cc-text-4)" }}>
                        {item.title}
                      </span>
                      {item.actor ? (
                        <span className="text-[11px]" style={{ color: "var(--cc-info)" }}>
                          · {item.actor}
                        </span>
                      ) : null}
                      {item.unread ? (
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--cc-accent)" }} />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-snug" style={{ color: "var(--cc-text-2)" }}>
                      {item.href ? (
                        <Link href={item.href} className="hover:underline">
                          {item.message}
                        </Link>
                      ) : (
                        item.message
                      )}
                    </p>
                    <p className="mt-0.5 text-xs tnum" title={dateTime(item.at)} style={{ color: "var(--cc-text-4)" }}>
                      {timeAgo(item.at)}
                    </p>
                  </div>
                </div>
              );
              return <li key={item.key}>{body}</li>;
            })}
          </ol>
        )}
      </Panel>
    </div>
  );
}
