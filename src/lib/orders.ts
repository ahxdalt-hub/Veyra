/**
 * Orders — persistence for the commerce flow (Stage 02).
 *
 * Backed by Supabase (public.orders, see supabase/migrations/0002_orders.sql)
 * using the service-role key server-side — the same convention as the
 * leads table. When Supabase env vars are absent, an in-memory store keeps
 * the whole flow testable in local development; it is clearly labelled
 * and never used when the real database is configured.
 *
 * Status lifecycle in this stage:
 *   pending → paid      (server-verified signature + Razorpay payment state)
 *   pending → failed    (payment failure reported by checkout / Razorpay)
 *   pending → cancelled (customer dismissed the payment modal)
 *   paid → refunded     (future phase — set via Razorpay dashboard/refunds)
 *
 * WEBHOOKS: /api/webhooks/razorpay confirms 'pending' orders by
 * razorpay_order_id, making this table the source of truth even when the
 * customer's browser closes mid-verification. The unique constraint on
 * razorpay_order_id provides idempotent confirmation keying, and the
 * conditional status updates prevent a late event from overwriting a
 * resolved order.
 */

import { FLAGSHIP_SLUG, revalidateFoundingStatus } from "@/lib/founding";

export type OrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type Order = {
  /** Internal order id (uuid, used in URLs and as the Razorpay receipt). */
  id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  email: string;
  /** Owning auth user, when the purchase is (or becomes) tied to a
   *  Veyra account. Guest orders stay null until claimed by the
   *  account's verified email — see src/lib/fulfillment.ts. */
  user_id: string | null;
  product_slug: string;
  quantity: number;
  /** Smallest currency unit — cents. Always server-computed. This is the
   *  authoritative CHARGED amount: what Razorpay was asked for. */
  amount: number;
  currency: string;
  status: OrderStatus;
  /* --- Coupon trail (0013) — optional; written when a code was applied.
   *  subtotal/discount/total are cents, mirroring amount: total equals
   *  amount whenever a discount applies. Legacy rows leave these null. --- */
  /** Pre-discount server-computed total, cents. */
  subtotal: number | null;
  /** Coupon discount, cents (never negative). */
  discount: number | null;
  /** Post-discount payable total, cents (= amount when a coupon applied). */
  total: number | null;
  /** Coupon code applied, lowercase, if any. */
  coupon_code: string | null;
  /** When the payment was confirmed (set on the pending→paid transition). */
  paid_at: string | null;
  /** Payment provider label ('razorpay'); informational. */
  provider: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderRow = Order;

/** The insert payload: everything except server-managed timestamps. The
 *  coupon-trail columns are optional (absent = no discount applied). */
export type NewOrder = Omit<
  Order,
  "created_at" | "updated_at" | "subtotal" | "discount" | "total" | "coupon_code" | "paid_at" | "provider"
> &
  Partial<Pick<Order, "subtotal" | "discount" | "total" | "coupon_code" | "provider">>;

const TABLE = "orders";

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function supabaseHeaders(): Record<string, string> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function supabaseUrl(): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "")}/rest/v1/${TABLE}`;
}

/* ------------------------------------------------------------------ */
/* Dev fallback — in-memory, single process, never used in production  */
/* ------------------------------------------------------------------ */

const devStore = new Map<string, Order>();

/** All orders from the dev fallback store (admin reads, local dev only). */
export function devStoreOrders(): Order[] {
  return Array.from(devStore.values());
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function usingDevOrderStore(): boolean {
  return !supabaseConfigured();
}

export async function insertOrder(
  order: NewOrder
): Promise<Order> {
  if (!supabaseConfigured()) {
    const now = new Date().toISOString();
    const row: Order = {
      subtotal: null,
      discount: null,
      total: null,
      coupon_code: null,
      paid_at: null,
      provider: null,
      ...order,
      created_at: now,
      updated_at: now,
    };
    devStore.set(row.id, row);
    console.log(`[orders] dev-store insert ${row.id} (${order.status})`);
    return row;
  }

  const res = await fetch(supabaseUrl(), {
    method: "POST",
    headers: { ...supabaseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(order),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Order insert failed (${res.status}): ${detail}`);
  }
  const rows = (await res.json()) as Order[];
  if (!rows[0]) throw new Error("Order insert returned no row.");
  return rows[0];
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!supabaseConfigured()) {
    return devStore.get(id) ?? null;
  }

  const url = `${supabaseUrl()}?id=eq.${encodeURIComponent(id)}&select=*`;
  const res = await fetch(url, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Order fetch failed (${res.status}): ${detail}`);
  }
  const rows = (await res.json()) as Order[];
  return rows[0] ?? null;
}

/** Look up an order by its Razorpay order id — the webhook's key, since
 *  webhook payloads reference Razorpay entities, not our internal uuid. */
export async function getOrderByRazorpayOrderId(
  razorpayOrderId: string
): Promise<Order | null> {
  if (!supabaseConfigured()) {
    for (const row of devStore.values()) {
      if (row.razorpay_order_id === razorpayOrderId) return row;
    }
    return null;
  }

  const url = `${supabaseUrl()}?razorpay_order_id=eq.${encodeURIComponent(
    razorpayOrderId
  )}&select=*`;
  const res = await fetch(url, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Order fetch failed (${res.status}): ${detail}`);
  }
  const rows = (await res.json()) as Order[];
  return rows[0] ?? null;
}

/**
 * Transition an order's status. `expectedCurrent` (when provided) makes the
 * update conditional — e.g. cancellation only applies while still pending,
 * so a late cancel cannot overwrite a verified payment.
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  options?: {
    expectedCurrent?: OrderStatus;
    razorpayPaymentId?: string;
  }
): Promise<Order | null> {
  if (!supabaseConfigured()) {
    const row = devStore.get(id);
    if (!row) return null;
    if (
      options?.expectedCurrent &&
      row.status !== options.expectedCurrent
    ) {
      return row;
    }
    const next: Order = {
      ...row,
      status,
      updated_at: new Date().toISOString(),
      razorpay_payment_id:
        options?.razorpayPaymentId ?? row.razorpay_payment_id,
      paid_at: status === "paid" && !row.paid_at ? new Date().toISOString() : row.paid_at,
    };
    devStore.set(id, next);
    console.log(`[orders] dev-store ${id} → ${status}`);
    invalidateFoundingIfAllocationMoved(next);
    return next;
  }

  const params = new URLSearchParams({ id: `eq.${id}` });
  if (options?.expectedCurrent) {
    params.set("status", `eq.${options.expectedCurrent}`);
  }
  const body: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (options?.razorpayPaymentId) {
    body.razorpay_payment_id = options.razorpayPaymentId;
  }
  // Confirm the payment instant. The DB trigger (0014) is the authoritative
  // stamper; writing it here keeps the API layer self-describing and the
  // expectedCurrent filter already guards against re-stamping.
  if (status === "paid") {
    body.paid_at = new Date().toISOString();
  }

  const res = await fetch(`${supabaseUrl()}?${params.toString()}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=representation" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Order update failed (${res.status}): ${detail}`);
  }
  const rows = (await res.json()) as Order[];
  // Empty array = conditional update didn't match (e.g. no longer pending).
  const updated = rows[0] ?? null;
  if (updated) invalidateFoundingIfAllocationMoved(updated);
  return updated;
}

/**
 * A paid (or un-paid) flagship order moves the founding allocation, so
 * the banner's cached state must refresh. Only statuses that change the
 * paid count matter; other transitions (pending→cancelled, …) skip it.
 */
function invalidateFoundingIfAllocationMoved(order: Order): void {
  if (order.product_slug !== FLAGSHIP_SLUG) return;

  if (order.status !== "paid" && order.status !== "refunded") return;
  revalidateFoundingStatus();
}

/** Safe projection for client-facing API responses (no PII, no Razorpay ids). */
export function publicOrder(order: Order) {
  return {
    id: order.id,
    status: order.status,
    productSlug: order.product_slug,
    productName: null, // filled by callers with catalog data
    quantity: order.quantity,
    amount: order.amount,
    currency: order.currency,
    createdAt: order.created_at,
  };
}
