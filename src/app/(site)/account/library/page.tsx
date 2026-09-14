import { describePgError } from "@/lib/supabase/errors";
import type { Metadata } from "next";
import Link from "next/link";
import {
  createSupabaseServerClient,
  requireAccountUser,
} from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import type { EntitlementRow, LicenceRow } from "@/lib/supabase/types";
import { getProduct } from "@/lib/products";
import { AccountShell, AccountCard } from "@/components/account/account-shell";
import { AccountDiscovery } from "@/components/account/account-discovery";
import { DownloadButton } from "@/components/account/download-button";
import { Button } from "@/components/ui/button";
import { LayersIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Your products — Veyra",
  description: "Your Veyra systems, ready when you are.",
  robots: { index: false, follow: false },
};

export default async function LibraryPage() {
  if (!supabaseAuthConfigured()) {
    return <NotConfigured />;
  }
  await requireAccountUser();
  const supabase = await createSupabaseServerClient();

  // RLS (entitlements_select_own): only the caller's active entitlements.
  const { data, error } = await supabase
    .from("entitlements")
    .select("*")
    .eq("status", "active")
    .order("granted_at", { ascending: false });

  if (error) {
    console.error("[account] library query failed:", describePgError(error));
    return (
      <AccountShell
        crumb="Your products"
        title="Your products"
        lead="Your Veyra systems, ready when you are."
      >
        <AccountCard>
          <p className="text-sm leading-relaxed text-ink-2">
            We couldn&rsquo;t load your library right now. Please try again in
            a moment.
          </p>
        </AccountCard>
      </AccountShell>
    );
  }

  const entitlements = (data ?? []) as EntitlementRow[];

  // Licence references + purchased seat counts, RLS-scoped.
  const licenceRes = await supabase
    .from("licences")
    .select("entitlement_id, licence_reference, status");
  const licences = new Map(
    ((licenceRes.data ?? []) as LicenceRow[])
      .filter((l) => l.status === "active")
      .map((l) => [l.entitlement_id, l])
  );

  return (
    <AccountShell
      crumb="Your products"
      title="Your products"
      lead="Your Veyra systems, ready when you are."
    >
      {entitlements.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong bg-paper p-6 text-center sm:p-8">
          <span
            aria-hidden="true"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-surface"
          >
            <LayersIcon className="h-4 w-4 text-ink-3" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">No products yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-3">
            Products appear here automatically once your payment is confirmed.
            Purchased with a different email before accounts existed? Sign in
            with that email and your purchase will be waiting.
          </p>
          <div className="mt-4">
            <Button href="/shop" variant="outline" size="sm" arrow>
              Browse products
            </Button>
          </div>
        </div>
      ) : (
        <ul role="list" className="stagger-rise space-y-4">
          {entitlements.map((entitlement) => {
            const product = getProduct(entitlement.product_slug);
            const name = product?.name ?? entitlement.product_slug;
            const licence = licences.get(entitlement.id);
            const seats = entitlement.seats;

            return (
              <li key={entitlement.id}>
                <AccountCard>
                  <div className="flex flex-wrap items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-accent/25 bg-accent-soft font-display text-lg italic text-accent-ink"
                    >
                      {product?.name.charAt(0) ?? "V"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/account/library/${entitlement.product_slug}`}
                        className="text-sm font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {name}
                      </Link>
                      <p className="mt-1 text-xs leading-relaxed text-ink-3">
                        {product?.shortDescription ?? ""}
                      </p>
                      <p className="mt-2.5 spec text-ink-4">
                        Purchased
                        {` · ${seats} ${seats === 1 ? "seat" : "seats"}`}
                        {` · Licence active`}
                        {product?.version ? ` · Version ${product.version}` : ""}
                        {` · Granted ${new Date(
                          entitlement.granted_at
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}`}
                      </p>
                    </div>
                  </div>

                  {/* The delivery actions — download, licence, quick start,
                      order. Delivery center holds the full detail. */}
                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5">
                    <DownloadButton
                      slug={entitlement.product_slug}
                      productName={name}
                      variant="outline"
                    />
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
                      Quick Start
                    </Link>
                    <Link
                      href={`/account/library/${entitlement.product_slug}`}
                      className="text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                    >
                      Order Details & Delivery Center →
                    </Link>
                  </div>
                  {licence ? (
                    <p className="mt-3 text-xs text-ink-4">
                      Licence <span className="spec">{licence.licence_reference}</span>{" "}
                      · one-time purchase · every future revision included
                    </p>
                  ) : (
                    <p className="mt-3 text-xs leading-relaxed text-ink-4">
                      Your licence record is being finalized — it appears
                      here and in your licence center shortly.
                    </p>
                  )}
                </AccountCard>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10">
        <AccountDiscovery
          ownedSlugs={entitlements.map((e) => e.product_slug)}
          heading={
            entitlements.length > 0
              ? "Continue your Veyra system"
              : "Explore Veyra systems"
          }
        />
      </div>
    </AccountShell>
  );
}

function NotConfigured() {
  return (
    <AccountShell
      crumb="Your products"
      title="Your products"
      lead="Your Veyra systems, ready when you are."
    >
      <AccountCard>
        <p className="text-sm leading-relaxed text-ink-2">
          Customer accounts aren&rsquo;t enabled on this deployment yet.{" "}
          <Link href="/account" className="font-medium text-accent underline-offset-2 hover:underline">
            Back to your account
          </Link>
        </p>
      </AccountCard>
    </AccountShell>
  );
}
