import Link from "next/link";
import type { Metadata } from "next";
import { listCustomers, adminDataLocal } from "@/lib/admin/data";
import {
  formatMinorAmount,
  formatDateOnly,
  EmptyState,
} from "@/components/admin/admin-ui";
import { CustomerDetailDrawer } from "@/components/admin/customer-drawer";

export const metadata: Metadata = {
  title: "Customers — Command Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; focus?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";

  const customers = await listCustomers({ query: q }).catch(() => null);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="spec text-cc-text-4">Business Operations</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
            Customers
          </h1>
        </div>
        <p className="text-xs text-cc-text-3">
          {customers === null
            ? "Unavailable"
            : `${customers.length} ${customers.length === 1 ? "customer" : "customers"}${q ? ` matching “${q}”` : ""}`}
        </p>
      </div>

      <form
        method="get"
        action="/admin/customers"
        className="cc-edge mt-5 flex flex-wrap items-center gap-2 rounded-md border border-cc-line bg-cc-panel p-2.5"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search: email, name, business, customer id…"
          aria-label="Search customers"
          className="h-9 min-w-44 flex-1 rounded-sm border border-cc-line bg-cc-bg px-3 text-sm text-cc-text placeholder:text-cc-text-4 focus:border-cc-accent focus:outline-none"
        />
        <button
          type="submit"
          className="h-9 rounded-sm bg-cc-accent px-4 text-sm font-medium text-cc-bg transition-colors hover:bg-cc-accent-deep"
        >
          Search
        </button>
        {q ? (
          <Link
            href="/admin/customers"
            className="h-9 rounded-sm border border-cc-line px-3 text-sm leading-9 text-cc-text-3 transition-colors hover:text-cc-text"
          >
            Reset
          </Link>
        ) : null}
      </form>

      <div className="cc-edge mt-4 overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        {customers === null ? (
          <EmptyState
            title="Customers unavailable"
            hint="The database could not be reached. Retry shortly."
          />
        ) : customers.length === 0 ? (
          <EmptyState
            title={q ? "No customers match" : "No customers yet"}
            hint={
              q
                ? "No customer matches that search."
                : "Customers appear here with their first order."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead>
                <tr className="border-b border-cc-line text-cc-text-4">
                  <th scope="col" className="px-4 py-2.5 text-left spec">Customer</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Account</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Orders</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Paid</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Total spent</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Products</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Last purchase</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.key}
                    className="border-b border-cc-line/50 transition-colors last:border-b-0 hover:bg-cc-panel-2"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers?focus=${encodeURIComponent(c.key)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                        className="block max-w-56 truncate text-cc-text hover:text-cc-accent"
                      >
                        {c.name ?? c.email}
                      </Link>
                      {c.name ? (
                        <span className="block max-w-56 truncate text-xs text-cc-text-3">
                          {c.email}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {c.userId ? (
                        <span className="text-cc-good">Registered</span>
                      ) : (
                        <span className="text-cc-text-3">Guest</span>
                      )}
                    </td>
                    <td className="tnum px-4 py-3 text-cc-text-2">{c.orderCount}</td>
                    <td className="tnum px-4 py-3 text-cc-text-2">{c.paidOrders}</td>
                    <td className="tnum px-4 py-3 text-cc-text">
                      {formatMinorAmount(c.totalSpentMinor)}
                    </td>
                    <td className="max-w-44 truncate px-4 py-3 text-xs text-cc-text-3">
                      {c.productSlugs.length > 0 ? c.productSlugs.join(", ") : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-cc-text-3">
                      {c.lastPurchaseAt ? formatDateOnly(c.lastPurchaseAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adminDataLocal() ? (
        <p className="mt-4 text-xs text-cc-text-4">
          Local mode — customers derive from the in-memory dev store.
        </p>
      ) : null}

      <CustomerDetailDrawer />
    </div>
  );
}
