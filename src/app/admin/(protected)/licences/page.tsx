import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { listLicences, getLicenceSeatStats, getLicenceProductName } from "@/lib/admin/data";
import { getProduct, products } from "@/lib/products";
import { dateTime, dateShort, timeAgo } from "@/components/admin/format";
import { ScrollFadeX } from "@/components/admin/smooth-scroll";import { Panel, PageHeading, EmptyState, StatusPill } from "@/components/admin/admin-ui";
import { UrlSearchInput } from "@/components/admin/url-search-input";
import { UrlSelect } from "@/components/admin/url-select";
import { Pager } from "@/components/admin/pager";
import { LicenceDrawerHost } from "@/components/admin/licence-drawer-host";

export const metadata: Metadata = { title: "Licences" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

/**
 * Licences — the complete registry: reference, holder, product, status,
 * seats, active devices, issued/last-activation. Clicking a reference
 * opens the full licence drawer (activations, entitlement,
 * revoke/reactivate/release-device — real backend operations behind
 * strong confirmations).
 */

type Sp = { q?: string; status?: string; product?: string; focus?: string; page?: string };

export default async function LicencesPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = sp.status === "active" || sp.status === "revoked" ? sp.status : undefined;
  const focus = sp.focus && /^[0-9a-f-]{36}$/i.test(sp.focus) ? sp.focus : null;

  const [result, focusProductSlug] = await Promise.all([
    listLicences({
      search: sp.q?.trim() || undefined,
      status,
      productSlug: sp.product?.trim() || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    focus ? getLicenceProductName(focus) : Promise.resolve(null),
  ]);
  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Seat/device stats for just this page's rows (two bounded queries).
  const stats = result ? await getLicenceSeatStats(result.rows.map((l) => l.id)) : {};

  return (
    <div>
      <PageHeading
        title="Licences"
        meta={result ? `${total.toLocaleString()} licence${total === 1 ? "" : "s"}` : "Database not connected"}
      />

      <div className="flex flex-wrap items-center gap-2">
        <UrlSearchInput placeholder="Search reference or email…" className="w-64" />
        <UrlSelect
          param="status"
          label="Filter by status"
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "revoked", label: "Revoked" },
          ]}
        />
        <UrlSelect
          param="product"
          label="Filter by product"
          options={[
            { value: "", label: "All products" },
            ...products.map((p) => ({ value: p.slug, label: p.name })),
          ]}
        />
      </div>

      <div className="mt-4">
        <Panel padded={false}>
          {!result ? (
            <EmptyState title="Database not connected" body="Add your Supabase credentials to see real licences." />
          ) : result.rows.length === 0 ? (
            <EmptyState
              title={total === 0 ? "No licences yet" : "No licences match"}
              body={
                total === 0
                  ? "Every completed purchase issues a perpetual licence automatically — it will appear here."
                  : "Try clearing the filters above."
              }
            />
          ) : (
            <>
              <ScrollFadeX>
                <table className="cc-table min-w-full">
                  <thead>
                    <tr>
                      <th>Licence</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Status</th>
                      <th className="text-right">Seats</th>
                      <th className="text-right">Devices</th>
                      <th>Issued</th>
                      <th>Last activation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((l) => {
                      const s = stats[l.id];
                      const product = getProduct(l.product_slug);
                      return (
                        <tr key={l.id}>
                          <td>
                            <Link
                              href={`/admin/licences?focus=${l.id}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}${status ? `&status=${status}` : ""}`}
                              className="font-mono text-xs transition-opacity hover:opacity-80"
                              style={{ color: "var(--cc-accent-ink)" }}
                            >
                              {l.licence_reference}
                            </Link>
                          </td>
                          <td className="max-w-[200px] truncate" style={{ color: "var(--cc-text)" }}>
                            {l.email}
                          </td>
                          <td className="max-w-[170px] truncate">{product?.name ?? l.product_slug}</td>
                          <td><StatusPill status={l.status} /></td>
                          <td className="text-right tnum">{s?.seats ?? "—"}</td>
                          <td className="text-right tnum">{s?.activeDevices ?? 0}</td>
                          <td className="whitespace-nowrap" style={{ color: "var(--cc-text-4)" }} title={dateTime(l.issued_at)}>
                            {dateShort(l.issued_at)}
                          </td>
                          <td className="whitespace-nowrap" style={{ color: "var(--cc-text-4)" }}>
                            {s?.lastActivation ? timeAgo(s.lastActivation) : "never"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollFadeX>
              <Pager page={page} pages={pages} basePath="/admin/licences" filters={{ q: sp.q, status: sp.status, product: sp.product }} />
            </>
          )}
        </Panel>
      </div>

      <LicenceDrawerHost
        focus={focus}
        productName={
          focusProductSlug
            ? getProduct(focusProductSlug)?.name ?? focusProductSlug
            : "Veyra product"
        }
      />
    </div>
  );
}
