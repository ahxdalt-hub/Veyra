import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { listOrders, type OrderFilters } from "@/lib/admin/data";
import { PageHeading, EmptyState } from "@/components/admin/admin-ui";
import { OrderTableTools } from "@/components/admin/order-table-tools";
import { LiveOrdersTable, type LiveOrdersQuery } from "@/components/admin/live-orders";
import type { OrderStatus } from "@/lib/orders";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

/**
 * Orders — a serious management surface: search, status + product
 * filters, date window, and 25-row pages over the whole table. Every
 * row links to its full detail view. Filters live in the URL, so
 * pagination, the back button, and shared links all behave.
 *
 * The table is live: after the server's first load, LiveOrdersTable
 * polls /api/admin/orders in place — new rows flash in, status changes
 * update without a reload.
 */

type Sp = {
  q?: string;
  status?: string;
  product?: string;
  from?: string;
  to?: string;
  page?: string;
};

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

  const query: LiveOrdersQuery = {
    q: sp.q ?? "",
    status: sp.status ?? "all",
    product: sp.product ?? "",
    from: sp.from ?? "",
    to: sp.to ?? "",
  };

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
        {!result ? (
          <EmptyState
            title="Database not connected"
            body="Add your Supabase credentials to .env.local to see real orders."
          />
        ) : (
          <LiveOrdersTable
            initial={{
              rows: result.rows,
              total: result.total,
              page,
              pages,
            }}
            query={query}
          />
        )}
      </div>
    </div>
  );
}
