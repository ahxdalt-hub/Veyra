import type { Metadata } from "next";
import Link from "next/link";
import { listEntitlements, adminDataLocal } from "@/lib/admin/data";
import { getProducts } from "@/lib/products";
import {
  formatDateOnly,
  AccessBadge,
  EmptyState,
} from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Delivery — Command Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/delivery — product access management. Every entitlement is a
 * delivered product: who holds it, which version they're on (vs. the
 * catalog's current version), and access state. The catalog's version
 * is the authoritative "latest" — customers reach it via the account
 * library and re-delivery requests, which the account area records.
 */

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const status =
    sp.status === "active" || sp.status === "revoked" ? sp.status : "all";

  const entitlements = await listEntitlements({
    query: q,
    status,
  }).catch(() => null);

  const catalog = new Map(
    getProducts().map((p) => [p.slug, p])
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="spec text-cc-text-4">Business Operations</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
            Delivery
          </h1>
        </div>
        <p className="text-xs text-cc-text-3">
          {entitlements === null
            ? "Unavailable"
            : `${entitlements.length} ${entitlements.length === 1 ? "entitlement" : "entitlements"}${q ? ` matching “${q}”` : ""}`}
        </p>
      </div>

      <form
        method="get"
        action="/admin/delivery"
        className="cc-edge mt-5 flex flex-wrap items-center gap-2 rounded-md border border-cc-line bg-cc-panel p-2.5"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search: email, product, entitlement id…"
          aria-label="Search delivery records"
          className="h-9 min-w-44 flex-1 rounded-sm border border-cc-line bg-cc-bg px-3 text-sm text-cc-text placeholder:text-cc-text-4 focus:border-cc-accent focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Filter by access status"
          className="h-9 rounded-sm border border-cc-line bg-cc-bg px-2 text-sm text-cc-text-2 focus:border-cc-accent focus:outline-none"
        >
          <option value="all">All access states</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
        </select>
        <button
          type="submit"
          className="h-9 rounded-sm bg-cc-accent px-4 text-sm font-medium text-cc-bg transition-colors hover:bg-cc-accent-deep"
        >
          Apply
        </button>
        {q || status !== "all" ? (
          <Link
            href="/admin/delivery"
            className="h-9 rounded-sm border border-cc-line px-3 text-sm leading-9 text-cc-text-3 transition-colors hover:text-cc-text"
          >
            Reset
          </Link>
        ) : null}
      </form>

      <div className="cc-edge mt-4 overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        {entitlements === null ? (
          <EmptyState
            title="Delivery unavailable"
            hint="The database could not be reached. Retry shortly."
          />
        ) : entitlements.length === 0 ? (
          <EmptyState
            title={q ? "No records match" : "No deliveries yet"}
            hint={
              q
                ? "No entitlement matches that search."
                : "An entitlement is created for each paid order — access follows it."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead>
                <tr className="border-b border-cc-line text-cc-text-4">
                  <th scope="col" className="px-4 py-2.5 text-left spec">Customer</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Product</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Seats</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Version</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Latest</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Access</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Delivered</th>
                </tr>
              </thead>
              <tbody>
                {entitlements.map((e) => {
                  const latest = catalog.get(e.productSlug)?.version ?? null;
                  const current =
                    latest === null || e.version === latest;
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-cc-line/50 transition-colors last:border-b-0 hover:bg-cc-panel-2"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/customers?focus=${encodeURIComponent(e.email)}`}
                          className="block max-w-48 truncate text-cc-text-2 hover:text-cc-accent"
                        >
                          {e.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-cc-text-2">{e.productName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-cc-text-3 tnum">
                        {e.activatedSeats} / {e.seats}
                      </td>
                      <td className="px-4 py-3 text-cc-text-2">
                        {e.version ? `v${e.version}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {current ? (
                          <span className="text-cc-good">Up to date{latest ? ` (v${latest})` : ""}</span>
                        ) : (
                          <span className="text-cc-accent" title="Customer is on an older version — their account library always serves the latest; re-delivery requests are logged.">
                            v{latest} available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <AccessBadge status={e.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-cc-text-3">
                        {formatDateOnly(e.grantedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adminDataLocal() ? (
        <p className="mt-4 text-xs text-cc-text-4">
          Local mode — entitlement records live in Supabase and read as zero
          without the service key.
        </p>
      ) : null}
    </div>
  );
}
