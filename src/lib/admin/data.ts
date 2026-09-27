import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import { devStoreOrders } from "@/lib/orders";
import { products as catalog, getProduct } from "@/lib/products";
import type {
  AdminAuditLogRow,
  AdminMetrics,
  AdminNotificationRow,
  AdminTotals,
  CouponRow,
  Database,
  DownloadEventRow,
  EntitlementRow,
  LicenceRow,
  OrderRow,
  ProfileRow,
  RedeliveryRequestRow,
  SeatAssignmentRow,
} from "@/lib/supabase/types";

/**
 * Command-center data layer — the ONLY place admin reads happen.
 *
 * Rules this module never breaks:
 *  - Every function runs server-side with the service-role key; the
 *    browser never holds these functions (server-only + NEXT_PUBLIC-free
 *    env, see src/lib/supabase/config.ts).
 *  - Aggregation (metrics, series, rollups) happens in Postgres through
 *    the admin_* RPCs (0012_admin_rpc.sql), never by loading tables into
 *    Node or the browser.
 *  - Reads are bounded: every list is limited; nothing selects a whole
 *    table.
 *  - Zero fabricated data: when the database is empty, callers receive
 *    empty results / nulls and pages render honest empty states.
 */

export function commandCenterConfigured(): boolean {
  return supabaseAdminConfigured();
}

/** PostgREST or/ilike terms must not carry filter commas (they'd break
 *  the or= syntax) — strip anything outside a sane character class. */
function sanitizeSearch(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9@._+-]/g, "").slice(0, 80);
}

function db(): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/* ------------------------------------------------------------------ */
/* Time ranges                                                         */
/* ------------------------------------------------------------------ */

export type RangeKey = "today" | "7d" | "30d" | "90d" | "year" | "all";

/** [from, to) resolved against the current instant. */
export function rangeBounds(
  range: RangeKey,
  custom?: { from: Date; to: Date }
): { from: Date; to: Date } {
  if (custom) return custom;
  const to = new Date();
  const from = new Date(to);
  switch (range) {
    case "today":
      from.setHours(0, 0, 0, 0);
      break;
    case "7d":
      from.setDate(to.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case "30d":
      from.setDate(to.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    case "90d":
      from.setDate(to.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      break;
    case "year":
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
    case "all":
      return { from: new Date("2020-01-01T00:00:00Z"), to };
  }
  return { from, to };
}

/* ------------------------------------------------------------------ */
/* Metrics & series                                                    */
/* ------------------------------------------------------------------ */

export async function getMetrics(
  range: RangeKey,
  custom?: { from: Date; to: Date }
): Promise<AdminMetrics | null> {
  if (!commandCenterConfigured()) return null;
  const { from, to } = rangeBounds(range, custom);
  const { data, error } = await db().rpc("admin_metrics", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) {
    console.error("[cc] admin_metrics failed:", error.message);
    return null;
  }
  const metrics = data as unknown as AdminMetrics;
  // Free claims ($0 'free-claim' orders) are grants, not sales — pull
  // them back out of the order counts so Revenue/Orders/AOV read paid
  // only. Revenue itself is untouched (free claims are $0 by
  // construction); the claim side is reported by getFreeClaims().
  const free = await listFreeClaimOrders(from, to);
  metrics.orders -= free.length;
  metrics.paid_orders -= free.filter((r) => r.status === "paid").length;
  return metrics;
}

export async function getTotals(): Promise<AdminTotals | null> {
  if (!commandCenterConfigured()) return null;
  const { data, error } = await db().rpc("admin_totals");
  if (error) {
    console.error("[cc] admin_totals failed:", error.message);
    return null;
  }
  return data as unknown as AdminTotals;
}

export type RevenuePoint = {
  bucket: string;
  revenue: number;
  orders: number;
  paid: number;
};

export async function getRevenueSeries(
  range: RangeKey,
  custom?: { from: Date; to: Date }
): Promise<RevenuePoint[]> {
  if (!commandCenterConfigured()) return [];
  const { from, to } = rangeBounds(range, custom);
  const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
  // Hourly detail is only meaningful below ~3 days; beyond that, daily.
  const bucket = spanDays <= 3 ? "hour" : "day";
  const { data, error } = await db().rpc("admin_revenue_series", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_bucket: bucket,
  });
  if (error) {
    console.error("[cc] admin_revenue_series failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as RevenuePoint[];
}

export type ProductBreakdown = {
  product_slug: string;
  revenue: number;
  units: number;
  paid_orders: number;
};

export async function getProductBreakdown(
  range: RangeKey,
  custom?: { from: Date; to: Date }
): Promise<ProductBreakdown[]> {
  if (!commandCenterConfigured()) return [];
  const { from, to } = rangeBounds(range, custom);
  const { data, error } = await db().rpc("admin_product_breakdown", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) return [];
  // Same rule as getMetrics: free claims are not sales. Decrement the
  // claimed product's units/order counts (the Growth Audit row is
  // usually free-claims only, so it drops out of "Products sold" and
  // "Revenue by product" entirely); the claim side lives in
  // getFreeClaims().
  const free = await listFreeClaimOrders(from, to);
  const freePaid = free.filter((r) => r.status === "paid");
  if (freePaid.length === 0) return (data ?? []) as unknown as ProductBreakdown[];
  const unitsBySlug = new Map<string, number>();
  const ordersBySlug = new Map<string, number>();
  for (const r of freePaid) {
    unitsBySlug.set(r.product_slug, (unitsBySlug.get(r.product_slug) ?? 0) + r.quantity);
    ordersBySlug.set(r.product_slug, (ordersBySlug.get(r.product_slug) ?? 0) + 1);
  }
  const rows = (data ?? []) as unknown as ProductBreakdown[];
  return rows
    .map((row) => {
      const units = unitsBySlug.get(row.product_slug);
      if (!units) return row;
      return {
        ...row,
        units: row.units - units,
        paid_orders: row.paid_orders - (ordersBySlug.get(row.product_slug) ?? 0),
      };
    })
    .filter((row) => row.units > 0 || row.revenue > 0);
}

/* ------------------------------------------------------------------ */
/* Free claims — the $0 Growth Audit grants                            */
/* ------------------------------------------------------------------ */

export type FreeClaimStats = {
  /** Paid free-claim orders in the window. */
  claims: number;
  /** Distinct accounts that claimed (user_id, falling back to email). */
  accounts: number;
  /** Free units handed out (quantity summed). */
  units: number;
  product: string | null;
  latest_email: string | null;
  latest_at: string | null;
};

/** Bounded read of the window's free-claim orders. Claims are a trickle
 *  (one per account, enforced by 0019's unique index), so 1000 rows
 *  covers any real window. */
async function listFreeClaimOrders(from: Date, to: Date): Promise<OrderRow[]> {
  const { data, error } = await db()
    .from("orders")
    .select(
      "id,email,user_id,product_slug,quantity,amount,status,provider,created_at"
    )
    .eq("provider", "free-claim")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error("[cc] free-claim orders failed:", error.message);
    return [];
  }
  return (data ?? []) as unknown as OrderRow[];
}

/** How many accounts claimed the free product for free, in the window.
 *  The overview's separate "Free claims" card reads this — the sales
 *  metrics deliberately do not contain these orders. */
export async function getFreeClaims(
  range: RangeKey,
  custom?: { from: Date; to: Date }
): Promise<FreeClaimStats | null> {
  if (!commandCenterConfigured()) return null;
  const { from, to } = rangeBounds(range, custom);
  const rows = await listFreeClaimOrders(from, to);
  const paid = rows.filter((r) => r.status === "paid");
  const accounts = new Set(paid.map((r) => r.user_id ?? r.email.toLowerCase()));
  return {
    claims: paid.length,
    accounts: accounts.size,
    units: paid.reduce((s, r) => s + r.quantity, 0),
    product: paid[0] ? (getProduct(paid[0].product_slug)?.name ?? paid[0].product_slug) : null,
    latest_email: paid[0]?.email ?? null,
    latest_at: paid[0]?.created_at ?? null,
  };
}

export async function getOrderStatusCounts(
  range: RangeKey,
  custom?: { from: Date; to: Date }
): Promise<{ status: string; count: number }[]> {
  if (!commandCenterConfigured()) return [];
  const { from, to } = rangeBounds(range, custom);
  const { data, error } = await db().rpc("admin_order_status_counts", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) return [];
  return (data ?? []) as unknown as { status: string; count: number }[];
}

export async function getLicenceStatusCounts(): Promise<{ status: string; count: number }[]> {
  if (!commandCenterConfigured()) return [];
  const { data, error } = await db().rpc("admin_licence_status_counts");
  if (error) return [];
  return (data ?? []) as unknown as { status: string; count: number }[];
}

/** Seats + active device count + last activation per licence — joined in
 *  two bounded queries for a page's worth of ids (the licences list). */
export async function getLicenceSeatStats(
  licenceIds: string[]
): Promise<Record<string, { seats: number; activeDevices: number; lastActivation: string | null }>> {
  const out: Record<string, { seats: number; activeDevices: number; lastActivation: string | null }> = {};
  if (!commandCenterConfigured() || licenceIds.length === 0) return out;
  const client = db();
  // licences → entitlement.seats
  const { data: licRows } = await client
    .from("licences")
    .select("id, entitlement_id")
    .in("id", licenceIds)
    .limit(100);
  const entByLicence = new Map((licRows ?? []).map((l) => [l.id, l.entitlement_id]));
  const entIds = [...new Set([...entByLicence.values()])];
  const seatsByEnt = new Map<string, number>();
  if (entIds.length) {
    const { data: ents } = await client
      .from("entitlements")
      .select("id, seats")
      .in("id", entIds)
      .limit(100);
    for (const e of ents ?? []) seatsByEnt.set(e.id, e.seats);
  }
  // activations → per-licence device truth
  const { data: acts } = await client
    .from("licence_activations")
    .select("licence_id, status, last_seen_at")
    .in("licence_id", licenceIds)
    .limit(1000);
  for (const l of licRows ?? []) {
    out[l.id] = {
      seats: seatsByEnt.get(entByLicence.get(l.id) ?? "") ?? 0,
      activeDevices: 0,
      lastActivation: null,
    };
  }
  for (const a of acts ?? []) {
    const cur = out[a.licence_id];
    if (!cur) continue;
    if (a.status === "active") cur.activeDevices += 1;
    if (!cur.lastActivation || a.last_seen_at > cur.lastActivation)
      cur.lastActivation = a.last_seen_at;
  }
  return out;
}

/** The focused licence's product name for the drawer host. */
export async function getLicenceProductName(licenceId: string): Promise<string | null> {
  if (!commandCenterConfigured()) return null;
  const { data } = await db().from("licences").select("product_slug").eq("id", licenceId).maybeSingle();
  return data?.product_slug ?? null;
}

export async function getPurchaseFrequency(): Promise<{ bucket: string; customers: number }[]> {
  if (!commandCenterConfigured()) return [];
  const { data, error } = await db().rpc("admin_purchase_frequency");
  if (error) return [];
  return (data ?? []) as unknown as { bucket: string; customers: number }[];
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export const PAGE_MAX = 100;

export type OrderFilters = {
  search?: string; // email fragment or exact order id
  status?: OrderRow["status"];
  productSlug?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

export async function listOrders(
  filters: OrderFilters
): Promise<{ rows: OrderRow[]; total: number } | null> {
  if (!commandCenterConfigured()) return null;
  const limit = Math.min(filters.limit ?? 25, PAGE_MAX);
  const offset = filters.offset ?? 0;
  let query = db()
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.productSlug) query = query.eq("product_slug", filters.productSlug);
  if (filters.from) query = query.gte("created_at", filters.from.toISOString());
  if (filters.to) query = query.lt("created_at", filters.to.toISOString());
  if (filters.search) {
    const s = sanitizeSearch(filters.search);
    if (s) query = query.or(`email.ilike.*${s}*,id.eq.${s}`);
  }
  const { data, error, count } = await query;
  if (error) {
    console.error("[cc] listOrders failed:", error.message);
    return null;
  }
  return { rows: (data ?? []) as OrderRow[], total: count ?? 0 };
}

export type OrderDetail = {
  order: OrderRow;
  entitlement: EntitlementRow | null;
  licence: LicenceRow | null;
  seats: SeatAssignmentRow[];
  activations: ActivationRowLite[];
  downloads: DownloadEventRow[];
  notifications: AdminNotificationRow[];
};

/** Licence activations joined into order detail (licence_activations is
 *  the device registry from 0008). */
export type ActivationRowLite = {
  id: string;
  device_label: string | null;
  activated_email: string;
  status: string;
  activated_at: string;
  last_seen_at: string;
};

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  if (!commandCenterConfigured()) return null;
  const client = db();
  const orderR = await client.from("orders").select("*").eq("id", id).maybeSingle();
  const order = orderR.data as OrderRow | null;
  if (!order) return null;

  const entR = await client
    .from("entitlements")
    .select("*")
    .eq("order_id", id)
    .maybeSingle();
  const entitlement = entR.data as EntitlementRow | null;

  let licence: LicenceRow | null = null;
  let seats: SeatAssignmentRow[] = [];
  let activations: ActivationRowLite[] = [];
  if (entitlement) {
    const [licR, seatR] = await Promise.all([
      client.from("licences").select("*").eq("entitlement_id", entitlement.id).maybeSingle(),
      client
        .from("seat_assignments")
        .select("*")
        .eq("entitlement_id", entitlement.id)
        .order("seat_number"),
    ]);
    licence = licR.data as LicenceRow | null;
    seats = (seatR.data ?? []) as SeatAssignmentRow[];
    if (licence) {
      const actR = await client
        .from("licence_activations")
        .select("id, device_label, activated_email, status, activated_at, last_seen_at")
        .eq("licence_id", licence.id)
        .order("activated_at", { ascending: false })
        .limit(20);
      activations = (actR.data ?? []) as ActivationRowLite[];
    }
  }

  const [dlR, noteR] = await Promise.all([
    client
      .from("download_events")
      .select("*")
      .eq("email", order.email)
      .eq("product_slug", order.product_slug)
      .order("created_at", { ascending: false })
      .limit(10),
    client
      .from("admin_notifications")
      .select("*")
      .eq("related_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  return {
    order,
    entitlement,
    licence,
    seats,
    activations,
    downloads: (dlR.data ?? []) as DownloadEventRow[],
    notifications: (noteR.data ?? []) as AdminNotificationRow[],
  };
}

/* ------------------------------------------------------------------ */
/* Customers                                                           */
/* ------------------------------------------------------------------ */

export type CustomerRollup = {
  user_id: string | null;
  email: string;
  full_name: string | null;
  username: string | null;
  account_created: string | null;
  orders: number;
  revenue: number;
  first_purchase: string | null;
  latest_purchase: string | null;
  active_licences: number;
};

export async function listCustomers(
  options?: { search?: string; limit?: number; offset?: number }
): Promise<CustomerRollup[] | null> {
  if (!commandCenterConfigured()) return null;
  const { data, error } = await db().rpc("admin_customer_rollups", {
    p_search: options?.search?.trim() || null,
    p_limit: Math.min(options?.limit ?? 50, 100),
    p_offset: options?.offset ?? 0,
  });
  if (error) {
    console.error("[cc] customer rollups failed:", error.message);
    return null;
  }
  return (data ?? []) as unknown as CustomerRollup[];
}

/** Everything the customer drawer needs, keyed on the purchase email. */
export type CustomerProfile = {
  profile: ProfileRow | null;
  orders: OrderRow[];
  entitlements: EntitlementRow[];
  licences: LicenceRow[];
  seats: SeatAssignmentRow[];
  downloads: DownloadEventRow[];
  redeliveries: RedeliveryRequestRow[];
};

export async function getCustomerProfile(email: string): Promise<CustomerProfile | null> {
  if (!commandCenterConfigured()) return null;
  const client = db();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const ordersR = await client
    .from("orders")
    .select("*")
    .eq("email", normalized)
    .order("created_at", { ascending: false })
    .limit(100);
  const orders = (ordersR.data ?? []) as OrderRow[];

  let profile: ProfileRow | null = null;
  const userId = orders.find((o) => o.user_id)?.user_id ?? null;
  if (userId) {
    const pr = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
    profile = pr.data as ProfileRow | null;
  }

  const [entR, licR, dlR, rrR] = await Promise.all([
    client.from("entitlements").select("*").eq("email", normalized).order("granted_at", { ascending: false }).limit(100),
    client.from("licences").select("*").eq("email", normalized).order("issued_at", { ascending: false }).limit(100),
    client.from("download_events").select("*").eq("email", normalized).order("created_at", { ascending: false }).limit(50),
    client.from("redelivery_requests").select("*").eq("product_slug", "").order("created_at", { ascending: false }).limit(0),
  ]);
  void rrR;
  const entitlements = (entR.data ?? []) as EntitlementRow[];
  const licences = (licR.data ?? []) as LicenceRow[];
  const downloads = (dlR.data ?? []) as DownloadEventRow[];

  const entIds = entitlements.map((e) => e.id);
  let seats: SeatAssignmentRow[] = [];
  if (entIds.length) {
    const seatR = await client
      .from("seat_assignments")
      .select("*")
      .in("entitlement_id", entIds)
      .order("seat_number");
    seats = (seatR.data ?? []) as SeatAssignmentRow[];
  }
  let redeliveries: RedeliveryRequestRow[] = [];
  if (userId) {
    const rr = await client
      .from("redelivery_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    redeliveries = (rr.data ?? []) as RedeliveryRequestRow[];
  }

  return { profile, orders, entitlements, licences, seats, downloads, redeliveries };
}

/* ------------------------------------------------------------------ */
/* Licences                                                            */
/* ------------------------------------------------------------------ */

export type LicenceFilters = {
  search?: string; // reference or email fragment
  status?: "active" | "revoked";
  productSlug?: string;
  limit?: number;
  offset?: number;
};

export async function listLicences(
  filters: LicenceFilters
): Promise<{ rows: LicenceRow[]; total: number } | null> {
  if (!commandCenterConfigured()) return null;
  const limit = Math.min(filters.limit ?? 25, PAGE_MAX);
  const offset = filters.offset ?? 0;
  let query = db()
    .from("licences")
    .select("*", { count: "exact" })
    .order("issued_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.productSlug) query = query.eq("product_slug", filters.productSlug);
  if (filters.search) {
    const s = filters.search.trim();
    if (s) query = query.or(`licence_reference.ilike.*${s}*,email.ilike.*${s}*`);
  }
  const { data, error, count } = await query;
  if (error) {
    console.error("[cc] listLicences failed:", error.message);
    return null;
  }
  return { rows: (data ?? []) as LicenceRow[], total: count ?? 0 };
}

export type LicenceDetail = {
  licence: LicenceRow;
  entitlement: EntitlementRow | null;
  order: OrderRow | null;
  seats: SeatAssignmentRow[];
  activations: ActivationRowLite[];
  customer: ProfileRow | null;
};

export async function getLicenceDetail(id: string): Promise<LicenceDetail | null> {
  if (!commandCenterConfigured()) return null;
  const client = db();
  const licR = await client.from("licences").select("*").eq("id", id).maybeSingle();
  const licence = licR.data as LicenceRow | null;
  if (!licence) return null;

  const entR = await client
    .from("entitlements")
    .select("*")
    .eq("id", licence.entitlement_id)
    .maybeSingle();
  const entitlement = entR.data as EntitlementRow | null;

  let order: OrderRow | null = null;
  if (entitlement) {
    const oR = await client.from("orders").select("*").eq("id", entitlement.order_id).maybeSingle();
    order = oR.data as OrderRow | null;
  }

  const [seatR, actR] = await Promise.all([
    client
      .from("seat_assignments")
      .select("*")
      .eq("entitlement_id", licence.entitlement_id)
      .order("seat_number"),
    client
      .from("licence_activations")
      .select("id, device_label, activated_email, status, activated_at, last_seen_at")
      .eq("licence_id", licence.id)
      .order("activated_at", { ascending: false })
      .limit(50),
  ]);

  let customer: ProfileRow | null = null;
  if (licence.user_id) {
    const pR = await client.from("profiles").select("*").eq("id", licence.user_id).maybeSingle();
    customer = pR.data as ProfileRow | null;
  }

  return {
    licence,
    entitlement,
    order,
    seats: (seatR.data ?? []) as SeatAssignmentRow[],
    activations: (actR.data ?? []) as ActivationRowLite[],
    customer,
  };
}

/* ------------------------------------------------------------------ */
/* Downloads / delivery registry                                       */
/* ------------------------------------------------------------------ */

export type DownloadSummary = {
  slug: string;
  name: string;
  /** Registry (product_versions) current version when present, else the
   *  web catalog's declared version. The UI labels which source it is. */
  effectiveVersion: string | null;
  versionSource: "registry" | "catalog" | null;
  /** Registry release state for the current row (0016): published rows
   *  are actually deliverable; withdrawn/draft are honest flags, and an
   *  artifact_key that's still null means the installer hasn't been
   *  uploaded yet. */
  releaseStatus: "draft" | "published" | "withdrawn" | null;
  artifactReady: boolean;
  purchasable: boolean;
  downloadCount: number;
  lastDownloadAt: string | null;
  redeliveryRequests: number;
};

export async function getDownloadSummary(): Promise<DownloadSummary[] | null> {
  if (!commandCenterConfigured()) return null;
  const client = db();
  const [versionsR, eventsR, redeliveryR] = await Promise.all([
    client.from("product_versions").select("*").order("published_at", { ascending: false }).limit(200),
    client.from("download_events").select("product_slug, created_at").order("created_at", { ascending: false }).limit(2000),
    client.from("redelivery_requests").select("product_slug").limit(1000),
  ]);

  const counts = new Map<string, { count: number; last: string | null }>();
  for (const e of eventsR.data ?? []) {
    const cur = counts.get(e.product_slug) ?? { count: 0, last: null };
    cur.count += 1;
    if (!cur.last) cur.last = e.created_at;
    counts.set(e.product_slug, cur);
  }
  const redeliveryCounts = new Map<string, number>();
  for (const r of redeliveryR.data ?? []) {
    redeliveryCounts.set(r.product_slug, (redeliveryCounts.get(r.product_slug) ?? 0) + 1);
  }

  return catalog.map((p) => {
    const registry = (versionsR.data ?? []).find((v) => v.product_slug === p.slug && v.current) ?? null;
    const stat = counts.get(p.slug) ?? { count: 0, last: null };
    return {
      slug: p.slug,
      name: p.name,
      effectiveVersion: registry?.version ?? p.version,
      versionSource: registry ? ("registry" as const) : p.version ? ("catalog" as const) : null,
      releaseStatus: registry?.release_status ?? null,
      artifactReady: Boolean(registry?.artifact_key),
      purchasable: p.status === "available",
      downloadCount: stat.count,
      lastDownloadAt: stat.last,
      redeliveryRequests: redeliveryCounts.get(p.slug) ?? 0,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */

export async function listCoupons(): Promise<CouponRow[] | null> {
  if (!commandCenterConfigured()) return null;
  const { data, error } = await db().from("coupons").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[cc] listCoupons failed:", error.message);
    return null;
  }
  return (data ?? []) as CouponRow[];
}

/* ------------------------------------------------------------------ */
/* Notifications / audit / activity feed                               */
/* ------------------------------------------------------------------ */

export async function listNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}): Promise<AdminNotificationRow[] | null> {
  if (!commandCenterConfigured()) return null;
  const limit = Math.min(options?.limit ?? 30, 100);
  const offset = options?.offset ?? 0;
  let query = db()
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (options?.unreadOnly) query = query.is("read_at", null);
  const { data, error } = await query;
  if (error) return null;
  return (data ?? []) as AdminNotificationRow[];
}

export async function unreadNotificationCount(): Promise<number> {
  if (!commandCenterConfigured()) return 0;
  const { count, error } = await db()
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  if (!commandCenterConfigured()) return false;
  const { error } = await db()
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  return !error;
}

export async function markAllNotificationsRead(): Promise<number> {
  if (!commandCenterConfigured()) return 0;
  const { data, error } = await db()
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .select("id");
  if (error) return 0;
  return data?.length ?? 0;
}

export async function listAuditEvents(
  limit = 50,
  offset = 0
): Promise<AdminAuditLogRow[] | null> {
  if (!commandCenterConfigured()) return null;
  const capped = Math.min(limit, PAGE_MAX);
  const { data, error } = await db()
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + capped - 1);
  if (error) return null;
  return (data ?? []) as AdminAuditLogRow[];
}

/* ------------------------------------------------------------------ */
/* Product stats (joined aggregates for the Products page)             */
/* ------------------------------------------------------------------ */

export type ProductStats = {
  paidOrders: number;
  units: number;
  revenue: number;
  licences: number;
  activeLicences: number;
};

export async function getProductStats(): Promise<Record<string, ProductStats>> {
  const stats: Record<string, ProductStats> = {};
  for (const p of catalog) {
    stats[p.slug] = { paidOrders: 0, units: 0, revenue: 0, licences: 0, activeLicences: 0 };
  }
  for (const row of await getProductBreakdown("all")) {
    const cur = (stats[row.product_slug] ??= {
      paidOrders: 0,
      units: 0,
      revenue: 0,
      licences: 0,
      activeLicences: 0,
    });
    cur.paidOrders += row.paid_orders;
    cur.units += row.units;
    cur.revenue += row.revenue;
  }
  if (commandCenterConfigured()) {
    const { data } = await db().from("licences").select("product_slug, status").limit(5000);
    for (const l of data ?? []) {
      const cur = (stats[l.product_slug] ??= {
        paidOrders: 0,
        units: 0,
        revenue: 0,
        licences: 0,
        activeLicences: 0,
      });
      cur.licences += 1;
      if (l.status === "active") cur.activeLicences += 1;
    }
  }
  return stats;
}

/* ------------------------------------------------------------------ */
/* Global search                                                       */
/* ------------------------------------------------------------------ */

export type SearchResults = {
  orders: { id: string; email: string; status: string; amountLabel: string; created_at: string }[];
  customers: { email: string; name: string | null; orders: number; revenue: number }[];
  products: { slug: string; name: string; status: string }[];
  licences: { id: string; reference: string; email: string; product: string; status: string }[];
  coupons: { code: string; label: string; active: boolean }[];
};

export async function globalSearch(q: string): Promise<SearchResults> {
  const term = q.trim().toLowerCase();
  const catalogResults = catalog
    .filter((p) => p.name.toLowerCase().includes(term) || p.slug.includes(term))
    .slice(0, 5)
    .map((p) => ({ slug: p.slug, name: p.name, status: p.status }));
  const empty: SearchResults = { orders: [], customers: [], products: catalogResults, licences: [], coupons: [] };
  if (!term || !commandCenterConfigured()) return empty;

  const client = db();
  // PostgREST like/ilike use `*` as the wildcard character.
  const like = `*${sanitizeSearch(term)}*`;
  const safeId = /^[0-9a-f-]{36}$/i.test(term) ? term : "*";
  const [ordersR, customers, licencesR, couponsR] = await Promise.all([
    client
      .from("orders")
      .select("id, email, status, amount, currency, created_at")
      .or(`email.ilike.${like},id.eq.${safeId}`)
      .order("created_at", { ascending: false })
      .limit(5),
    listCustomers({ search: term, limit: 5 }),
    client
      .from("licences")
      .select("id, licence_reference, email, product_slug, status")
      .or(`licence_reference.ilike.${like},email.ilike.${like}`)
      .order("issued_at", { ascending: false })
      .limit(5),
    client.from("coupons").select("code, label, active").or(`code.ilike.${like},label.ilike.${like}`).limit(5),
  ]);
  return {
    orders: (ordersR.data ?? []).map((o) => ({
      id: o.id,
      email: o.email,
      status: o.status,
      amountLabel: `$${(o.amount / 100).toFixed(2)}`,
      created_at: o.created_at,
    })),
    customers: (customers ?? []).map((c) => ({
      email: c.email,
      name: c.full_name ?? c.username,
      orders: c.orders,
      revenue: c.revenue,
    })),
    products: catalogResults,
    licences: (licencesR.data ?? []).map((l) => ({
      id: l.id,
      reference: l.licence_reference,
      email: l.email,
      product: getProduct(l.product_slug)?.name ?? l.product_slug,
      status: l.status,
    })),
    coupons: (couponsR.data ?? []).map((c) => ({ code: c.code, label: c.label, active: c.active })),
  };
}

/* ------------------------------------------------------------------ */
/* Dev-mode transparency                                               */
/* ------------------------------------------------------------------ */

/** When the DB isn't configured, orders only exist in the local dev
 *  store. The command center surfaces them clearly labelled
 *  "local dev data" instead of pretending they're production rows. */
export function devOrdersWhenLocal(): OrderRow[] {
  if (commandCenterConfigured()) return [];
  return devStoreOrders() as unknown as OrderRow[];
}
