import Link from "next/link";
import type { Metadata } from "next";
import {
  listOrders,
  adminDataLocal,
} from "@/lib/admin/data";
import type { OrderStatus } from "@/lib/orders";
import { getAvailableProducts } from "@/lib/products";
import {
  OrderStatusBadgeCC,
  formatMinorAmount,
  formatDateTime,
  orderRef,
  EmptyState,
} from "@/components/admin/admin-ui";
import { OrderDetailDrawer } from "@/components/admin/order-drawer";

export const metadata: Metadata = {
  title: "Orders — Command Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: ("all" | OrderStatus)[] = [
  "all",
  "paid",
  "pending",
  "failed",
  "cancelled",
  "refunded",
];

type SearchParams = Promise<{
  q?: string;
  status?: string;
  product?: string;
  from?: string;
  to?: string;
  page?: string;
  focus?: string;
}>;

function buildQuery(
  base: Record<string, string | undefined>,
  patch: Record<string, string | undefined>
): string {
  const sp = new URLSearchParams();
  const merged = { ...base, ...patch };
  for (const [k, v] of Object.entries(merged)) {
    if (v && v !== "all" && !(k === "page" && v === "1")) sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = STATUS_OPTIONS.includes(sp.status as OrderStatus)
    ? (sp.status as OrderStatus | "all")
    : "all";
  const product = sp.product ?? "all";
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const result = await listOrders({
    query: q,
    status,
    product,
    from: sp.from || undefined,
    to: sp.to || undefined,
    page,
    perPage: 20,
  }).catch(() => null);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.perPage)) : 1;
  const products = getAvailableProducts();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="spec text-cc-text-4">Business Operations</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
            Orders
          </h1>
        </div>
        <p className="text-xs text-cc-text-3">
          {result
            ? `${result.total} ${result.total === 1 ? "order" : "orders"}${q ? ` matching “${q}”` : ""}`
            : "Unavailable"}
        </p>
      </div>

      {/* Filter bar */}
      <form
        method="get"
        action="/admin/orders"
        className="cc-edge mt-5 flex flex-wrap items-center gap-2 rounded-md border border-cc-line bg-cc-panel p-2.5"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search: order id, email, product…"
          aria-label="Search orders"
          className="h-9 min-w-44 flex-1 rounded-sm border border-cc-line bg-cc-bg px-3 text-sm text-cc-text placeholder:text-cc-text-4 focus:border-cc-accent focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Filter by status"
          className="h-9 rounded-sm border border-cc-line bg-cc-bg px-2 text-sm text-cc-text-2 focus:border-cc-accent focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          name="product"
          defaultValue={product}
          aria-label="Filter by product"
          className="h-9 rounded-sm border border-cc-line bg-cc-bg px-2 text-sm text-cc-text-2 focus:border-cc-accent focus:outline-none"
        >
          <option value="all">All products</option>
          {products.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={sp.from ?? ""}
          aria-label="From date"
          className="h-9 rounded-sm border border-cc-line bg-cc-bg px-2 text-sm text-cc-text-2 focus:border-cc-accent focus:outline-none"
        />
        <input
          type="date"
          name="to"
          defaultValue={sp.to ?? ""}
          aria-label="To date"
          className="h-9 rounded-sm border border-cc-line bg-cc-bg px-2 text-sm text-cc-text-2 focus:border-cc-accent focus:outline-none"
        />
        <button
          type="submit"
          className="h-9 rounded-sm bg-cc-accent px-4 text-sm font-medium text-cc-bg transition-colors hover:bg-cc-accent-deep"
        >
          Apply
        </button>
        {q || status !== "all" || product !== "all" || sp.from || sp.to ? (
          <Link
            href="/admin/orders"
            className="h-9 rounded-sm border border-cc-line px-3 text-sm leading-9 text-cc-text-3 transition-colors hover:text-cc-text"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {/* Table */}
      <div className="cc-edge mt-4 overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        {result === null ? (
          <EmptyState
            title="Orders unavailable"
            hint="The database could not be reached. Retry shortly or check Settings → System status."
          />
        ) : result.rows.length === 0 ? (
          <EmptyState
            title={result.total === 0 ? "No orders match" : "No orders yet"}
            hint={
              result.total === 0
                ? q || status !== "all"
                  ? "Nothing matches these filters. Clear them to see all orders."
                  : "Orders appear here the moment a checkout starts."
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead>
                <tr className="border-b border-cc-line text-cc-text-4">
                  <th scope="col" className="px-4 py-2.5 text-left spec">Order</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Customer</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Product</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Amount</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Date</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-cc-line/50 transition-colors last:border-b-0 hover:bg-cc-panel-2"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders?focus=${o.id}${q ? `&q=${encodeURIComponent(q)}` : ""}${status !== "all" ? `&status=${status}` : ""}${product !== "all" ? `&product=${product}` : ""}&page=${page}`}
                        className="font-mono text-xs text-cc-accent hover:underline"
                      >
                        {orderRef(o.id)}
                      </Link>
                    </td>
                    <td className="max-w-56 truncate px-4 py-3 text-cc-text-2">
                      {o.email}
                    </td>
                    <td className="px-4 py-3 text-cc-text-2">{o.productName}</td>
                    <td className="tnum px-4 py-3 text-cc-text">
                      {formatMinorAmount(o.amount, o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadgeCC status={o.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-cc-text-3">
                      {formatDateTime(o.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {result && totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-cc-line px-4 py-3">
            <p className="text-xs text-cc-text-3">
              Page {page} of {totalPages} · {result.total} total
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={buildQuery(sp as Record<string, string>, { page: String(page - 1) })}
                  className="rounded-sm border border-cc-line px-3 py-1.5 text-xs text-cc-text-2 transition-colors hover:border-cc-line-strong hover:text-cc-text"
                >
                  ← Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={buildQuery(sp as Record<string, string>, { page: String(page + 1) })}
                  className="rounded-sm border border-cc-line px-3 py-1.5 text-xs text-cc-text-2 transition-colors hover:border-cc-line-strong hover:text-cc-text"
                >
                  Next →
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {adminDataLocal() ? (
        <p className="mt-4 text-xs text-cc-text-4">
          Local mode — orders read from the in-memory dev store.
        </p>
      ) : null}

      <OrderDetailDrawer />
    </div>
  );
}
