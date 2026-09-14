"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { AdminOrder } from "@/lib/admin/data";
import {
  DetailDrawer,
  DrawerSection,
  FieldRow,
} from "./detail-drawer";
import {
  formatMinorAmount,
  formatDateTime,
  orderRef,
  OrderStatusBadgeCC,
  CopyableId,
} from "./admin-ui";

/**
 * OrderDetailDrawer — the sale inspection surface. Opened from a table
 * row or hydrated from ?focus= via a server fetch. Shows the order,
 * customer, product, and payment state without ever exposing provider
 * secrets. Data is fetched when `focus` changes; a stale snapshot is
 * kept visible until the new one lands (no blank flash).
 */

export function OrderDetailDrawer() {
  const params = useSearchParams();
  const router = useRouter();
  const focus = params.get("focus");

  const [snapshot, setSnapshot] = useState<{
    key: string;
    order: AdminOrder | null;
    error: string | null;
  }>({ key: "", order: null, error: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!focus) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      fetch(`/admin/api/orders/${focus}`, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 401) {
              router.push("/admin/login");
              return null;
            }
            throw new Error("not found");
          }
          return (await res.json()) as { order: AdminOrder };
        })
        .then((data) => {
          if (cancelled) return;
          setSnapshot({
            key: focus,
            order: data?.order ?? null,
            error: data?.order ? null : "That order could not be found.",
          });
        })
        .catch(() => {
          if (!cancelled) {
            setSnapshot({
              key: focus,
              order: null,
              error: "That order could not be found.",
            });
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [focus, router]);

  const open = Boolean(focus);
  const order = focus === snapshot.key ? snapshot.order : null;
  const error = focus === snapshot.key ? snapshot.error : null;

  function close() {
    const url = new URL(window.location.href);
    url.searchParams.delete("focus");
    router.push(url.pathname + (url.search || ""), { scroll: false });
  }

  return (
    <DetailDrawer
      open={open}
      onClose={close}
      eyebrow={order ? `Order ${orderRef(order.id)}` : "Order"}
      title={order ? order.productName : loading ? "Loading…" : "Order"}
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cc-skeleton h-14" />
          ))}
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-cc-bad">{error}</p>
      ) : order ? (
        <>
          <DrawerSection title="Order">
            <dl>
              <FieldRow label="Reference">
                <CopyableId value={order.id} label="order ID" display={orderRef(order.id)} />
              </FieldRow>
              <FieldRow label="Date">{formatDateTime(order.created_at)}</FieldRow>
              <FieldRow label="Quantity">{order.quantity}</FieldRow>
              <FieldRow label="Amount">
                {formatMinorAmount(order.amount, order.currency)}
              </FieldRow>
              <FieldRow label="Status">
                <OrderStatusBadgeCC status={order.status} />
              </FieldRow>
            </dl>
          </DrawerSection>

          <DrawerSection title="Customer">
            <dl>
              <FieldRow label="Email">
                <a
                  href={`/admin/customers?focus=${encodeURIComponent(order.email)}`}
                  className="text-cc-accent hover:underline"
                >
                  {order.email}
                </a>
              </FieldRow>
              <FieldRow label="Account">
                {order.user_id ? (
                  <span className="text-cc-good">Linked to a Veyra account</span>
                ) : (
                  <span className="text-cc-text-3">Guest purchase (unclaimed)</span>
                )}
              </FieldRow>
            </dl>
          </DrawerSection>

          <DrawerSection title="Product">
            <dl>
              <FieldRow label="Product">{order.productName}</FieldRow>
              <FieldRow label="Slug">
                <span className="font-mono text-xs">{order.product_slug}</span>
              </FieldRow>
              <FieldRow label="Entitlement">
                {order.status === "paid" ? (
                  <span className="text-cc-good">Granted on payment</span>
                ) : (
                  <span className="text-cc-text-3">Not granted</span>
                )}
              </FieldRow>
            </dl>
          </DrawerSection>

          <DrawerSection title="Payment">
            <dl>
              <FieldRow label="Provider">Razorpay</FieldRow>
              <FieldRow label="Provider order">
                {order.razorpay_order_id ? (
                  <CopyableId
                    value={order.razorpay_order_id}
                    label="Razorpay order id"
                    display={order.razorpay_order_id}
                  />
                ) : (
                  <span className="text-cc-text-3">—</span>
                )}
              </FieldRow>
              <FieldRow label="Provider payment">
                {order.razorpay_payment_id ? (
                  <CopyableId
                    value={order.razorpay_payment_id}
                    label="Razorpay payment id"
                    display={order.razorpay_payment_id}
                  />
                ) : (
                  <span className="text-cc-text-3">—</span>
                )}
              </FieldRow>
              <FieldRow label="State">
                <OrderStatusBadgeCC status={order.status} />
              </FieldRow>
            </dl>
          </DrawerSection>
        </>
      ) : null}
    </DetailDrawer>
  );
}
