import { describePgError } from "@/lib/supabase/errors";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  createSupabaseServerClient,
  requireAccountUser,
} from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import type { OrderRow } from "@/lib/supabase/types";
import { getProduct } from "@/lib/products";
import { formatPrice } from "@/lib/site";
import { AccountShell, AccountCard } from "@/components/account/account-shell";
import { OrderStatusBadge, formatDate, shortOrderRef } from "@/components/account/account-format";
import { DocIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Orders — Veyra",
  description: "Every purchase, receipt, and licence in one place.",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  if (!supabaseAuthConfigured()) {
    return <NotConfigured />;
  }
  await requireAccountUser();
  const supabase = await createSupabaseServerClient();

  // RLS (orders_select_own) restricts this read to the caller's rows.
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[account] orders query failed:", describePgError(error));
    return (
      <AccountShell
        crumb="Orders"
        title="Orders"
        lead="Every purchase, receipt, and licence in one place."
      >
        <AccountCard>
          <p className="text-sm leading-relaxed text-ink-2">
            We couldn&rsquo;t load your orders right now. Please try again in
            a moment.
          </p>
        </AccountCard>
      </AccountShell>
    );
  }

  const orders = (data ?? []) as OrderRow[];

  return (
    <AccountShell
      crumb="Orders"
      title="Orders"
      lead="Every purchase, receipt, and licence in one place."
    >
      {orders.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong bg-paper p-6 text-center sm:p-8">
          <span
            aria-hidden="true"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-surface"
          >
            <DocIcon className="h-4 w-4 text-ink-3" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">No purchases yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-3">
            When you purchase a Veyra system, your order history starts here.
          </p>
          <div className="mt-4">
            <Button
              href="/products/client-growth-system"
              variant="outline"
              size="sm"
              arrow
            >
              View Client Growth System
            </Button>
          </div>
        </div>
      ) : (
        <ul role="list" className="stagger-rise space-y-3">
          {orders.map((order) => {
            const product = getProduct(order.product_slug);
            return (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="block rounded-md border border-line bg-paper p-5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-ink/25 hover:shadow-sm sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {product?.name ?? order.product_slug}
                      </p>
                      <p className="mt-0.5 spec text-ink-4">
                        {formatDate(order.created_at)} · #
                        {shortOrderRef(order.id)}
                        {order.quantity > 1 ? ` · Qty ${order.quantity}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tnum text-sm font-medium text-ink">
                        {formatPrice(order.amount / 100)}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 max-w-md text-xs leading-relaxed text-ink-4">
        Questions about an order? Write to{" "}
        <a
          href="mailto:hello@veyra.co"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          hello@veyra.co
        </a>{" "}
        with the order reference.
      </p>
    </AccountShell>
  );
}

function NotConfigured() {
  return (
    <AccountShell title="Orders" lead="Every purchase, receipt, and licence in one place.">
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
