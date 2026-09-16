import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getProductStats } from "@/lib/admin/data";
import { products } from "@/lib/products";
import { REGULAR_PRICE, FOUNDING_PRICE } from "@/lib/pricing";
import { site } from "@/lib/site";
import { money } from "@/components/admin/format";
import { ScrollFadeX } from "@/components/admin/smooth-scroll";import { Panel, PageHeading, StatusPill } from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

/**
 * Products — the web catalog (src/lib/products.ts) is the display source
 * of truth; this page joins it against real sales, licences, and the
 * server-side registry. Pricing edits ship with the code (single
 * commercial authority: src/lib/pricing.ts) — a UI field that disagreed
 * with what checkout charges would be a lie, so this page reads and
 * operates, never invents.
 */

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const sp = await searchParams;
  const focus = sp.focus;

  const stats = await getProductStats();
  const product = focus ? products.find((p) => p.slug === focus) : null;

  return (
    <div>
      <PageHeading
        title="Products"
        meta={`${products.filter((p) => p.status === "available").length} available · ${products.length} in the Veyra collection`}
      />

      {product ? (
        <Panel title={product.name} padded={false}>
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="border-b p-5 lg:border-b-0 lg:border-r" style={{ borderColor: "var(--cc-line)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "var(--cc-text-2)" }}>
                {product.description}
              </p>
              <dl className="mt-5 space-y-2 text-sm">
                <Row k="Pricing" v={`Founding $${FOUNDING_PRICE}/seat · regular $${REGULAR_PRICE}/seat (1–5 seats)`} />
                <Row k="Current version" v={product.version ?? "not set"} />
                <Row k="Availability" v={product.status === "available" ? "On sale" : "Coming soon"} />
                <Row k="Category" v={product.tagline} />
                <Row k="Storefront" v={
                  <Link href={`/products/${product.slug}`} target="_blank" className="hover:underline" style={{ color: "var(--cc-accent-ink)" }}>
                    {site.url}/products/{product.slug}
                  </Link>
                } />
              </dl>
            </div>
            <div className="p-5">
              <p className="cc-label mb-4">Performance · all time</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Figure label="Revenue" value={money(stats[product.slug]?.revenue ?? 0)} />
                <Figure label="Paid orders" value={String(stats[product.slug]?.paidOrders ?? 0)} />
                <Figure label="Seats sold" value={String(stats[product.slug]?.units ?? 0)} />
                <Figure label="Licences" value={`${stats[product.slug]?.activeLicences ?? 0} active / ${stats[product.slug]?.licences ?? 0} total`} />
              </div>
              <p className="mt-6 text-xs leading-relaxed" style={{ color: "var(--cc-text-4)" }}>
                Sales come from paid orders; licences from grants. Both are
                live aggregates — nothing here is estimated.
              </p>
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel padded={false}>
        <ScrollFadeX>
          <table className="cc-table min-w-full">
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Price</th>
                <th className="text-right">Seats sold</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Licences</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const s = stats[p.slug];
                return (
                  <tr key={p.slug}>
                    <td>
                      <Link
                        href={`/admin/products?focus=${encodeURIComponent(p.slug)}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--cc-text)" }}
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td><StatusPill status={p.status === "available" ? "available" : "coming-soon"} /></td>
                    <td className="tnum">
                      {p.price !== null ? `$${p.price} · founding $${FOUNDING_PRICE}` : "—"}
                    </td>
                    <td className="text-right tnum">{s?.units ?? 0}</td>
                    <td className="text-right font-medium tnum" style={{ color: "var(--cc-text)" }}>
                      {money(s?.revenue ?? 0)}
                    </td>
                    <td className="text-right tnum">{s?.activeLicences ?? 0}{s?.licences ? ` / ${s.licences}` : ""}</td>
                    <td className="tnum">{p.version ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollFadeX>
      </Panel>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-xs" style={{ color: "var(--cc-text-4)" }}>{k}</dt>
      <dd className="text-right" style={{ color: "var(--cc-text-2)" }}>{v}</dd>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="cc-label" style={{ color: "var(--cc-text-4)" }}>{label}</p>
      <p className="cc-figure mt-1.5 text-lg font-medium" style={{ color: "var(--cc-text)" }}>{value}</p>
    </div>
  );
}
