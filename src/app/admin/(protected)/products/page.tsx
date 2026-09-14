import type { Metadata } from "next";
import Link from "next/link";
import { listProductStats } from "@/lib/admin/data";
import {
  formatMinorAmount,
  EmptyState,
} from "@/components/admin/admin-ui";

export const metadata: Metadata = {
  title: "Products — Command Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/products — the Veyra ecosystem with REAL performance per
 * product. Read-only by design: the catalog's single source of truth is
 * src/lib/products.ts, which drives checkout pricing server-side —
 * editing prices here would fork that truth. Available products show
 * real sales; coming-soon products show their true state, never fake
 * performance.
 */

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const sp = await searchParams;
  const products = await listProductStats().catch(() => null);
  const focus = sp.focus ?? null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="spec text-cc-text-4">Business Operations</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
            Products
          </h1>
        </div>
        <p className="text-xs text-cc-text-3">
          Catalog: {products?.length ?? "—"} products · pricing resolves
          server-side at checkout
        </p>
      </div>

      {products === null ? (
        <div className="cc-edge mt-5 rounded-md border border-cc-line bg-cc-panel">
          <EmptyState
            title="Products unavailable"
            hint="Statistics could not be loaded from the database."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {products.map((p) => {
            const isFocus = focus === p.slug;
            const available = p.status === "available";
            return (
              <article
                key={p.slug}
                id={`product-${p.slug}`}
                className={`cc-edge rounded-md border bg-cc-panel p-5 transition-shadow ${
                  isFocus
                    ? "border-cc-accent/50 shadow-[0_0_0_3px_rgba(201,151,63,0.15)]"
                    : "border-cc-line"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-display text-[1.0625rem] font-medium text-cc-text">
                        {p.name}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-xs border px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider ${
                          available
                            ? "border-cc-good/40 bg-cc-good-soft text-cc-good"
                            : "border-cc-line-strong bg-cc-panel-3 text-cc-text-3"
                        }`}
                      >
                        {available ? "Available" : "Coming soon"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-cc-text-3">{p.tagline}</p>
                  </div>
                  <p className="tnum shrink-0 font-display text-xl font-medium text-cc-accent">
                    {p.price !== null ? `$${p.price}` : "—"}
                  </p>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                  <div>
                    <dt className="spec text-cc-text-4">Sales</dt>
                    <dd className="tnum mt-0.5 text-sm text-cc-text">
                      {available ? p.sales : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="spec text-cc-text-4">Revenue</dt>
                    <dd className="tnum mt-0.5 text-sm text-cc-text">
                      {available ? formatMinorAmount(p.revenueMinor) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="spec text-cc-text-4">Entitlements</dt>
                    <dd className="tnum mt-0.5 text-sm text-cc-text">
                      {available ? p.activeEntitlements : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="spec text-cc-text-4">Licences</dt>
                    <dd className="tnum mt-0.5 text-sm text-cc-text">
                      {available ? p.licenceCount : "—"}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 border-t border-cc-line/60 pt-3 text-xs leading-relaxed text-cc-text-3">
                  {available
                    ? `Version ${p.version} · USD ${formatMinorAmount((p.price ?? 0) * 100)} · storefront: `
                    : "In development — no price, no checkout path. Storefront: "}
                  <Link
                    href={`/products/${p.slug}`}
                    className="text-cc-accent hover:underline"
                  >
                    /products/{p.slug}
                  </Link>
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
