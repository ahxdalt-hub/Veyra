import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { listCoupons } from "@/lib/admin/data";
import { dateShort, timeAgo } from "@/components/admin/format";
import { ScrollFadeX } from "@/components/admin/smooth-scroll";import { Panel, PageHeading, EmptyState } from "@/components/admin/admin-ui";
import { CouponToolbar } from "@/components/admin/coupon-toolbar";

export const metadata: Metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

/**
 * Coupons — real discount codes enforced server-side at checkout
 * (validate_coupon, 0013). This page manages those same rows: create,
 * edit, deactivate, reactivate — every change takes effect on the next
 * customer order immediately.
 */

type Sp = { focus?: string };

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const sp = await searchParams;
  const coupons = await listCoupons();

  return (
    <div>
      <PageHeading
        title="Coupons"
        meta={
          coupons
            ? `${coupons.filter((c) => c.active).length} active · enforced at checkout server-side`
            : "Database not connected"
        }
      />

      <CouponToolbar focus={sp.focus ?? null} coupons={coupons ?? []} />

      <div className="mt-4">
        <Panel padded={false}>
          {!coupons ? (
            <EmptyState
              title="Database not connected"
              body="Add your Supabase credentials to manage coupons."
            />
          ) : coupons.length === 0 ? (
            <EmptyState
              title="No coupons yet"
              body="Create a code and it works at checkout immediately — with real usage limits and tracking."
            />
          ) : (
            <ScrollFadeX>
              <table className="cc-table min-w-full">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Window</th>
                    <th className="text-right">Usage</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => {
                    const expired = c.ends_at ? new Date(c.ends_at) < new Date() : false;
                    const exhausted = c.max_uses !== null && c.used_count >= c.max_uses;
                    return (
                      <tr key={c.code}>
                        <td>
                          <span className="font-mono text-sm font-medium" style={{ color: "var(--cc-text)" }}>
                            {c.code.toUpperCase()}
                          </span>
                          <span className="block max-w-[220px] truncate text-xs" style={{ color: "var(--cc-text-4)" }}>
                            {c.label}
                          </span>
                        </td>
                        <td className="tnum" style={{ color: "var(--cc-text-2)" }}>
                          {c.kind === "percent" ? `${c.value}% off` : `$${c.value} off`}
                          {c.min_subtotal ? (
                            <span className="block text-xs" style={{ color: "var(--cc-text-4)" }}>
                              min ${c.min_subtotal}
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap text-xs" style={{ color: "var(--cc-text-4)" }}>
                          {c.starts_at || c.ends_at
                            ? `${c.starts_at ? dateShort(c.starts_at) : "…"} → ${c.ends_at ? dateShort(c.ends_at) : "…"}`
                            : "No expiry"}
                        </td>
                        <td className="text-right tnum">
                          <span style={{ color: "var(--cc-text)" }}>{c.used_count}</span>
                          <span style={{ color: "var(--cc-text-4)" }}>
                            {c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                          </span>
                          {c.per_customer_limit ? (
                            <span className="block text-xs" style={{ color: "var(--cc-text-4)" }}>
                              {c.per_customer_limit}/customer
                            </span>
                          ) : null}
                        </td>
                        <td>
                          {!c.active ? (
                            <CouponBadge label="inactive" color="var(--cc-text-4)" />
                          ) : expired ? (
                            <CouponBadge label="expired" color="var(--cc-info)" />
                          ) : exhausted ? (
                            <CouponBadge label="used up" color="var(--cc-warning)" />
                          ) : (
                            <CouponBadge label="active" color="var(--cc-success)" />
                          )}
                        </td>
                        <td className="whitespace-nowrap" style={{ color: "var(--cc-text-4)" }}>
                          {timeAgo(c.created_at)}
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/admin/coupons?focus=${encodeURIComponent(c.code)}`}
                            className="text-xs hover:underline"
                            style={{ color: "var(--cc-accent-ink)" }}
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollFadeX>
          )}
        </Panel>
      </div>
    </div>
  );
}

function CouponBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ borderColor: "var(--cc-line)", color }}
    >
      <span aria-hidden="true" className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
