import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { listCustomers, getCustomerProfile, commandCenterConfigured } from "@/lib/admin/data";
import { getProduct } from "@/lib/products";
import { money, dateShort, dateTime, timeAgo, shortId } from "@/components/admin/format";
import { ScrollFadeX } from "@/components/admin/smooth-scroll";import { Panel, PageHeading, EmptyState, StatusPill, CopyChip, KV } from "@/components/admin/admin-ui";
import { UrlSearchInput } from "@/components/admin/url-search-input";
import type { OrderRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

/**
 * Customers — customer intelligence, not a user list: purchase rollups
 * computed in the database (admin_customer_rollups), a revenue
 * leaderboard, and a complete per-customer profile when one is opened.
 */

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; email?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const sp = await searchParams;
  const email = sp.email?.trim().toLowerCase();

  return (
    <div>
      <PageHeading
        title="Customers"
        meta={
          commandCenterConfigured()
            ? "Every Veyra account and purchaser · revenue from real paid orders"
            : "Database not connected"
        }
      />

      {email ? (
        <CustomerDetail email={email} />
      ) : (
        <>
          <UrlSearchInput placeholder="Search by name, username, or email…" />
          <div className="mt-4 grid gap-5 xl:grid-cols-[2fr_1fr]">
            <CustomerList search={sp.q} />
            <Leaderboard />
          </div>
        </>
      )}
    </div>
  );
}

async function CustomerList({ search }: { search?: string }) {
  const rows = await listCustomers({ search, limit: 50 });
  if (!rows) {
    return (
      <Panel title="Customers">
        <EmptyState
          title="Database not connected"
          body="Add your Supabase credentials to see real customers."
        />
      </Panel>
    );
  }
  if (rows.length === 0) {
    return (
      <Panel title="Customers">
        <EmptyState
          title="No customers with purchases yet"
          body="Every Veyra purchaser — account-holder or guest — appears here with their lifetime value."
        />
      </Panel>
    );
  }
  return (
    <Panel title={`Customers (${rows.length})`} padded={false}>
      <ScrollFadeX>
        <table className="cc-table min-w-full">
          <thead>
            <tr>
              <th>Customer</th>
              <th className="text-right">Orders</th>
              <th className="text-right">Revenue</th>
              <th className="text-right">Licences</th>
              <th>First</th>
              <th>Latest</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.email}>
                <td>
                  <Link
                    href={`/admin/customers?email=${encodeURIComponent(c.email)}`}
                    className="block max-w-[220px] truncate font-medium hover:underline"
                    style={{ color: "var(--cc-text)" }}
                  >
                    {c.full_name ?? c.username ?? c.email}
                  </Link>
                  {c.full_name ? (
                    <span className="block max-w-[220px] truncate text-xs" style={{ color: "var(--cc-text-4)" }}>
                      {c.email}
                    </span>
                  ) : null}
                </td>
                <td className="text-right tnum">{c.orders}</td>
                <td className="text-right font-medium tnum" style={{ color: "var(--cc-text)" }}>
                  {money(c.revenue)}
                </td>
                <td className="text-right tnum">{c.active_licences}</td>
                <td className="whitespace-nowrap" style={{ color: "var(--cc-text-4)" }}>
                  {dateShort(c.first_purchase)}
                </td>
                <td className="whitespace-nowrap" title={dateTime(c.latest_purchase)} style={{ color: "var(--cc-text-4)" }}>
                  {c.latest_purchase ? timeAgo(c.latest_purchase) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollFadeX>
    </Panel>
  );
}

async function Leaderboard() {
  const rows = await listCustomers({ limit: 50 });
  // The leaderboard ranks on REAL revenue — accounts that haven't
  // purchased yet belong in the table, not on the podium.
  const top = (rows ?? []).filter((c) => c.revenue > 0).slice(0, 10);
  return (
    <Panel title="Top customers · lifetime revenue">
      {top.length === 0 ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--cc-text-4)" }}>
          The leaderboard ranks on real revenue — it fills up as Veyra sells.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {top.map((c, i) => (
            <li key={c.email} className="flex items-center gap-3">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-[11px] font-medium tnum"
                style={{
                  backgroundColor: i === 0 ? "var(--cc-accent-dim)" : "var(--cc-surface-2)",
                  color: i === 0 ? "var(--cc-accent-ink)" : "var(--cc-text-3)",
                }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  href={`/admin/customers?email=${encodeURIComponent(c.email)}`}
                  className="block truncate text-sm font-medium hover:underline"
                  style={{ color: "var(--cc-text)" }}
                >
                  {c.full_name ?? c.username ?? c.email}
                </Link>
                <span className="block text-xs" style={{ color: "var(--cc-text-4)" }}>
                  {c.orders} order{c.orders === 1 ? "" : "s"}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium tnum" style={{ color: "var(--cc-text-2)" }}>
                {money(c.revenue)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Customer detail                                                     */
/* ------------------------------------------------------------------ */

async function CustomerDetail({ email }: { email: string }) {
  const data = await getCustomerProfile(email);
  if (!data) {
    return (
      <EmptyState
        title="Customer not found"
        body={`No purchases recorded under ${email}.`}
      />
    );
  }
  const { profile, orders, licences, seats, downloads, redeliveries } = data;
  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((s, o) => s + o.amount, 0);
  const aov = paid.length ? Math.round(revenue / paid.length) : 0;
  const first = paid.length ? paid[paid.length - 1]?.created_at : null;
  const latest = paid[0]?.created_at ?? null;
  const productSlugs = [...new Set(paid.map((o) => o.product_slug))];
  const activeLicences = licences.filter((l) => l.status === "active");

  return (
    <div className="space-y-5">
      <Link
        href="/admin/customers"
        className="inline-block text-xs transition-opacity hover:opacity-80"
        style={{ color: "var(--cc-text-3)" }}
      >
        ← All customers
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-5">
          <Panel title="Customer">
            <div className="space-y-0">
              <KV k="Email" v={<CopyChip value={email} />} />
              <KV k="Name" v={profile?.full_name ?? <Muted>No account yet</Muted>} />
              <KV k="Username" v={profile?.username ? <CopyChip value={profile.username} /> : <Muted>—</Muted>} />
              <KV k="Account status" v={profile ? <StatusPill status="active" /> : <Muted>Guest (unclaimed)</Muted>} />
              {profile ? <KV k="Joined" v={dateShort(profile.created_at)} /> : null}
            </div>
          </Panel>

          <Panel title="Metrics">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Figure label="Total revenue" value={money(revenue)} />
              <Figure label="Orders" value={String(paid.length)} />
              <Figure label="Avg order value" value={money(aov)} />
              <Figure label="Active licences" value={String(activeLicences.length)} />
              <Figure label="First purchase" value={dateShort(first)} />
              <Figure label="Latest purchase" value={latest ? timeAgo(latest) : "—"} />
            </div>
          </Panel>

          <Panel title="Products purchased">
            {productSlugs.length === 0 ? (
              <Muted>Nothing yet.</Muted>
            ) : (
              <ul className="space-y-2">
                {productSlugs.map((slug) => (
                  <li key={slug} className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--cc-text-2)" }}>{getProduct(slug)?.name ?? slug}</span>
                    <span className="tnum text-xs" style={{ color: "var(--cc-text-4)" }}>
                      {paid.filter((o) => o.product_slug === slug).length}×
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title={`Order history (${orders.length})`} padded={false}>
            {orders.length === 0 ? (
              <div className="p-4">
                <Muted>No orders under this email.</Muted>
              </div>
            ) : (
              <div className="cc-scroll max-h-[340px] overflow-y-auto" data-lenis-prevent>
                <table className="cc-table">
                  <thead className="sticky top-0" style={{ backgroundColor: "var(--cc-bg-2)" }}>
                    <tr>
                      <th>Order</th>
                      <th>Product</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o: OrderRow) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs hover:underline" style={{ color: "var(--cc-accent-ink)" }}>
                            {shortId(o.id)}
                          </Link>
                        </td>
                        <td className="max-w-[150px] truncate">
                          {getProduct(o.product_slug)?.name ?? o.product_slug}
                        </td>
                        <td className="text-right tnum" style={{ color: "var(--cc-text)" }}>{money(o.amount)}</td>
                        <td><StatusPill status={o.status} /></td>
                        <td className="whitespace-nowrap" style={{ color: "var(--cc-text-4)" }}>{dateShort(o.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title={`Licences (${licences.length})`}>
            {licences.length === 0 ? (
              <Muted>No licences issued.</Muted>
            ) : (
              <ul className="space-y-3">
                {licences.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2.5">
                      <CopyChip value={l.licence_reference} />
                      <span className="text-xs" style={{ color: "var(--cc-text-4)" }}>
                        {getProduct(l.product_slug)?.name ?? l.product_slug}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <StatusPill status={l.status} />
                      <Link
                        href={`/admin/licences?focus=${l.id}`}
                        className="text-xs hover:underline"
                        style={{ color: "var(--cc-accent-ink)" }}
                      >
                        Open
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="grid gap-5 md:grid-cols-2">
            <Panel title="Seat assignments">
              {seats.length === 0 ? (
                <Muted>None.</Muted>
              ) : (
                <ul className="space-y-2">
                  {seats.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate" style={{ color: "var(--cc-text-2)" }}>
                        <span className="font-mono text-xs" style={{ color: "var(--cc-text-4)" }}>#{s.seat_number}</span> {s.email}
                      </span>
                      <StatusPill status={s.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Download activity">
              {downloads.length === 0 && redeliveries.length === 0 ? (
                <Muted>No download events recorded.</Muted>
              ) : (
                <ul className="space-y-2">
                  {downloads.slice(0, 8).map((d) => (
                    <li key={d.id} className="flex items-center justify-between text-sm">
                      <span style={{ color: "var(--cc-text-2)" }}>
                        {getProduct(d.product_slug)?.name ?? d.product_slug} · v{d.product_version ?? "—"}
                      </span>
                      <span className="text-xs" style={{ color: "var(--cc-text-4)" }}>{timeAgo(d.created_at)}</span>
                    </li>
                  ))}
                  {redeliveries.slice(0, 4).map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span style={{ color: "var(--cc-warning)" }}>Re-delivery requested</span>
                      <span className="text-xs" style={{ color: "var(--cc-text-4)" }}>{timeAgo(r.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
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

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm" style={{ color: "var(--cc-text-4)" }}>{children}</p>;
}
