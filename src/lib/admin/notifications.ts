import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

/**
 * Notification writers — the single funnel from server events to the
 * command center's persistent notifications.
 *
 * Design:
 *  - Called from fulfillment/webhook/checkout paths with the service
 *    role; notification creation must NEVER fail a payment operation,
 *    so every writer is fire-and-forget with an internal catch.
 *  - The rows themselves are what Supabase Realtime delivers to admin
 *    sessions (RLS gates to admins), so a successful insert here = a
 *    live toast in the command center. No polling, no client-side
 *    invention of events.
 */

export type NotificationKind =
  | "sale"
  | "payment_failed"
  | "customer"
  | "licence"
  | "coupon"
  | "delivery"
  | "system";

export type NotificationSeverity = "info" | "success" | "warning" | "error";

async function insert(row: {
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  message: string;
  related_entity?: string;
  related_id?: string;
}): Promise<void> {
  if (!supabaseAdminConfigured()) return;
  try {
    const admin = createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from("admin_notifications").insert({
      kind: row.kind,
      severity: row.severity,
      title: row.title,
      message: row.message,
      related_entity: row.related_entity ?? null,
      related_id: row.related_id ?? null,
    });
    if (error) console.error("[notify] insert failed:", error.message);
  } catch (err) {
    console.error("[notify] insert failed:", err);
  }
}

/** Format cents → $12.00 (USD is the storefront currency). */
export function money(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100
  );
}

export function notifyNewSale(input: {
  orderId: string;
  email: string;
  productName: string;
  amountMinor: number;
  currency?: string;
  seats?: number;
}): void {
  void insert({
    kind: "sale",
    severity: "success",
    title: "New sale",
    message:
      `${input.productName} — ${money(input.amountMinor, input.currency)}` +
      (input.seats && input.seats > 1 ? ` (${input.seats} seats)` : "") +
      ` · ${input.email}`,
    related_entity: "orders",
    related_id: input.orderId,
  });
}

export function notifyPaymentFailed(input: {
  orderId: string;
  email: string;
  productName: string;
  amountMinor: number;
  currency?: string;
}): void {
  void insert({
    kind: "payment_failed",
    severity: "warning",
    title: "Payment failed",
    message: `${input.productName} — ${money(input.amountMinor, input.currency)} · ${input.email}`,
    related_entity: "orders",
    related_id: input.orderId,
  });
}

export function notifyLicenceEvent(input: {
  licenceId: string;
  email: string;
  productName: string;
  event: "issued" | "revoked" | "reactivated";
}): void {
  const copy =
    input.event === "issued"
      ? { title: "Licence issued", severity: "info" as const }
      : input.event === "revoked"
        ? { title: "Licence revoked", severity: "warning" as const }
        : { title: "Licence reactivated", severity: "success" as const };
  void insert({
    kind: "licence",
    severity: copy.severity,
    title: copy.title,
    message: `${input.productName} · ${input.email}`,
    related_entity: "licences",
    related_id: input.licenceId,
  });
}

export function notifyCouponEvent(input: {
  couponId: string;
  code: string;
  event: "created" | "updated" | "deactivated" | "reactivated";
  detail?: string;
}): void {
  const label = input.code.toUpperCase();
  void insert({
    kind: "coupon",
    severity: input.event === "deactivated" ? "warning" : "info",
    title:
      input.event === "created"
        ? "Coupon created"
        : input.event === "updated"
          ? "Coupon updated"
          : input.event === "deactivated"
            ? "Coupon deactivated"
            : "Coupon reactivated",
    message: label + (input.detail ? ` — ${input.detail}` : ""),
    related_entity: "coupons",
    related_id: input.couponId,
  });
}

export function notifyDelivery(input: {
  email: string;
  productName: string;
  version: string | null;
}): void {
  void insert({
    kind: "delivery",
    severity: "info",
    title: "Product downloaded",
    message:
      `${input.email} downloaded ${input.productName}` +
      (input.version ? ` v${input.version}` : ""),
    related_entity: "download_events",
  });
}
