import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { listOrders, type OrderFilters } from "@/lib/admin/data";
import { getProduct } from "@/lib/products";
import { money, dateShort, dateTime, shortId } from "@/components/admin/format";
import { ScrollFadeX } from "@/components/admin/smooth-scroll";import { Panel, PageHeading, EmptyState, StatusPill } from "@/components/admin/admin-ui";
import { OrderTableTools } from "@/components/admin/order-table-tools";
import type { OrderRow } from "@/lib/supabase/types";
import type { OrderStatus } from "@/lib/orders";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

/**
 * Orders — a serious management surface: search, status + product
 * filters, date window, and 25-row pages over the whole table. Every
 * row links to its full detail view. Filters live in the URL, so
 * pagination, the back button, and shared links all behave.
 */

type Sp = {
  q?: string;
  status?: string;
  product?: string;
  from?: string;
  to?: string;
  page?: string;
};

function pageHref(sp: Sp, next: number): string {
  const params = new URLSearchParams();
  if (sp.q) params.set("q", sp.q);
  if (sp.status) params.set("status", sp.status);
  if (sp.product) params.set("product", sp.product);
  if (sp.from) params.set("from", sp.from);
  if (sp.to) params.set("to", sp.to);
  if (next > 1) params.set("page", String(next));
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page) || 1);
  const known: (OrderStatus | "all")[] = [
    "all",
    "paid",
    "pending",
    "failed",
    "cancelled",
    "refunded",
  ];
  const status = known.includes(sp.status as OrderStatus)
    ? (sp.status as OrderStatus | "all")
    : "all";
  const filters: OrderFilters = {
    search: sp.q?.trim() || undefined,
    status: status === "all" ? undefined : status,
    productSlug: sp.product?.trim() || undefined,
    from: sp.from ? new Date(sp.from) : undefined,
    to: sp.to ? new Date(`${sp.to}T23:59:59`) : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
  const result = await listOrders(filters);
  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeading
        title="Orders"
        meta={
          result
            ? `${total.toLocaleString()} order${total === 1 ? "" : "s"}`
            : "Database not connected"
        }
      />

      <OrderTableTools statuses={known} />

      <div className="mt-4">
        <Panel padded={false}>
          {!result ? (
            <EmptyState
              title="Database not connected"
              body="Add your Supabase credentials to .env.local to see real orders."
            />
          ) : result.rows.length === 0 ? (
            <EmptyState
              title={total === 0 ? "No orders yet" : "No orders match these filters"}
              body={
                total === 0
                  ? "Your first Veyra sale will appear here the moment it's confirmed."
                  : "Try widening the date range or clearing the search."
              }
            />
          ) : (
            <>
              <ScrollFadeX>
                <table className="cc-table min-w-full">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th className="text-right">Amount</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((o) => (
                      <OrderLine key={o.id} order={o} />
                    ))}
                  </tbody>
                </table>
              </ScrollFadeX>
              {pages > 1 && (
                <div
                  className="flex items-center justify-between border-t px-4 py-3 text-xs"
                  style={{ borderColor: "var(--cc-line)", color: "var(--cc-text-3)" }}
                >
                  <span className="tnum">
                    Page {page} of {pages}
                  </span>
                  <div className="flex gap-2">
                    {page > 1 ? (
                      <Link
                        href={pageHref(sp, page - 1)}
                        className="inline-flex h-7 items-center rounded-sm border px-2.5 transition-colors hover:bg-[var(--cc-surface-2)]"
                        style={{ borderColor: "var(--cc-line-strong)" }}
                      >
                        Previous
                      </Link>
                    ) : null}
                    {page < pages ? (
                      <Link
                        href={pageHref(sp, page + 1)}
                        className="inline-flex h-7 items-center rounded-sm border px-2.5 transition-colors hover:bg-[var(--cc-surface-2)]"
                        style={{ borderColor: "var(--cc-line-strong)" }}
                      >
                        Next
                      </Link>
                    ) : null}
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

function OrderLine({ order }: { order: OrderRow }) {
  const product = getProduct(order.product_slug);
  const paymentCell =
    order.status === "paid" ? (
      <span style={{ color: "var(--cc-success)" }}>Confirmed</span>
    ) : order.status === "failed" ? (
      <span style={{ color: "var(--cc-error)" }}>Failed</span>
    ) : order.status === "pending" ? (
      <span style={{ color: "var(--cc-warning)" }}>Awaiting</span>
    ) : (
      <span style={{ color: "var(--cc-text-4)" }}>—</span>
    );
  return (
    <tr>
      <td>
        <Link
          href={`/admin/orders/${order.id}`}
          className="font-mono text-xs transition-opacity hover:opacity-80"
          style={{ color: "var(--cc-accent-ink)" }}
        >
          {shortId(order.id)}
        </Link>
      </td>
      <td className="max-w-[200px] truncate" style={{ color: "var(--cc-text)" }}>
        {order.email}
      </td>
      <td className="max-w-[180px] truncate">{product?.name ?? order.product_slug}</td>
      <td className="text-right font-medium tnum" style={{ color: "var(--cc-text)" }}>
        {money(order.amount, order.currency)}
        {order.coupon_code ? (
          <span className="ml-1.5 text-[10px]" style={{ color: "var(--cc-text-4)" }}>
            {order.coupon_code.toUpperCase()}
          </span>
        ) : null}
      </td>
      <td className="whitespace-nowrap">{paymentCell}</td>
      <td>
        <StatusPill status={order.status} />
      </td>
      <td className="whitespace-nowrap" title={dateTime(order.created_at)} style={{ color: "var(--cc-text-4)" }}>
        {dateShort(order.created_at)}
      </td>
    </tr>
  );
}
