"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  AdminCustomer,
  AdminEntitlement,
  AdminLicence,
  AdminOrder,
} from "@/lib/admin/data";
import { DetailDrawer, DrawerSection, FieldRow } from "./detail-drawer";
import {
  formatMinorAmount,
  formatDateTime,
  formatDateOnly,
  orderRef,
  OrderStatusBadgeCC,
  AccessBadge,
  CopyableId,
} from "./admin-ui";

/**
 * CustomerDetailDrawer — one customer's entire Veyra relationship:
 * profile, orders, entitlements, licences. `focus` is the purchase
 * email (the customer business key). A stale snapshot stays visible
 * until the new one lands.
 */

type Detail = {
  customer: AdminCustomer;
  orders: AdminOrder[];
  entitlements: AdminEntitlement[];
  licences: AdminLicence[];
};

export function CustomerDetailDrawer() {
  const params = useSearchParams();
  const router = useRouter();
  const focus = params.get("focus");

  const [snapshot, setSnapshot] = useState<{
    key: string;
    detail: Detail | null;
    error: string | null;
  }>({ key: "", detail: null, error: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!focus) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      fetch(`/admin/api/customers?email=${encodeURIComponent(focus)}`, {
        cache: "no-store",
      })
        .then(async (res) => {
          if (!res.ok) {
            if (res.status === 401) {
              router.push("/admin/login");
              return null;
            }
            throw new Error("not found");
          }
          return (await res.json()) as { detail: Detail };
        })
        .then((data) => {
          if (cancelled) return;
          setSnapshot({
            key: focus,
            detail: data?.detail ?? null,
            error: data?.detail ? null : "That customer could not be found.",
          });
        })
        .catch(() => {
          if (!cancelled) {
            setSnapshot({
              key: focus,
              detail: null,
              error: "That customer could not be found.",
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
  const detail = focus === snapshot.key ? snapshot.detail : null;
  const error = focus === snapshot.key ? snapshot.error : null;
  const c = detail?.customer;

  function close() {
    const url = new URL(window.location.href);
    url.searchParams.delete("focus");
    router.push(url.pathname + (url.search || ""), { scroll: false });
  }

  return (
    <DetailDrawer
      open={open}
      onClose={close}
      eyebrow="Customer"
      title={c ? c.name ?? c.email : loading ? "Loading…" : "Customer"}
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cc-skeleton h-14" />
          ))}
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-cc-bad">{error}</p>
      ) : c ? (
        <>
          <DrawerSection title="Profile">
            <dl>
              <FieldRow label="Customer ID">
                {c.userId ? (
                  <CopyableId value={c.userId} label="customer ID" />
                ) : (
                  <span className="text-cc-text-3">Guest — no account yet</span>
                )}
              </FieldRow>
              <FieldRow label="Email">
                <span className="font-mono text-xs">{c.email}</span>
              </FieldRow>
              {c.name ? <FieldRow label="Name">{c.name}</FieldRow> : null}
              {c.businessName ? (
                <FieldRow label="Business">{c.businessName}</FieldRow>
              ) : null}
              <FieldRow label="Joined">
                {c.signupDate ? formatDateOnly(c.signupDate) : "—"}
              </FieldRow>
              <FieldRow label="Account">
                {c.userId ? (
                  <span className="text-cc-good">Registered</span>
                ) : (
                  <span className="text-cc-text-3">Guest purchaser</span>
                )}
              </FieldRow>
            </dl>
          </DrawerSection>

          <DrawerSection title="Relationship">
            <dl>
              <FieldRow label="Orders">{c.orderCount}</FieldRow>
              <FieldRow label="Paid orders">{c.paidOrders}</FieldRow>
              <FieldRow label="Total spent">
                {formatMinorAmount(c.totalSpentMinor)}
              </FieldRow>
              <FieldRow label="Last purchase">
                {c.lastPurchaseAt ? formatDateTime(c.lastPurchaseAt) : "—"}
              </FieldRow>
            </dl>
          </DrawerSection>

          <DrawerSection title={`Orders (${c.orderCount})`}>
            {detail!.orders.length === 0 ? (
              <p className="py-3 text-xs text-cc-text-3">No orders.</p>
            ) : (
              <ul className="py-2">
                {detail!.orders.map((o) => (
                  <li key={o.id} className="border-b border-cc-line/50 py-2.5 last:border-b-0">
                    <Link
                      href={`/admin/orders?focus=${o.id}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] text-cc-text">
                          {o.productName}
                        </span>
                        <span className="block text-xs text-cc-text-3">
                          {orderRef(o.id)} · {formatDateTime(o.created_at)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="tnum block text-[0.8125rem] text-cc-text">
                          {formatMinorAmount(o.amount, o.currency)}
                        </span>
                        <OrderStatusBadgeCC status={o.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DrawerSection>

          <DrawerSection title="Products & entitlements">
            {detail!.entitlements.length === 0 ? (
              <p className="py-3 text-xs text-cc-text-3">
                No entitlements {c.paidOrders > 0 ? "recorded yet — legacy purchases appear after claim." : "yet."}
              </p>
            ) : (
              <ul className="py-2">
                {detail!.entitlements.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-3 border-b border-cc-line/50 py-2.5 last:border-b-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] text-cc-text">
                        {e.productName}
                      </span>
                      <span className="block text-xs text-cc-text-3">
                        Granted {formatDateOnly(e.grantedAt)}
                        {e.version ? ` · v${e.version}` : ""}
                      </span>
                    </span>
                    <AccessBadge status={e.status} />
                  </li>
                ))}
              </ul>
            )}
          </DrawerSection>

          <DrawerSection title={`Licences (${detail!.licences.length})`}>
            {detail!.licences.length === 0 ? (
              <p className="py-3 text-xs text-cc-text-3">No licences.</p>
            ) : (
              <ul className="py-2">
                {detail!.licences.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-3 border-b border-cc-line/50 py-2.5 last:border-b-0"
                  >
                    <span className="min-w-0">
                      <span className="block font-mono text-[0.8125rem] text-cc-text">
                        {l.licenceReference}
                      </span>
                      <span className="block truncate text-xs text-cc-text-3">
                        {l.productName} · issued {formatDateOnly(l.issuedAt)}
                      </span>
                    </span>
                    <AccessBadge status={l.status} />
                  </li>
                ))}
              </ul>
            )}
          </DrawerSection>
        </>
      ) : null}
    </DetailDrawer>
  );
}
