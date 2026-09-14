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
import { formatPrice } from "@/lib/site";
import { AccountShell, AccountCard } from "@/components/account/account-shell";
import { OrderStatusBadge, formatDate } from "@/components/account/account-format";
import { ShieldIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Order details — Veyra",
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!supabaseAuthConfigured() || !UUID_RE.test(id)) notFound();

  await requireAccountUser();
  const supabase = await createSupabaseServerClient();

  // RLS: only the owning user's orders are readable — an order id
  // belonging to someone else resolves to null here, which becomes 404.
  const { data: orderRow, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[account] order detail query failed:", describePgError(error));
    notFound();
  }
  if (!orderRow) notFound();

  const order = orderRow as OrderRow;
  const product = getProduct(order.product_slug);

  // Licence, where this order has one (created when the payment was
  // confirmed; guest orders before signup are claimed by verified email).
  let entitlement: EntitlementRow | null = null;
  let licence: LicenceRow | null = null;
  if (order.status === "paid") {
    const entRes = await supabase
      .from("entitlements")
      .select("*")
      .eq("order_id", order.id)
      .maybeSingle();
    entitlement = (entRes.data ?? null) as EntitlementRow | null;
    if (entitlement) {
      const licRes = await supabase
        .from("licences")
        .select("*")
        .eq("entitlement_id", entitlement.id)
        .maybeSingle();
      licence = (licRes.data ?? null) as LicenceRow | null;
    }
  }

  return (
    <AccountShell
      crumb="Order details"
      title={product?.name ?? order.product_slug}
      lead={`Placed ${formatDate(order.created_at)}.`}
    >
      <div className="stagger-rise space-y-6">
        {/* Order record */}
        <AccountCard>
          <h2 className="text-eyebrow">Order details</h2>
          <dl className="mt-4 divide-y divide-line text-sm">
            <Row label="Status">
              <OrderStatusBadge status={order.status} />
            </Row>
            <Row label="Payment">
              <span className={order.status === "paid" ? "font-medium text-ink" : "text-ink-2"}>
                {order.status === "paid"
                  ? `Paid — ${formatPrice(order.amount / 100)}`
                  : formatPrice(order.amount / 100)}
              </span>
            </Row>
            <Row label="Currency">
              <span className="text-ink-2">{order.currency}</span>
            </Row>
            <Row label="Quantity">
              <span className="tnum text-ink-2">{order.quantity}</span>
            </Row>
            <Row label="Purchased with">
              <span className="text-ink-2">{order.email}</span>
            </Row>
            <Row label="Order date">
              <span className="tnum text-ink-2">
                {new Date(order.created_at).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </Row>
            <Row label="Order reference">
              <span className="tnum text-xs text-ink-2">{order.id}</span>
            </Row>
            {order.razorpay_payment_id ? (
              <Row label="Payment reference">
                <span className="tnum text-xs text-ink-2">
                  {order.razorpay_payment_id}
                </span>
              </Row>
            ) : null}
          </dl>
          {order.razorpay_payment_id ? (
            <p className="mt-4 text-xs leading-relaxed text-ink-4">
              For receipt questions, contact{" "}
              <a
                href="mailto:hello@veyra.co"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                hello@veyra.co
              </a>{" "}
              with the order and payment references above.
            </p>
          ) : null}
        </AccountCard>

        {/* Access + licence, where the purchase is confirmed */}
        {order.status === "paid" && entitlement ? (
          <AccountCard>
            <h2 className="text-eyebrow">Product access</h2>
            {product?.version ? (
              <p className="mt-3 text-sm text-ink-2">
                You own <span className="font-medium text-ink">{product.name}</span>
                {` `}— current version {product.version}.
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-2">
                You own <span className="font-medium text-ink">{product?.name ?? order.product_slug}</span>.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button href="/account/library" variant="accent" size="sm" arrow>
                Open your library
              </Button>
              {product ? (
                <Button
                  href={`/products/${product.slug}`}
                  variant="ghost"
                  size="sm"
                >
                  View product page
                </Button>
              ) : null}
            </div>

            {licence ? (
              <div className="mt-6 rounded-sm border border-line bg-surface p-4">
                <div className="flex items-start gap-3">
                  <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-ink">Licence active</p>
                    <p className="mt-0.5 spec text-ink-4">
                      {licence.licence_reference}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-3">
                      One-time purchase — one business, unlimited internal
                      use, all future revisions included.
                    </p>
                    <Link
                      href="/account/licences"
                      className="mt-2 inline-block text-xs text-accent underline-offset-2 hover:underline"
                    >
                      Manage licences →
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </AccountCard>
        ) : null}

        <div>
          <Button href="/account/orders" variant="ghost" size="sm">
            ← All orders
          </Button>
        </div>
      </div>
    </AccountShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="spec text-ink-4">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
