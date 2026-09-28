import type { OrderStatus } from "@/lib/orders";

/**
 * Minimal hand-written database types for the tables the account area
 * touches through the user session (RLS enforced). Kept in sync with
 * supabase/migrations/0002_orders.sql, 0003_customer_accounts.sql,
 * 0007_seats.sql, and 0008_activations.sql.
 * When the Supabase CLI becomes available these can be replaced by
 * generated types (`supabase gen types typescript`) — the shapes match.
 */

export type OrderRow = {
  id: string;
  /** Lemon Squeezy human order id, stamped at confirmation (0020). */
  lemon_squeezy_order_id: string | null;
  /** Lemon Squeezy order uuid — the provider payment reference. */
  lemon_squeezy_payment_id: string | null;
  email: string;
  user_id: string | null;
  product_slug: string;
  quantity: number;
  amount: number;
  currency: string;
  status: OrderStatus;
  /* Coupon trail (0013) — all nullable; legacy rows never had them. */
  subtotal: number | null;
  discount: number | null;
  total: number | null;
  coupon_code: string | null;
  paid_at: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
};

export type EntitlementRow = {
  id: string;
  order_id: string;
  user_id: string | null;
  email: string;
  product_slug: string;
  /** Licensed seats purchased (1–5) — see 0007_seats.sql. */
  seats: number;
  status: "active" | "revoked";
  granted_at: string;
};

export type LicenceRow = {
  id: string;
  entitlement_id: string;
  user_id: string | null;
  email: string;
  product_slug: string;
  licence_reference: string;
  /** Product version stamped at grant time (the current published release);
   *  null for legacy rows granted before version stamping existed. */
  version: string | null;
  status: "active" | "revoked";
  issued_at: string;
};

export type SeatAssignmentRow = {
  id: string;
  entitlement_id: string;
  seat_number: number;
  email: string;
  user_id: string | null;
  status: "invited" | "active";
  created_at: string;
  updated_at: string;
};

export type RedeliveryRequestRow = {
  id: string;
  user_id: string;
  entitlement_id: string;
  product_slug: string;
  product_version: string | null;
  created_at: string;
};

export type LicenceActivationRow = {
  id: string;
  licence_id: string;
  entitlement_id: string;
  /** Random per-install id held by the desktop app — no hardware data. */
  device_id: string;
  device_label: string | null;
  activated_email: string;
  status: "active" | "deactivated";
  deactivated_reason: "device" | "seat" | "revoked" | null;
  activated_at: string;
  last_seen_at: string;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  slug: string;
  name: string;
  status: "active" | "retired";
  created_at: string;
  updated_at: string;
};

export type ProductVersionRow = {
  id: string;
  product_slug: string;
  version: string;
  notes: string | null;
  current: boolean;
  published_at: string;
  /** 0016 — published releases are downloadable; withdrawn stop being
   *  served; draft rows are recorded but never authorized. */
  release_status: "draft" | "published" | "withdrawn";
  /** 0016 — private delivery-bucket object key; null until uploaded. */
  artifact_key: string | null;
};

/** public.email_events (0016) — at-most-once customer email ledger.
 *  Service-role writes only; unique on (order_id, email_type). */
export type EmailEventRow = {
  id: string;
  order_id: string;
  email_type: string;
  to_email: string;
  status: "sending" | "sent" | "failed";
  provider_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

/** public.coupons — discount codes validated server-side at checkout
 *  (validate_coupon RPC) and managed from the admin command center.
 *  Money semantics (0010): percent value is percentage points (1–100);
 *  fixed value is whole USD dollars; min_subtotal is whole dollars. */
export type CouponRow = {
  code: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  min_subtotal: number | null;
  max_uses: number | null;
  per_customer_limit: number | null;
  used_count: number;
  created_at: string;
  updated_at: string;
};

/** public.download_events — one row per authorized delivery (the
 *  download route writes; counts come from this, never invented). */
export type DownloadEventRow = {
  id: string;
  product_slug: string;
  product_version: string | null;
  email: string;
  user_id: string | null;
  created_at: string;
};

/** public.admin_notifications — persistent operational events surfaced
 *  in the command center (realtime-delivered to admin sessions, RLS). */
export type AdminNotificationRow = {
  id: string;
  kind: "sale" | "payment_failed" | "customer" | "licence" | "coupon" | "delivery" | "system";
  severity: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  related_entity: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
};

/** public.admin_audit_log — what the admin did; service-role only. */
export type AdminAuditLogRow = {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  entity: string | null;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};

export type AdminMetrics = {
  revenue: number;
  orders: number;
  paid_orders: number;
  failed_orders: number;
  pending_orders: number;
  new_customers: number;
  licences_issued: number;
  downloads: number;
};

export type AdminTotals = {
  revenue_all: number;
  orders_all: number;
  customers_all: number;
  licences_active: number;
  licences_revoked: number;
  seats_active: number;
  leads_all: number;
};

export type CouponValidation =
  | {
      ok: true;
      code: string;
      label: string;
      kind: "percent" | "fixed";
      value: number;
      discount_dollars: number;
    }
  | { ok: false; reason: string; min_subtotal?: number };

type Tables = {
  orders: OrderRow;
  profiles: ProfileRow;
  entitlements: EntitlementRow;
  licences: LicenceRow;
  seat_assignments: SeatAssignmentRow;
  redelivery_requests: RedeliveryRequestRow;
  licence_activations: LicenceActivationRow;
  products: ProductRow;
  product_versions: ProductVersionRow;
  email_events: EmailEventRow;
  coupons: CouponRow;
  download_events: DownloadEventRow;
  admin_notifications: AdminNotificationRow;
  admin_audit_log: AdminAuditLogRow;
};

export type Database = {
  public: {
    Tables: {
      [K in keyof Tables]: {
        Row: Tables[K];
        Insert: Partial<Tables[K]>;
        Update: Partial<Tables[K]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      validate_coupon: {
        Args: {
          p_code: string;
          p_email: string;
          p_subtotal_dollars: number;
        };
        Returns: Record<string, unknown>;
      };
      admin_metrics: {
        Args: { p_from: string; p_to: string };
        Returns: Record<string, unknown>;
      };
      admin_totals: {
        Args: Record<string, never>;
        Returns: Record<string, unknown>;
      };
      admin_revenue_series: {
        Args: { p_from: string; p_to: string; p_bucket: string };
        Returns: { bucket: string; revenue: number; orders: number; paid: number }[];
      };
      admin_product_breakdown: {
        Args: { p_from: string; p_to: string };
        Returns: { product_slug: string; revenue: number; units: number; paid_orders: number }[];
      };
      admin_customer_rollups: {
        Args: { p_search: string | null; p_limit: number; p_offset: number };
        Returns: {
          user_id: string | null;
          email: string;
          full_name: string | null;
          username: string | null;
          account_created: string;
          orders: number;
          revenue: number;
          first_purchase: string | null;
          latest_purchase: string | null;
          active_licences: number;
        }[];
      };
      admin_order_status_counts: {
        Args: { p_from: string; p_to: string };
        Returns: { status: string; count: number }[];
      };
      admin_licence_status_counts: {
        Args: Record<string, never>;
        Returns: { status: string; count: number }[];
      };
      admin_purchase_frequency: {
        Args: Record<string, never>;
        Returns: { bucket: string; customers: number }[];
      };
      admin_recent_activity: {
        Args: { p_limit: number };
        Returns: unknown[];
      };
      admin_coupon_usage: {
        Args: { p_code: string; p_email: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
