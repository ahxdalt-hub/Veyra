import { describePgError } from "@/lib/supabase/errors";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createSupabaseServerClient,
  requireAccountUser,
} from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import type { EntitlementRow, LicenceRow, OrderRow } from "@/lib/supabase/types";
import { getProduct } from "@/lib/products";
import { AccountShell, AccountCard } from "@/components/account/account-shell";
import { DownloadButton } from "@/components/account/download-button";
import { formatDate, shortOrderRef } from "@/components/account/account-format";
import { CheckIcon, DocIcon, ShieldIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Your product — Veyra",
  robots: { index: false, follow: false },
};

/**
 * Delivery Center — the account-side home for one owned system. Ownership
 * is verified through RLS: the entitlement query only ever returns the
 * caller's own rows, so a slug the user doesn't own resolves to null and
 * becomes a 404. Downloads authorize the same way, through /api/download.
 */
export default async function LibraryProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!supabaseAuthConfigured()) notFound();

  await requireAccountUser();
  const supabase = await createSupabaseServerClient();
  const product = getProduct(slug);

  const entRes = await supabase
    .from("entitlements")
    .select("*")
    .eq("product_slug", slug)
    .eq("status", "active")
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (entRes.error) {
    console.error(
      "[account] product access query failed:",
      describePgError(entRes.error)
    );
    notFound();
  }
  const entitlement = (entRes.data ?? null) as EntitlementRow | null;
  if (!entitlement) notFound();

  // Licence + purchase record, RLS-scoped. Guest orders are claimed at
  // sign-in, so both are populated for everything visible here.
  const [orderRes, licenceRes, seatsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("id", entitlement.order_id)
      .maybeSingle(),
    supabase
      .from("licences")
      .select("*")
      .eq("entitlement_id", entitlement.id)
      .maybeSingle(),
    supabase
      .from("seat_assignments")
      .select("id")
      .eq("entitlement_id", entitlement.id),
  ]);
  const order = (orderRes.data ?? null) as OrderRow | null;
  const licence = (licenceRes.data ?? null) as LicenceRow | null;
  const seatsInUse = (seatsRes.data ?? []).length;
  const licensedSeats = entitlement.seats;

  const name = product?.name ?? entitlement.product_slug;

  return (
    <AccountShell
      crumb="Your products"
      title={`Your ${name}`}
      lead={product?.tagline ?? "Your Veyra system, ready when you are."}
    >
      <div className="stagger-rise space-y-6">
        {/* Delivery — the primary reason to open this page */}
        <AccountCard>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-eyebrow">Delivery center</h2>
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
                <CheckIcon className="h-4 w-4 text-accent" />
                Ready to use
              </p>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
                {product?.shortDescription ??
                  "A Veyra system delivered digitally after purchase."}
              </p>
            </div>
            <dl className="flex shrink-0 gap-8 text-right">
              <div>
                <dt className="spec text-ink-4">Version</dt>
                <dd className="mt-1 text-sm font-medium tnum text-ink">
                  {product?.version
                    ? `${product.version} — latest`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="spec text-ink-4">Licence</dt>
                <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink">
                  <CheckIcon className="h-3.5 w-3.5" />
                  Active
                </dd>
              </div>
              <div>
                <dt className="spec text-ink-4">Seats</dt>
                <dd className="mt-1 text-sm font-medium tnum text-ink">
                  {seatsInUse} / {licensedSeats}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5">
            <DownloadButton slug={slug} productName={name} />
            <Link
              href="/account/licences"
              className="text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            >
              View Licence
            </Link>
            <Link
              href="/account/quick-start"
              className="text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            >
              Quick Start Guide
            </Link>
            <Link
              href="/account/quick-start#installation"
              className="text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            >
              Installation Guide
            </Link>
          </div>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-4">
            Every future revision is included — download the latest version
            here whenever it ships. Windows, signed in with your Veyra
            account.
          </p>
        </AccountCard>

        {/* Quick start — the next step after delivery */}
        <AccountCard className="border-accent/25 bg-accent-soft/40">
          <h2 className="text-eyebrow">Next: Quick Start</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-2">
            Your system is ready. Start by building the foundation, then move
            through acquisition, sales, delivery, retention, and growth.
          </p>
          <p className="mt-3 spec text-ink-4" aria-hidden="true">
            Build → Acquire → Sell → Deliver → Retain → Grow
          </p>
          <div className="mt-4">
            <Button href="/account/quick-start" variant="accent" size="sm" arrow>
              Open Quick Start
            </Button>
          </div>
        </AccountCard>

        {/* The licence + order behind this product */}
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountCard className="transition-colors duration-200 hover:border-ink/25">
            <div className="flex items-center gap-3">
              <ShieldIcon className="h-4 w-4 shrink-0 text-accent" />
              <h2 className="text-eyebrow">Licence</h2>
            </div>
            {licence ? (
              <>
                <p className="mt-3 text-sm font-medium text-ink">
                  Active — {licensedSeats}{" "}
                  {licensedSeats === 1 ? "seat" : "seats"}, one-time purchase
                </p>
                <p className="mt-1 spec text-ink-4">
                  {licence.licence_reference}
                </p>
                <p className="mt-1 text-xs text-ink-3">
                  Issued {formatDate(licence.issued_at)} · All future revisions
                  included
                </p>
                <Link
                  href="/account/licences"
                  className="mt-3 inline-block text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                >
                  Manage seats in the Licence Center →
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Your licence record is being finalized — it will appear here
                and in your licence center shortly.
              </p>
            )}
          </AccountCard>

          <AccountCard className="transition-colors duration-200 hover:border-ink/25">
            <div className="flex items-center gap-3">
              <DocIcon className="h-4 w-4 shrink-0 text-accent" />
              <h2 className="text-eyebrow">Purchase</h2>
            </div>
            {order ? (
              <>
                <p className="mt-3 text-sm font-medium text-ink">
                  {name}
                  {order.quantity > 1 ? ` · ${order.quantity} seats` : ""}
                </p>
                <p className="mt-1 text-xs text-ink-3">
                  Purchased {formatDate(order.created_at)} · #
                  {shortOrderRef(order.id)}
                </p>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="mt-3 inline-block text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                >
                  View order →
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                This product is linked to your account. Its order record will
                appear here shortly.
              </p>
            )}
          </AccountCard>
        </div>

        <div>
          <Button href="/account/library" variant="ghost" size="sm">
            ← All your products
          </Button>
        </div>
      </div>
    </AccountShell>
  );
}
