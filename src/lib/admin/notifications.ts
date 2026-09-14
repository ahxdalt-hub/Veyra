import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";

/**
 * Admin notifications + audit trail — server-side only.
 *
 * Both writes go through the service-role client and are therefore the
 * only code paths that can touch these tables (RLS has zero policies —
 * see 0004_admin.sql). Notifications are fire-and-forget by design: a
 * failed insert is logged, never thrown, because a payment must never
 * be reported as failed because the notification system hiccuped.
 */

export type AdminNotificationKind =
  | "sale"
  | "customer"
  | "payment_failed"
  | "delivery"
  | "system";

export type AdminNotificationSeverity = "info" | "success" | "warning" | "error";

export type AdminNotificationRow = {
  id: string;
  kind: AdminNotificationKind;
  severity: AdminNotificationSeverity;
  title: string;
  message: string;
  related_entity: string | null;
  related_slug: string | null;
  read_at: string | null;
  created_at: string;
};

export type AdminAuditRow = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};

function adminClient() {
  return createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function insertAdminNotification(
  row: Omit<AdminNotificationRow, "id" | "read_at" | "created_at">
): Promise<void> {
  if (!supabaseAdminConfigured()) {
    console.log(
      `[admin-notify] dev-store: ${row.kind} — ${row.title}`
    );
    return;
  }
  try {
    const { error } = await adminClient()
      .from("admin_notifications")
      .insert(row);
    if (error) throw error;
  } catch (err) {
    console.error("[admin-notify] insert failed:", err);
  }
}

export async function insertAuditEvent(
  action: string,
  options?: { entity?: string; entityId?: string; detail?: string }
): Promise<void> {
  if (!supabaseAdminConfigured()) {
    console.log(`[admin-audit] dev-store: ${action}`);
    return;
  }
  try {
    const { error } = await adminClient().from("admin_audit_log").insert({
      action,
      entity: options?.entity ?? null,
      entity_id: options?.entityId ?? null,
      detail: options?.detail ?? null,
    });
    if (error) throw error;
  } catch (err) {
    console.error("[admin-audit] insert failed:", err);
  }
}

/** The NEW SALE notification — the one event the business never wants
 *  to miss. Fire-and-forget from the fulfillment path. */
export async function notifyNewSale(params: {
  orderId: string;
  productSlug: string;
  productName: string;
  email: string;
  amount: number;
  currency: string;
}): Promise<void> {
  await insertAdminNotification({
    kind: "sale",
    severity: "success",
    title: "New sale",
    message: `${params.productName} sold to ${params.email} — ${(
      params.amount / 100
    ).toFixed(2)} ${params.currency}.`,
    related_entity: "order",
    related_slug: params.orderId,
  });
}
