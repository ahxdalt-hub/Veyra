"use client";

import Link from "next/link";
import { Drawer, StatusPill, CopyChip, KV } from "@/components/admin/admin-ui";
import { ReleaseDeviceButton, RevokeLicenceButton, ReactivateLicenceButton } from "@/components/admin/licence-actions";
import { money, dateTime, timeAgo } from "@/components/admin/format";
import type { LicenceDetail } from "@/lib/admin/data";

/**
 * LicenceDrawer — the full licence story: ownership, entitlement,
 * purchased seats, device activations (with release control), and the
 * revoke/reactivate operations that hit the real backend.
 */
export function LicenceDrawer({
  detail,
  productName,
  onClose,
}: {
  detail: LicenceDetail | null;
  productName: string;
  onClose: () => void;
}) {
  if (!detail) return null;
  const { licence, entitlement, order, seats, activations, customer } = detail;
  const active = activations.filter((a) => a.status === "active");

  return (
    <Drawer
      open={true}
      onClose={onClose}
      title={<span className="font-mono text-base">{licence.licence_reference}</span>}
      subtitle={
        <span className="flex items-center gap-2">
          <StatusPill status={licence.status} /> · {productName}
        </span>
      }
    >
      <div className="space-y-6">
        <section>
          <h3 className="cc-label mb-2">Customer</h3>
          <div>
            <KV k="Email" v={<CopyChip value={licence.email} />} />
            <KV k="Account" v={customer ? (customer.full_name ?? customer.username ?? "linked") : <span style={{ color: "var(--cc-text-4)" }}>guest (unclaimed)</span>} />
            {customer ? (
              <KV
                k="Profile"
                v={
                  <Link href={`/admin/customers?email=${encodeURIComponent(licence.email)}`} className="hover:underline" style={{ color: "var(--cc-accent-ink)" }}>
                    Open customer
                  </Link>
                }
              />
            ) : null}
          </div>
        </section>

        <section>
          <h3 className="cc-label mb-2">Entitlement</h3>
          {entitlement ? (
            <div>
              <KV k="Status" v={<StatusPill status={entitlement.status} />} />
              <KV k="Licensed seats" v={`${entitlement.seats}`} />
              <KV k="Granted" v={dateTime(entitlement.granted_at)} />
              {order ? (
                <KV
                  k="Order"
                  v={
                    <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs hover:underline" style={{ color: "var(--cc-accent-ink)" }}>
                      {money(order.amount)} · {order.status}
                    </Link>
                  }
                />
              ) : null}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--cc-text-4)" }}>Entitlement not found.</p>
          )}
        </section>

        <section>
          <h3 className="cc-label mb-2">Seats ({seats.length}/{entitlement?.seats ?? "?"})</h3>
          <ul className="space-y-2">
            {seats.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate" style={{ color: "var(--cc-text-2)" }}>
                  <span className="font-mono text-xs" style={{ color: "var(--cc-text-4)" }}>#{s.seat_number}</span> {s.email}
                </span>
                <StatusPill status={s.status} />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="cc-label mb-2">
            Device activations · {active.length} active
          </h3>
          {activations.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--cc-text-4)" }}>
              No device has activated on this licence yet.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {activations.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0" style={{ color: "var(--cc-text-2)" }}>
                    <span className="block truncate">
                      {a.device_label ?? "Device"} · {a.activated_email}
                    </span>
                    <span className="text-xs" style={{ color: "var(--cc-text-4)" }}>
                      {a.status === "active" ? `last seen ${timeAgo(a.last_seen_at)}` : "released"}
                    </span>
                  </span>
                  {a.status === "active" ? (
                    <ReleaseDeviceButton activationId={a.id} deviceLabel={a.device_label} />
                  ) : (
                    <StatusPill status="deactivated" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: "var(--cc-line)" }}
        >
          <span className="text-xs" style={{ color: "var(--cc-text-4)" }}>
            Issued {dateTime(licence.issued_at)}
          </span>
          {licence.status === "active" ? (
            <RevokeLicenceButton licenceId={licence.id} />
          ) : (
            <ReactivateLicenceButton licenceId={licence.id} />
          )}
        </section>
      </div>
    </Drawer>
  );
}
