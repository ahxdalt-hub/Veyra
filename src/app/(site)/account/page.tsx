import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  createSupabaseServerClient,
  requireAccountUser,
} from "@/lib/supabase/server";
import { describePgError } from "@/lib/supabase/errors";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import type { EntitlementRow, LicenceRow, OrderRow, ProfileRow } from "@/lib/supabase/types";
import { getProduct } from "@/lib/products";
import { formatPrice } from "@/lib/site";
import { AccountShell, AccountCard } from "@/components/account/account-shell";
import { AccountDiscovery } from "@/components/account/account-discovery";
import { OrderStatusBadge, formatDate, shortOrderRef } from "@/components/account/account-format";
import {
  ArrowRightIcon,
  DocIcon,
  DownloadIcon,
  LayersIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Account — Veyra",
  description: "Your Veyra products, orders, and licences in one place.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: true },
};

export default async function AccountPage() {
  // Supabase auth not configured on this deployment — keep the honest
  // informational state instead of a dead sign-in loop.
  if (!supabaseAuthConfigured()) {
    return <AccountsPreview />;
  }

  const user = await requireAccountUser();
  const supabase = await createSupabaseServerClient();

  const [profileRes, entitlementsRes, ordersRes, licencesRes, noticesRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("entitlements")
        .select("*")
        .eq("status", "active")
        .order("granted_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(3),
      supabase.from("licences").select("*").eq("status", "active"),
      // Orders still resolving — these become account notices below.
      supabase
        .from("orders")
        .select("*")
        .in("status", ["pending", "failed"])
        .order("created_at", { ascending: false })
        .limit(2),
    ]);

  // The profile is display-only (the page already renders without one), so
  // a profiles read failure degrades to the email-derived name instead of
  // hiding products and orders behind the error state.
  if (profileRes.error) {
    console.error(
      "[account] profile query failed:",
      describePgError(profileRes.error)
    );
  }
  if (noticesRes.error) {
    console.error(
      "[account] notices query failed:",
      describePgError(noticesRes.error)
    );
  }
  const failed = entitlementsRes.error || ordersRes.error || licencesRes.error;
  if (failed) {
    // Raw stringify per query — the dev log's serializer collapses Error
    // objects to `{}`, and this is the only record of the real cause.
    console.error(
      "[account] overview query failed:",
      "entitlements:", JSON.stringify(entitlementsRes.error),
      "orders:", JSON.stringify(ordersRes.error),
      "licenses:", JSON.stringify(licencesRes.error)
    );
    return (
      <AccountShell
        title="Welcome back"
        lead="Your Veyra products and purchases in one place."
      >
        <AccountCard>
          <p className="text-sm leading-relaxed text-ink-2">
            We&rsquo;re having trouble loading your account right now. Please
            try again in a moment — if it persists, write to{" "}
            <a
              href="mailto:hello@veyra.co"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              hello@veyra.co
            </a>
            .
          </p>
        </AccountCard>
      </AccountShell>
    );
  }

  const profile = (profileRes.data ?? null) as ProfileRow | null;
  const entitlements = (entitlementsRes.data ?? []) as EntitlementRow[];
  const recentOrders = (ordersRes.data ?? []) as OrderRow[];
  const licences = (licencesRes.data ?? []) as LicenceRow[];
  const noticeOrders = ((noticesRes.data ?? []) as OrderRow[]).filter(
    (o) => o.status === "pending" || o.status === "failed"
  );
  const orderCount = ordersRes.count ?? recentOrders.length;

  const displayName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "there";
  const memberSince = profile?.created_at
    ? formatDate(profile.created_at)
    : null;

  return (
    <AccountShell
      title={`Welcome back, ${displayName}`}
      lead="Your Veyra products, orders, and licences in one place."
    >
      <div className="space-y-10">
        {/* Account notices — real orders still resolving, never filler. */}
        {noticeOrders.length > 0 ? (
          <div role="status" className="stagger-rise space-y-3">
            {noticeOrders.map((order) => {
              const productName =
                getProduct(order.product_slug)?.name ?? order.product_slug;
              return (
                <Link
                  key={order.id}
                  href={`/account/orders/${order.id}`}
                  className={`block rounded-md border p-4 transition-colors duration-200 sm:p-5 ${
                    order.status === "pending"
                      ? "border-amber/30 bg-amber-soft hover:border-amber/50"
                      : "border-clay/30 bg-clay-soft hover:border-clay/50"
                  }`}
                >
                  <p className="text-sm font-medium text-ink">
                    {order.status === "pending"
                      ? `We're confirming your payment for ${productName}`
                      : `Your payment for ${productName} didn't complete`}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-2">
                    {order.status === "pending"
                      ? "This usually takes a few minutes. The order will update automatically — nothing to do right now."
                      : "No charge was captured. You can start again from the product page anytime."}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : null}

        {/* Ledger strip — every number comes from the database; each cell
            is a door into its own section of the account. */}
        <dl className="animate-rise grid grid-cols-2 overflow-hidden rounded-md border border-line bg-paper sm:grid-cols-4 sm:divide-x sm:divide-line">
          <StatCell
            icon={UserIcon}
            label="Member since"
            value={memberSince ?? "—"}
            href="/account/settings"
          />
          <StatCell
            icon={LayersIcon}
            label="Products owned"
            value={entitlements.length}
            href="/account/library"
          />
          <StatCell
            icon={DocIcon}
            label="Orders"
            value={orderCount}
            href="/account/orders"
          />
          <StatCell
            icon={ShieldIcon}
            label="Licences"
            value={licences.length}
            href="/account/licences"
          />
        </dl>

        {/* The two main rooms — products and orders side by side on
            desktop, each a self-contained place to explore. */}
        <div className="grid gap-6 lg:grid-cols-5">
          <section
            aria-labelledby="overview-products"
            className="lg:col-span-3"
          >
            <PanelCard
              id="overview-products"
              eyebrow="Your products"
              action={{ label: "Open library", href: "/account/library" }}
            >
              <div className="stagger-rise space-y-3">
                {entitlements.length === 0 ? (
                  <EmptyState
                    icon={LayersIcon}
                    title="No products yet"
                    body="When you purchase a Veyra system, it appears here — ready to access anytime."
                  >
                    <Button href="/shop" variant="outline" size="sm" arrow>
                      Browse products
                    </Button>
                  </EmptyState>
                ) : (
                  entitlements.slice(0, 4).map((entitlement) => {
                    const product = getProduct(entitlement.product_slug);
                    const licensed = licences.some(
                      (l) => l.entitlement_id === entitlement.id
                    );
                    return (
                      <Link
                        key={entitlement.id}
                        href={`/account/library/${entitlement.product_slug}`}
                        className="group flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface p-4 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-ink/25 hover:shadow-sm sm:p-5"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-accent/25 bg-accent-soft font-display text-base italic text-accent-ink"
                        >
                          {product?.name.charAt(0) ?? "V"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">
                            {product?.name ?? entitlement.product_slug}
                          </p>
                          <p className="mt-0.5 spec text-ink-4">
                            Owned
                            {product?.version
                              ? ` · Version ${product.version}`
                              : ""}
                            {licensed ? " · Licensed" : ""}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-accent">
                          Open
                          <span
                            aria-hidden="true"
                            className="ml-1.5 inline-block transition-transform duration-200 group-hover:translate-x-0.5"
                          >
                            →
                          </span>
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </PanelCard>
          </section>

          <section
            aria-labelledby="overview-orders"
            className="lg:col-span-2"
          >
            <PanelCard
              id="overview-orders"
              eyebrow="Recent orders"
              action={{ label: "All orders", href: "/account/orders" }}
            >
              <div className="stagger-rise space-y-3">
                {recentOrders.length === 0 ? (
                  <EmptyState
                    icon={DocIcon}
                    title="No purchases yet"
                    body="Every purchase and receipt will be listed here once you buy."
                  >
                    <Button
                      href="/products/client-growth-system"
                      variant="outline"
                      size="sm"
                      arrow
                    >
                      View Client Growth System
                    </Button>
                  </EmptyState>
                ) : (
                  recentOrders.map((order) => {
                    const product = getProduct(order.product_slug);
                    return (
                      <Link
                        key={order.id}
                        href={`/account/orders/${order.id}`}
                        className="block rounded-md border border-line bg-surface p-4 transition-all duration-200 hover:border-ink/25 hover:shadow-sm"
                      >
                        <p className="truncate text-sm font-medium text-ink">
                          {product?.name ?? order.product_slug}
                        </p>
                        <p className="mt-0.5 spec text-ink-4">
                          {formatDate(order.created_at)} · #
                          {shortOrderRef(order.id)}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <span className="tnum text-sm font-medium text-ink">
                            {formatPrice(order.amount / 100)}
                          </span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </PanelCard>
          </section>
        </div>

        {/* Second row — licences and the account itself, each its own
            destination. */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="overview-licences">
            <PanelCard
              id="overview-licences"
              eyebrow="Your licences"
              action={{ label: "Manage licences", href: "/account/licences" }}
            >
              {licences.length === 0 ? (
                <p className="rounded-md border border-dashed border-line-strong bg-surface px-4 py-5 text-sm leading-relaxed text-ink-3">
                  Each system you own carries a perpetual, per-business
                  licence. References appear here the moment a purchase is
                  fulfilled.
                </p>
              ) : (
                <ul role="list" className="stagger-rise space-y-2.5">
                  {licences.slice(0, 3).map((licence) => {
                    const product = getProduct(licence.product_slug);
                    return (
                      <li key={licence.id}>
                        <Link
                          href="/account/licences"
                          className="group flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3 transition-colors duration-200 hover:border-ink/25"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">
                              {product?.name ?? licence.product_slug}
                            </span>
                            <span className="spec mt-0.5 block text-ink-4">
                              {licence.licence_reference}
                            </span>
                          </span>
                          <ArrowRightIcon
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-ink-4 transition-colors duration-200 group-hover:text-accent"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </PanelCard>
          </section>

          <section aria-labelledby="overview-account">
            <PanelCard
              id="overview-account"
              eyebrow="Your account"
              action={{ label: "Profile settings", href: "/account/settings" }}
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-line bg-surface"
                >
                  <UserIcon className="h-4 w-4 text-accent" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {user.email}
                  </p>
                  {profile?.username ? (
                    <p className="spec mt-1 text-accent">
                      @{profile.username}
                    </p>
                  ) : null}
                  <dl className="mt-2 space-y-1 text-xs leading-relaxed text-ink-3">
                    {profile?.business_name?.trim() ? (
                      <div className="flex gap-2">
                        <dt className="text-ink-4">Business</dt>
                        <dd className="font-medium text-ink-2">
                          {profile.business_name}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <dt className="text-ink-4">Member since</dt>
                      <dd className="font-medium text-ink-2">
                        {memberSince ?? "—"}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-ink-4">Display name</dt>
                      <dd className="font-medium text-ink-2">
                        {profile?.full_name?.trim() || "Not set"}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href="/account/settings"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent underline-offset-4 hover:underline"
                  >
                    Update your details
                    <ArrowRightIcon aria-hidden="true" className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </PanelCard>
          </section>
        </div>

        {/* Discovery — the real catalog, minus what the customer owns. */}
        {entitlementsRes.error ? null : (
          <AccountDiscovery
            ownedSlugs={entitlements.map((e) => e.product_slug)}
            heading={
              entitlements.length > 0
                ? "Continue your Veyra system"
                : "Explore Veyra systems"
            }
          />
        )}
      </div>
    </AccountShell>
  );
}

/* ------------------------------------------------------------------ */

/** One cell of the ledger strip — a quiet stat that doubles as a link. */
function StatCell({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof DocIcon;
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block border-b border-line p-4 transition-colors duration-200 hover:bg-accent-soft/40 last:border-b-0 sm:border-b-0 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <Icon aria-hidden="true" className="h-4 w-4 text-accent" />
        <ArrowRightIcon
          aria-hidden="true"
          className="h-3 w-3 text-ink-4 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-accent group-hover:opacity-100"
        />
      </div>
      <dd className="mt-3 truncate text-xl font-medium tnum text-ink sm:text-2xl">
        {value}
      </dd>
      <dt className="mt-1 text-xs text-ink-3 group-hover:text-ink-2">
        {label}
      </dt>
    </Link>
  );
}

/** Card with an editorial header row: eyebrow title + destination link. */
function PanelCard({
  id,
  eyebrow,
  action,
  children,
}: {
  id: string;
  eyebrow: string;
  action: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-md border border-line bg-paper p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={id} className="text-eyebrow">
          {eyebrow}
        </h2>
        <Link
          href={action.href}
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          {action.label}
          <ArrowRightIcon
            aria-hidden="true"
            className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: typeof DocIcon;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-surface p-5 text-center sm:p-6">
      <span
        aria-hidden="true"
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-paper"
      >
        <Icon aria-hidden="true" className="h-4 w-4 text-ink-3" />
      </span>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-3">
        {body}
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/**
 * Shown only when Supabase auth is not configured on the deployment —
 * an honest state, no fake account chrome.
 */
function AccountsPreview() {
  return (
    <>
      <div className="border-b border-line bg-paper">
        <div className="container-page py-14 sm:py-16 lg:py-20">
          <p className="text-eyebrow mb-4">Account</p>
          <h1 className="text-display-1 max-w-2xl">Your account</h1>
          <p className="mt-5 max-w-xl text-lead">
            Customer accounts arrive with our fulfillment launch. Until then,
            purchases deliver through email, and this page explains exactly
            what changes.
          </p>
        </div>
      </div>
      <div className="bg-surface">
        <div className="container-page py-16 lg:py-20">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-md border border-line bg-paper p-6 sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface">
                <UserIcon className="h-5 w-5 text-accent" />
              </span>
              <h2 className="mt-5 text-display-2 text-[1.375rem]">
                Coming with customer accounts
              </h2>
              <ul className="mt-5 space-y-3.5">
                {[
                  { icon: DocIcon, t: "Order history", d: "Every purchase, receipt, and licence in one place." },
                  { icon: DownloadIcon, t: "Re-delivery", d: "Get the latest version of any system you own, anytime." },
                  { icon: UserIcon, t: "Licence management", d: "See which systems your business is licensed for." },
                ].map((row) => (
                  <li key={row.t} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-surface">
                      <row.icon className="h-4 w-4 text-accent" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-ink">{row.t}</span>
                      <span className="mt-0.5 block text-xs text-ink-3">{row.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-center text-sm text-ink-3">
              Today, every purchase is confirmed by email —{" "}
              <Button href="/shop" variant="ghost" size="sm" className="px-1">
                browse products
              </Button>{" "}
              or{" "}
              <Button href="/contact" variant="ghost" size="sm" className="px-1">
                contact us
              </Button>{" "}
              about an existing order.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
