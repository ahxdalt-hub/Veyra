import type { Metadata } from "next";
import Link from "next/link";
import { listOrders, adminDataLocal } from "@/lib/admin/data";
import type { OrderStatus } from "@/lib/orders";
import {
  OrderStatusBadgeCC,
  formatMinorAmount,
  formatDateTime,
  orderRef,
  EmptyState,
} from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Payments — Command Center",
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

/**
 * /admin/payments — payment overview. Each payment attempt is an order
 * row (one row per Razorpay order); status is the payment state.
 * Provider references are shown as identifiers only — no secrets exist
 * in this projection.
 */

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const status = STATUS_OPTIONS.includes(sp.status as OrderStatus)
    ? (sp.status as OrderStatus | "all")
    : "all";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const result = await listOrders({ status, page, perPage: 20 }).catch(
    () => null
  );
  const totalPages = result
    ? Math.max(1, Math.ceil(result.total / result.perPage))
    : 1;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="spec text-cc-text-4">Business Operations</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
            Payments
          </h1>
        </div>
        <p className="text-xs text-cc-text-3">
          Provider: Razorpay · {result ? `${result.total} ${result.total === 1 ? "record" : "records"}` : "Unavailable"}
        </p>
      </div>

      <form
        method="get"
        action="/admin/payments"
        className="cc-edge mt-5 flex flex-wrap items-center gap-2 rounded-md border border-cc-line bg-cc-panel p-2.5"
      >
        <select
          name="status"
          defaultValue={status}
          aria-label="Filter by payment state"
          className="h-9 rounded-sm border border-cc-line bg-cc-bg px-2 text-sm text-cc-text-2 focus:border-cc-accent focus:outline-none"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All states" : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 rounded-sm bg-cc-accent px-4 text-sm font-medium text-cc-bg transition-colors hover:bg-cc-accent-deep"
        >
          Apply
        </button>
        {status !== "all" ? (
          <Link
            href="/admin/payments"
            className="h-9 rounded-sm border border-cc-line px-3 text-sm leading-9 text-cc-text-3 transition-colors hover:text-cc-text"
          >
            Reset
          </Link>
        ) : null}
      </form>

      <div className="cc-edge mt-4 overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        {result === null ? (
          <EmptyState
            title="Payments unavailable"
            hint="The database could not be reached. Retry shortly."
          />
        ) : result.rows.length === 0 ? (
          <EmptyState
            title={result.total === 0 ? "No payments in this state" : "No payments yet"}
            hint={
              result.total === 0
                ? "Payment attempts appear here as they happen."
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead>
                <tr className="border-b border-cc-line text-cc-text-4">
                  <th scope="col" className="px-4 py-2.5 text-left spec">Reference</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Customer</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Product</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Amount</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Provider ref</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">State</th>
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
                        href={`/admin/orders?focus=${o.id}`}
                        className="font-mono text-xs text-cc-accent hover:underline"
                      >
                        {orderRef(o.id)}
                      </Link>
                    </td>
                    <td className="max-w-48 truncate px-4 py-3 text-cc-text-2">
                      {o.email}
                    </td>
                    <td className="px-4 py-3 text-cc-text-2">{o.productName}</td>
                    <td className="tnum px-4 py-3 text-cc-text">
                      {formatMinorAmount(o.amount, o.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {o.razorpay_payment_id ? (
                        <span className="font-mono text-[0.6875rem] text-cc-text-3" title={o.razorpay_payment_id}>
                          pay…{o.razorpay_payment_id.slice(-8)}
                        </span>
                      ) : o.razorpay_order_id ? (
                        <span className="font-mono text-[0.6875rem] text-cc-text-4" title={o.razorpay_order_id}>
                          order…{o.razorpay_order_id.slice(-8)}
                        </span>
                      ) : (
                        <span className="text-cc-text-4">—</span>
                      )}
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

        {result && totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-cc-line px-4 py-3">
            <p className="text-xs text-cc-text-3">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={`/admin/payments?status=${status}&page=${page - 1}`}
                  className="rounded-sm border border-cc-line px-3 py-1.5 text-xs text-cc-text-2 transition-colors hover:border-cc-line-strong hover:text-cc-text"
                >
                  ← Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={`/admin/payments?status=${status}&page=${page + 1}`}
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
          Local mode — payment records read from the in-memory dev store.
        </p>
      ) : null}
    </div>
  );
}
