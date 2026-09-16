import { describePgError } from "@/lib/supabase/errors";
import type { Metadata } from "next";
import Link from "next/link";
import {
  createSupabaseServerClient,
  requireAccountUser,
} from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import type {
  EntitlementRow,
  LicenceActivationRow,
  LicenceRow,
  OrderRow,
  SeatAssignmentRow,
} from "@/lib/supabase/types";
import { getProduct } from "@/lib/products";
import { AccountShell, AccountCard } from "@/components/account/account-shell";
import { TeamSeats, type SeatView } from "@/components/account/team-seats";
import { LicenceDevices, type DeviceView } from "@/components/account/licence-devices";
import { formatDate, shortOrderRef } from "@/components/account/account-format";
import { ShieldIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Licences — Veyra",
  description: "Your Veyra licences, seats, and team access.",
  robots: { index: false, follow: false },
};

/**
 * Licence Center — one card per licence: status, seats, identifiers, and
 * the seat-management surface. Everything here is read through the
 * user's own session (RLS), so a licence that isn't the caller's is
 * invisible by construction.
 */
export default async function LicencesPage() {
  if (!supabaseAuthConfigured()) {
    return <NotConfigured />;
  }
  await requireAccountUser();
  const supabase = await createSupabaseServerClient();

  // RLS (licences_select_own): only the caller's licences.
  const { data, error } = await supabase
    .from("licences")
    .select("*")
    .eq("status", "active")
    .order("issued_at", { ascending: false });

  if (error) {
    console.error("[account] licences query failed:", describePgError(error));
    return (
      <AccountShell
        crumb="Licences"
        title="Licences"
        lead="Your licences, seats, and team access."
      >
        <AccountCard>
          <p className="text-sm leading-relaxed text-ink-2">
            We couldn&rsquo;t load your licences right now. Please try again
            in a moment.
          </p>
        </AccountCard>
      </AccountShell>
    );
  }

  const licences = (data ?? []) as LicenceRow[];

  // Entitlement (seat count) + order (purchase record) + seat assignments
  // + device activations for each licence — all RLS-scoped to the caller.
  const [entRes, orderRes, seatRes, devRes] = await Promise.all([
    supabase.from("entitlements").select("*").eq("status", "active"),
    supabase.from("orders").select("id, created_at"),
    supabase.from("seat_assignments").select("*").order("seat_number"),
    supabase.from("licence_activations").select("*").order("activated_at", { ascending: false }),
  ]);

  const entitlements = new Map(
    ((entRes.data ?? []) as EntitlementRow[]).map((e) => [e.id, e])
  );
  const orders = new Map(
    ((orderRes.data ?? []) as Pick<OrderRow, "id" | "created_at">[]).map(
      (o) => [o.id, o]
    )
  );
  const seatsByEntitlement = new Map<string, SeatAssignmentRow[]>();
  for (const seat of (seatRes.data ?? []) as SeatAssignmentRow[]) {
    const list = seatsByEntitlement.get(seat.entitlement_id) ?? [];
    list.push(seat);
    seatsByEntitlement.set(seat.entitlement_id, list);
  }
  const devicesByLicence = new Map<string, DeviceView[]>();
  for (const dev of (devRes.data ?? []) as LicenceActivationRow[]) {
    const list = devicesByLicence.get(dev.licence_id) ?? [];
    list.push({
      id: dev.id,
      deviceLabel:
        dev.device_label ||
        `Device ${dev.device_id.slice(0, 6).toUpperCase()}`,
      email: dev.activated_email,
      activatedAt: dev.activated_at,
      lastSeenAt: dev.last_seen_at,
      active: dev.status === "active",
    });
    devicesByLicence.set(dev.licence_id, list);
  }

  return (
    <AccountShell
      crumb="Licences"
      title="Licences"
      lead="Your licences, seats, and team access."
    >
      {licences.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-strong bg-paper p-6 text-center sm:p-8">
          <span
            aria-hidden="true"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm border border-line bg-surface"
          >
            <ShieldIcon className="h-4 w-4 text-ink-3" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">No licences yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-ink-3">
            Every purchase includes licences for the seats you bought — they
            appear here once your payment is confirmed.
          </p>
          <div className="mt-4">
            <Link
              href="/shop"
              className="text-xs font-medium text-accent underline-offset-4 hover:underline"
            >
              Browse products →
            </Link>
          </div>
        </div>
      ) : (
        <ul role="list" className="stagger-rise space-y-4">
          {licences.map((licence) => {
            const product = getProduct(licence.product_slug);
            const entitlement = entitlements.get(licence.entitlement_id);
            const order = entitlement ? orders.get(entitlement.order_id) : undefined;
            const licensed = entitlement?.seats ?? 1;
            const assignments = (seatsByEntitlement.get(licence.entitlement_id) ?? []).map(
              (s): SeatView => ({
                id: s.id,
                seat_number: s.seat_number,
                email: s.email,
                status: s.status,
                isOwner: s.seat_number === 1 && s.email === licence.email,
              })
            );
            // Activated seats count devices, not assigned seat rows:
            // a purchased-but-unassigned seat uses nothing (Stage 07).
            const devices = devicesByLicence.get(licence.id) ?? [];
            const activated = devices.filter((d) => d.active).length;
            const available = Math.max(0, licensed - activated);

            return (
              <li key={licence.id}>
                <AccountCard>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {product?.name ?? licence.product_slug}
                      </p>
                      <p className="mt-0.5 spec text-ink-4">
                        {licence.licence_reference} ·{" "}
                        {product?.version ? `Version ${product.version} · ` : ""}
                        One-time purchase
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-xs border border-accent/30 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink">
                      Licence active
                    </span>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-4">
                    <div>
                      <dt className="spec text-ink-4">Licensed seats</dt>
                      <dd className="mt-1 text-sm font-medium tnum text-ink">
                        {licensed}
                      </dd>
                    </div>
                    <div>
                      <dt className="spec text-ink-4">Activated seats</dt>
                      <dd className="mt-1 text-sm font-medium tnum text-ink">
                        {activated}
                      </dd>
                    </div>
                    <div>
                      <dt className="spec text-ink-4">Available seats</dt>
                      <dd className="mt-1 text-sm font-medium tnum text-ink">
                        {available}
                      </dd>
                    </div>
                    <div>
                      <dt className="spec text-ink-4">Purchase date</dt>
                      <dd className="mt-1 text-sm font-medium text-ink">
                        {order ? formatDate(order.created_at) : "—"}
                      </dd>
                    </div>
                  </dl>

                  {order ? (
                    <p className="mt-4 text-xs text-ink-3">
                      Order{" "}
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="tnum text-ink-2 underline-offset-4 hover:text-ink hover:underline"
                      >
                        #{shortOrderRef(order.id)}
                      </Link>
                    </p>
                  ) : null}

                  {/* Seat management — owner only, enforced server-side */}
                  {entitlement ? (
                    <div className="mt-5 border-t border-line pt-5">
                      <TeamSeats
                        entitlementId={entitlement.id}
                        seats={licensed}
                        assignments={assignments}
                        productName={product?.name ?? licence.product_slug}
                      />
                    </div>
                  ) : null}

                  {/* Activated devices — release to free a seat */}
                  <div className="mt-5 border-t border-line pt-5">
                    <LicenceDevices devices={devices} />
                  </div>
                </AccountCard>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 rounded-md border border-line bg-paper p-5 sm:p-6">
        <h2 className="text-eyebrow">About Veyra licences</h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-2">
          Veyra systems are one-time purchases — there is no subscription and
          nothing expires. Each licence covers the seats you purchased, for
          one business, and every future revision of the system is included.
          A seat moves with your team: invite, reassign, or release it from
          this page at any time.
        </p>
        <Link
          href="/refund-policy"
          className="mt-3 inline-block text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          Read the refund policy
        </Link>
      </div>
    </AccountShell>
  );
}

function NotConfigured() {
  return (
    <AccountShell
      crumb="Licences"
      title="Licences"
      lead="Your licences, seats, and team access."
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
