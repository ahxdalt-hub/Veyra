import type { OrderStatus } from "@/lib/orders";

/**
 * Minimal hand-written database types for the tables the account area
 * touches through the user session (RLS enforced). Kept in sync with
 * supabase/migrations/0002_orders.sql, 0003_customer_accounts.sql, and
 * 0007_seats.sql.
 * When the Supabase CLI becomes available these can be replaced by
 * generated types (`supabase gen types typescript`) — the shapes match.
 */

export type OrderRow = {
  id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  email: string;
  user_id: string | null;
  product_slug: string;
  quantity: number;
  amount: number;
  currency: string;
  status: OrderStatus;
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

type Tables = {
  orders: OrderRow;
  profiles: ProfileRow;
  entitlements: EntitlementRow;
  licences: LicenceRow;
  seat_assignments: SeatAssignmentRow;
  redelivery_requests: RedeliveryRequestRow;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
