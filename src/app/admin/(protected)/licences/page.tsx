import type { Metadata } from "next";
import Link from "next/link";
import { listLicences, adminDataLocal } from "@/lib/admin/data";
import {
  formatDateOnly,
  AccessBadge,
  EmptyState,
  CopyableId,
} from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Licences — Command Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LicencesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; focus?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const status =
    sp.status === "active" || sp.status === "revoked" ? sp.status : "all";

  const licences = await listLicences({
    query: q,
    status,
  }).catch(() => null);

  const focus = sp.focus ?? null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="spec text-cc-text-4">Business Operations</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
            Licences
          </h1>
        </div>
        <p className="text-xs text-cc-text-3">
          {licences === null
            ? "Unavailable"
            : `${licences.length} ${licences.length === 1 ? "licence" : "licences"}${q ? ` matching “${q}”` : ""}`}
        </p>
      </div>

      <form
        method="get"
        action="/admin/licences"
        className="cc-edge mt-5 flex flex-wrap items-center gap-2 rounded-md border border-cc-line bg-cc-panel p-2.5"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search: licence reference, email, product…"
          aria-label="Search licences"
          className="h-9 min-w-44 flex-1 rounded-sm border border-cc-line bg-cc-bg px-3 text-sm text-cc-text placeholder:text-cc-text-4 focus:border-cc-accent focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status}
          aria-label="Filter by status"
          className="h-9 rounded-sm border border-cc-line bg-cc-bg px-2 text-sm text-cc-text-2 focus:border-cc-accent focus:outline-none"
        >
          <option value="all">All statuses</option>
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
            href="/admin/licences"
            className="h-9 rounded-sm border border-cc-line px-3 text-sm leading-9 text-cc-text-3 transition-colors hover:text-cc-text"
          >
            Reset
          </Link>
        ) : null}
      </form>

      <div className="cc-edge mt-4 overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        {licences === null ? (
          <EmptyState
            title="Licences unavailable"
            hint="The database could not be reached. Retry shortly."
          />
        ) : licences.length === 0 ? (
          <EmptyState
            title={q ? "No licences match" : "No licences yet"}
            hint={
              q
                ? "No licence matches that search."
                : "A licence is issued with each paid order's entitlement."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead>
                <tr className="border-b border-cc-line text-cc-text-4">
                  <th scope="col" className="px-4 py-2.5 text-left spec">Reference</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Customer</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Product</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Seats</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Issued</th>
                  <th scope="col" className="px-4 py-2.5 text-left spec">Licence ID</th>
                </tr>
              </thead>
              <tbody>
                {licences.map((l) => (
                  <tr
                    key={l.id}
                    className={`border-b border-cc-line/50 transition-colors last:border-b-0 hover:bg-cc-panel-2 ${
                      focus === l.id ? "bg-cc-accent-soft/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-cc-accent">
                        {l.licenceReference}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers?focus=${encodeURIComponent(l.email)}`}
                        className="block max-w-48 truncate text-cc-text-2 hover:text-cc-accent"
                      >
                        {l.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-cc-text-2">{l.productName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-cc-text-3 tnum">
                      {l.activatedSeats} / {l.seats}
                      {l.seats - l.activatedSeats > 0 ? (
                        <span className="ml-1.5 text-cc-text-4">
                          · {l.seats - l.activatedSeats} free
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <AccessBadge status={l.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-cc-text-3">
                      {formatDateOnly(l.issuedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <CopyableId value={l.id} label="licence ID" />
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
          Local mode — licences live in Supabase and read as zero without
          the service key.
        </p>
      ) : null}
    </div>
  );
}
