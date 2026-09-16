import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getOrderDetail } from "@/lib/admin/data";
import { getProduct } from "@/lib/products";
import { money, dateTime, timeAgo, shortId } from "@/components/admin/format";
import { Panel, PageHeading, StatusPill, CopyChip, KV } from "@/components/admin/admin-ui";
import { ArrowUpRightIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

/**
 * Order detail — the complete story of one payment attempt: the order
 * line, the customer, the entitlement and licence it granted, seats,
 * activations, downloads, and every notification raised about it.
 * Read-only by design: order records are financial truth and the system
 * supports no legitimate admin mutation of them (refunds run through
 * the Razorpay dashboard, which the webhook confirms honestly).
 */

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const detail = await getOrderDetail(id);
  if (!detail) notFound();
  const { order, entitlement, licence, seats, activations, downloads, notifications } = detail;
  const product = getProduct(order.product_slug);

  return (
    <div>
      <nav className="mb-4 flex items-center gap-2 text-xs" style={{ color: "var(--cc-text-4)" }}>
        <Link href="/admin/orders" className="hover:text-[var(--cc-text-2)]">Orders</Link>
        <span>/</span>
        <span className="font-mono" style={{ color: "var(--cc-text-3)" }}>{shortId(order.id)}</span>
      </nav>

      <PageHeading
        title={product?.name ?? order.product_slug}
        meta={
          <span className="flex items-center gap-2">
            <StatusPill status={order.status} />
            <span>·</span>
            <span>{dateTime(order.created_at)}</span>
          </span>
        }
        actions={
          <Link
            href="/account"
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border px-3.5 text-sm transition-colors hover:bg-[var(--cc-surface-2)]"
            style={{ borderColor: "var(--cc-line-strong)", color: "var(--cc-text-2)" }}
          >
            Customer view <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Order">
          <div className="space-y-0">
            <KV k="Order ID" v={<CopyChip value={order.id} label={shortId(order.id)} />} />
            <KV k="Product" v={`${product?.name ?? order.product_slug} (${order.product_slug})`} />
            <KV k="Seats" v={`${order.quantity} seat${order.quantity === 1 ? "" : "s"}`} />
            <KV
              k="Amount"
              v={
                <span className="font-medium" style={{ color: "var(--cc-text)" }}>
                  {money(order.amount, order.currency)}
                </span>
              }
            />
            {order.coupon_code ? (
              <>
                <KV k="Subtotal" v={money(order.subtotal ?? order.amount + (order.discount ?? 0), order.currency)} />
                <KV k="Discount" v={<span style={{ color: "var(--cc-accent-ink)" }}>−{money(order.discount ?? 0, order.currency)}</span>} />
                <KV k="Coupon" v={<CopyChip value={order.coupon_code} />} />
              </>
            ) : null}
            <KV k="Currency" v={order.currency} />
            <KV k="Payment status" v={<StatusPill status={order.status} />} />
            <KV k="Provider" v="Razorpay" />
            {order.razorpay_order_id ? <KV k="Razorpay order" v={<CopyChip value={order.razorpay_order_id} />} /> : null}
            {order.razorpay_payment_id ? <KV k="Razorpay payment" v={<CopyChip value={order.razorpay_payment_id} />} /> : null}
            <KV k="Purchased" v={dateTime(order.created_at)} />
            <KV k="Confirmed" v={order.paid_at ? dateTime(order.paid_at) : order.status === "paid" ? "—" : "—"} />
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="Customer">
            <div className="space-y-0">
              <KV k="Email" v={<CopyChip value={order.email} />} />
              <KV
                k="Account"
                v={
                  order.user_id ? (
                    <Link
                      href={`/admin/customers?email=${encodeURIComponent(order.email)}`}
                      className="hover:underline"
                      style={{ color: "var(--cc-accent-ink)" }}
                    >
                      Linked account
                    </Link>
                  ) : (
                    <span style={{ color: "var(--cc-text-4)" }}>Guest — unclaimed</span>
                  )
                }
              />
            </div>
          </Panel>

          <Panel title="Fulfillment">
            {entitlement ? (
              <div className="space-y-0">
                <KV k="Entitlement" v={<CopyChip value={entitlement.id} label={shortId(entitlement.id)} />} />
                <KV k="Status" v={<StatusPill status={entitlement.status} />} />
                <KV k="Licensed seats" v={`${entitlement.seats}`} />
                <KV k="Granted" v={dateTime(entitlement.granted_at)} />
                {licence ? (
                  <>
                    <KV k="Licence" v={<CopyChip value={licence.licence_reference} />} />
                    <KV k="Licence status" v={<StatusPill status={licence.status} />} />
                    <Link
                      href={`/admin/licences?focus=${licence.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs hover:underline"
                      style={{ color: "var(--cc-accent-ink)" }}
                    >
                      Open licence <ArrowUpRightIcon className="h-3 w-3" />
                    </Link>
                  </>
                ) : null}
              </div>
            ) : order.status === "paid" ? (
              <p className="text-sm" style={{ color: "var(--cc-warning)" }}>
                Payment confirmed but no entitlement exists yet — a
                fulfillment retry (sign-in claim or webhook) will heal it.
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--cc-text-4)" }}>
                Nothing granted — fulfillment runs only after the payment is
                confirmed.
              </p>
            )}
          </Panel>

          {seats.length > 0 && (
            <Panel title={`Seats (${seats.length})`}>
              <ul className="space-y-2">
                {seats.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate" style={{ color: "var(--cc-text-2)" }}>
                      <span className="font-mono text-xs" style={{ color: "var(--cc-text-4)" }}>#{s.seat_number}</span>{" "}
                      {s.email}
                    </span>
                    <StatusPill status={s.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {activations.length > 0 && (
            <Panel title={`Activations (${activations.filter((a) => a.status === "active").length} active)`}>
              <ul className="space-y-2">
                {activations.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate" style={{ color: "var(--cc-text-2)" }}>
                      {a.device_label ?? "Device"} · {a.activated_email}
                      <span className="ml-2 text-xs" style={{ color: "var(--cc-text-4)" }}>
                        seen {timeAgo(a.last_seen_at)}
                      </span>
                    </span>
                    <StatusPill status={a.status} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {downloads.length > 0 && (
            <Panel title="Downloads">
              <ul className="space-y-1.5">
                {downloads.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--cc-text-2)" }}>
                      v{d.product_version ?? "—"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--cc-text-4)" }}>
                      {dateTime(d.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {notifications.length > 0 && (
            <Panel title="Activity for this order">
              <ul className="space-y-3">
                {notifications.map((nt) => (
                  <li key={nt.id} className="text-sm">
                    <span style={{ color: "var(--cc-text-2)" }}>{nt.message}</span>
                    <span className="ml-2 text-xs" style={{ color: "var(--cc-text-4)" }}>
                      {timeAgo(nt.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
