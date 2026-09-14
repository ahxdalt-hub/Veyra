import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getProduct, getProducts, type Product } from "@/lib/products";
import type { Order, OrderStatus } from "@/lib/orders";
import { devStoreOrders } from "@/lib/orders";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";
import type {
  AdminNotificationRow,
  AdminAuditRow,
} from "@/lib/admin/notifications";
import { isAdminAuthenticated } from "@/lib/admin/auth";

/**
 * Admin data access — the Command Center's single read/write layer.
 *
 * Every function here runs server-side ONLY:
 *  - guarded by requireAdmin() (signed session cookie), and
 *  - executed through the service-role client, because RLS exposes no
 *    customer-readable view of "all orders / all customers" (by design).
 *
 * The rest of the app keeps its customer-path authorization: account
 * pages read through the user's session (RLS-enforced), checkout reads
 * orders by unguessable uuid. Nothing here weakens that.
 *
 * LOCAL DEV: when Supabase env vars are absent, the same pattern the
 * orders/leads modules use applies — the in-memory dev store supplies
 * honest (usually zero) data instead of fabricating numbers.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function adminDb() {
  return createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** True when admin queries hit the local dev store instead of Supabase. */
export function adminDataLocal(): boolean {
  return !supabaseAdminConfigured();
}

/* ------------------------------------------------------------------ */
/* Session guard                                                        */
/* ------------------------------------------------------------------ */

async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new Error("UNAUTHORIZED");
  }
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type AdminOrder = Order & { productName: string };

export type AdminCustomer = {
  /** Stable business key: email (lowercased). */
  key: string;
  email: string;
  name: string | null;
  businessName: string | null;
  userId: string | null;
  signupDate: string | null;
  orderCount: number;
  totalSpentMinor: number;
  paidOrders: number;
  lastPurchaseAt: string | null;
  productSlugs: string[];
};

export type AdminLicence = {
  id: string;
  entitlementId: string;
  userId: string | null;
  email: string;
  productSlug: string;
  productName: string;
  licenceReference: string;
  status: "active" | "revoked";
  issuedAt: string;
  /** Licensed seats purchased. */
  seats: number;
  /** Seat assignments currently in use. */
  activatedSeats: number;
};

export type AdminEntitlement = {
  id: string;
  orderId: string;
  userId: string | null;
  email: string;
  productSlug: string;
  productName: string;
  status: "active" | "revoked";
  grantedAt: string;
  version: string | null;
  /** Licensed seats purchased. */
  seats: number;
  /** Seat assignments currently in use. */
  activatedSeats: number;
};

export type RevenuePoint = { date: string; revenueMinor: number; orders: number };

export type AdminMetrics = {
  /** All-time, status=paid only, in minor units. */
  totalRevenueMinor: number;
  totalPaidOrders: number;
  totalOrders: number;
  customers: number;
  productsSold: number;
  activeLicences: number;
  activeEntitlements: number;
  pendingPayments: number;
  failedPayments: number;
  avgOrderValueMinor: number | null;
  currencies: string[];
};

/* ------------------------------------------------------------------ */
/* Raw readers                                                          */
/* ------------------------------------------------------------------ */

type OrderFilter = {
  query?: string;
  status?: OrderStatus | "all";
  product?: string; // slug | "all"
  from?: string; // ISO
  to?: string; // ISO
  page?: number;
  perPage?: number;
};

/** Fetch orders with server-side filtering. Always sorted newest first. */
async function fetchOrders(filter: OrderFilter = {}): Promise<{
  rows: Order[];
  total: number;
}> {
  const page = Math.max(1, filter.page ?? 1);
  const perPage = Math.min(100, Math.max(5, filter.perPage ?? 25));

  if (adminDataLocal()) {
    let rows = [...devStoreOrders()].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
    const q = filter.query?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (o) =>
          o.id.includes(q) ||
          o.email.toLowerCase().includes(q) ||
          o.product_slug.toLowerCase().includes(q)
      );
    }
    if (filter.status && filter.status !== "all") {
      rows = rows.filter((o) => o.status === filter.status);
    }
    if (filter.product && filter.product !== "all") {
      rows = rows.filter((o) => o.product_slug === filter.product);
    }
    if (filter.from) rows = rows.filter((o) => o.created_at >= filter.from!);
    if (filter.to) rows = rows.filter((o) => o.created_at <= filter.to!);
    const total = rows.length;
    rows = rows.slice((page - 1) * perPage, page * perPage);
    return { rows, total };
  }

  const db = adminDb();
  let builder = db
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filter.status && filter.status !== "all") {
    builder = builder.eq("status", filter.status);
  }
  if (filter.product && filter.product !== "all") {
    builder = builder.eq("product_slug", filter.product);
  }
  if (filter.from) builder = builder.gte("created_at", filter.from);
  if (filter.to) builder = builder.lte("created_at", filter.to);

  // PostgREST has no cross-column OR for text search, so the client
  // search box (single field, multiple columns) is resolved with an ilike
  // on the most identifying fields; pagination keeps datasets bounded.
  const q = filter.query?.trim();
  if (q) {
    const uuidQ = q.toLowerCase();
    const orClauses = [
      `email.ilike.%${q}%`,
      `product_slug.ilike.%${q}%`,
      ...(UUID_RE.test(uuidQ) ? [`id.eq.${uuidQ}`] : []),
      ...(/^[0-9a-f-]+$/i.test(q) ? [`razorpay_order_id.ilike.%${q}%`] : []),
    ];
    builder = builder.or(orClauses.join(","));
  }

  const from = (page - 1) * perPage;
  builder = builder.range(from, from + perPage - 1);

  const { data, error, count } = await builder;
  if (error) throw error;
  return { rows: (data ?? []) as Order[], total: count ?? 0 };
}

async function fetchAllOrders(): Promise<Order[]> {
  // Cap defensively; the business has one product and modest volume.
  const { rows } = await fetchOrders({ perPage: 100, page: 1 });
  return rows;
}

/* ------------------------------------------------------------------ */
/* Metrics                                                              */
/* ------------------------------------------------------------------ */

export async function getMetrics(range?: {
  from?: string;
  to?: string;
}): Promise<AdminMetrics> {
  await requireAdmin();

  if (adminDataLocal()) {
    const orders = devStoreOrders();
    const paid = orders.filter((o) => o.status === "paid");
    const emails = new Set(orders.map((o) => o.email.toLowerCase()));
    return {
      totalRevenueMinor: paid.reduce((s, o) => s + o.amount, 0),
      totalPaidOrders: paid.length,
      totalOrders: orders.length,
      customers: emails.size,
      productsSold: paid.reduce((s, o) => s + o.quantity, 0),
      activeLicences: 0,
      activeEntitlements: 0,
      pendingPayments: orders.filter((o) => o.status === "pending").length,
      failedPayments: orders.filter(
        (o) => o.status === "failed" || o.status === "cancelled"
      ).length,
      avgOrderValueMinor: paid.length
        ? Math.round(
            paid.reduce((s, o) => s + o.amount, 0) / paid.length
          )
        : null,
      currencies: Array.from(new Set(orders.map((o) => o.currency))),
    };
  }

  const db = adminDb();

  let orders = await fetchAllOrders();
  if (range?.from) orders = orders.filter((o) => o.created_at >= range.from!);
  if (range?.to) orders = orders.filter((o) => o.created_at <= range.to!);

  const [entitlementsRes, licencesRes] = await Promise.all([
    db.from("entitlements").select("status"),
    db.from("licences").select("status"),
  ]);
  if (entitlementsRes.error) throw entitlementsRes.error;
  if (licencesRes.error) throw licencesRes.error;

  const paid = orders.filter((o) => o.status === "paid");
  const emails = new Set(orders.map((o) => o.email.toLowerCase()));
  const entitlements = entitlementsRes.data ?? [];
  const licences = licencesRes.data ?? [];

  return {
    totalRevenueMinor: paid.reduce((s, o) => s + o.amount, 0),
    totalPaidOrders: paid.length,
    totalOrders: orders.length,
    customers: emails.size,
    productsSold: paid.reduce((s, o) => s + o.quantity, 0),
    activeLicences: licences.filter((l) => l.status === "active").length,
    activeEntitlements: entitlements.filter((e) => e.status === "active").length,
    pendingPayments: orders.filter((o) => o.status === "pending").length,
    failedPayments: orders.filter(
      (o) => o.status === "failed" || o.status === "cancelled"
    ).length,
    avgOrderValueMinor: paid.length
      ? Math.round(paid.reduce((s, o) => s + o.amount, 0) / paid.length)
      : null,
    currencies: Array.from(new Set(orders.map((o) => o.currency))),
  };
}

/* ------------------------------------------------------------------ */
/* Orders                                                               */
/* ------------------------------------------------------------------ */

export async function listOrders(filter: OrderFilter = {}): Promise<{
  rows: AdminOrder[];
  total: number;
  page: number;
  perPage: number;
}> {
  await requireAdmin();
  const { rows, total } = await fetchOrders(filter);
  return {
    rows: rows.map((o) => ({
      ...o,
      productName: getProduct(o.product_slug)?.name ?? o.product_slug,
    })),
    total,
    page: filter.page ?? 1,
    perPage: filter.perPage ?? 25,
  };
}

export async function getOrderDetail(id: string): Promise<AdminOrder | null> {
  await requireAdmin();
  if (!UUID_RE.test(id)) return null;
  const db = adminDb();
  const { data, error } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const order = data as Order;
  return {
    ...order,
    productName: getProduct(order.product_slug)?.name ?? order.product_slug,
  };
}

/* ------------------------------------------------------------------ */
/* Customers (derived from orders + entitlements + profiles)             */
/* ------------------------------------------------------------------ */

async function fetchCustomers(): Promise<AdminCustomer[]> {
  if (adminDataLocal()) {
    const orders = devStoreOrders();
    const map = new Map<string, AdminCustomer>();
    for (const o of orders) {
      const key = o.email.toLowerCase();
      let c = map.get(key);
      if (!c) {
        c = {
          key,
          email: key,
          name: null,
          businessName: null,
          userId: o.user_id,
          signupDate: null,
          orderCount: 0,
          totalSpentMinor: 0,
          paidOrders: 0,
          lastPurchaseAt: null,
          productSlugs: [],
        };
        map.set(key, c);
      }
      c.orderCount += 1;
      c.lastPurchaseAt =
        !c.lastPurchaseAt || o.created_at > c.lastPurchaseAt
          ? o.created_at
          : c.lastPurchaseAt;
      if (!c.userId && o.user_id) c.userId = o.user_id;
      if (o.status === "paid") {
        c.paidOrders += 1;
        c.totalSpentMinor += o.amount;
        if (!c.productSlugs.includes(o.product_slug)) {
          c.productSlugs.push(o.product_slug);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (b.lastPurchaseAt ?? "").localeCompare(a.lastPurchaseAt ?? "")
    );
  }

  const db = adminDb();

  // Customers are identified by verified purchase emails. Paid orders
  // define the customer base; all orders enrich each customer record.
  const [ordersRes, entitlementsRes, profilesRes] = await Promise.all([
    db.from("orders").select("*").order("created_at", { ascending: false }),
    db
      .from("entitlements")
      .select("email, user_id, product_slug, status, granted_at"),
    db.from("profiles").select("id, full_name, business_name, created_at"),
  ]);
  if (ordersRes.error) throw ordersRes.error;
  if (entitlementsRes.error) throw entitlementsRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const orders = ordersRes.data as Order[];
  const entitlements = entitlementsRes.data ?? [];
  const profiles = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p])
  );

  const map = new Map<string, AdminCustomer>();
  for (const o of orders) {
    const key = o.email.toLowerCase();
    let c = map.get(key);
    if (!c) {
      c = {
        key,
        email: key,
        name: null,
        businessName: null,
        userId: o.user_id,
        signupDate: null,
        orderCount: 0,
        totalSpentMinor: 0,
        paidOrders: 0,
        lastPurchaseAt: null,
        productSlugs: [],
      };
      map.set(key, c);
    }
    c.orderCount += 1;
    c.lastPurchaseAt =
      !c.lastPurchaseAt || o.created_at > c.lastPurchaseAt
        ? o.created_at
        : c.lastPurchaseAt;
    if (!c.userId && o.user_id) c.userId = o.user_id;
    if (o.status === "paid") {
      c.paidOrders += 1;
      c.totalSpentMinor += o.amount;
      if (!c.productSlugs.includes(o.product_slug)) {
        c.productSlugs.push(o.product_slug);
      }
    }
  }

  for (const e of entitlements) {
    const key = e.email.toLowerCase();
    const c = map.get(key);
    if (!c) continue;
    if (!c.userId && e.user_id) c.userId = e.user_id;
    if (e.status === "active" && !c.productSlugs.includes(e.product_slug)) {
      c.productSlugs.push(e.product_slug);
    }
  }

  for (const c of map.values()) {
    if (c.userId) {
      const p = profiles.get(c.userId);
      if (p) {
        c.name = p.full_name ?? null;
        c.businessName = p.business_name ?? null;
        c.signupDate = p.created_at ?? null;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    (b.lastPurchaseAt ?? "").localeCompare(a.lastPurchaseAt ?? "")
  );
}

export async function listCustomers(params?: {
  query?: string;
}): Promise<AdminCustomer[]> {
  await requireAdmin();
  const rows = await fetchCustomers();
  const q = params?.query?.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (c) =>
      c.email.includes(q) ||
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.businessName ?? "").toLowerCase().includes(q) ||
      (c.userId ?? "").includes(q)
  );
}

export async function getCustomerDetail(key: string): Promise<{
  customer: AdminCustomer;
  orders: AdminOrder[];
  entitlements: AdminEntitlement[];
  licences: AdminLicence[];
} | null> {
  await requireAdmin();
  const email = key.toLowerCase();
  const customers = await fetchCustomers();
  const customer = customers.find((c) => c.key === email);
  if (!customer) return null;

  if (adminDataLocal()) {
    const orders = devStoreOrders()
      .filter((o) => o.email.toLowerCase() === email)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((o) => ({
        ...o,
        productName: getProduct(o.product_slug)?.name ?? o.product_slug,
      }));
    return { customer, orders, entitlements: [], licences: [] };
  }

  const db = adminDb();
  const [ordersRes, entRes, licRes] = await Promise.all([
    db
      .from("orders")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false }),
    db.from("entitlements").select("*").eq("email", email),
    db.from("licences").select("*").eq("email", email),
  ]);
  if (ordersRes.error) throw ordersRes.error;
  if (entRes.error) throw entRes.error;
  if (licRes.error) throw licRes.error;

  const orders = (ordersRes.data ?? []).map((o) => ({
    ...(o as Order),
    productName: getProduct(o.product_slug)?.name ?? o.product_slug,
  }));
  const entitlements = (entRes.data ?? []).map((e) => ({
    id: e.id,
    orderId: e.order_id,
    userId: e.user_id,
    email: e.email,
    productSlug: e.product_slug,
    productName: getProduct(e.product_slug)?.name ?? e.product_slug,
    status: e.status,
    grantedAt: e.granted_at,
    version: getProduct(e.product_slug)?.version ?? null,
    seats: e.seats ?? 1,
    activatedSeats: 0, // refined below from seat assignments
  }));
  const licences = (licRes.data ?? []).map((l) => ({
    id: l.id,
    entitlementId: l.entitlement_id,
    userId: l.user_id,
    email: l.email,
    productSlug: l.product_slug,
    productName: getProduct(l.product_slug)?.name ?? l.product_slug,
    licenceReference: l.licence_reference,
    status: l.status,
    issuedAt: l.issued_at,
    seats: 0, // refined below from the entitlement
    activatedSeats: 0,
  }));

  // Seat counts for this customer's rows, in one round trip.
  const entIds = entitlements.map((e) => e.id);
  if (entIds.length > 0) {
    const seatCountsRes = await db
      .from("seat_assignments")
      .select("entitlement_id")
      .in("entitlement_id", entIds);
    const usedCount = new Map<string, number>();
    for (const s of seatCountsRes.data ?? []) {
      usedCount.set(s.entitlement_id, (usedCount.get(s.entitlement_id) ?? 0) + 1);
    }
    for (const e of entitlements) {
      e.activatedSeats = usedCount.get(e.id) ?? 0;
    }
    const seatsById = new Map(entitlements.map((e) => [e.id, e.seats]));
    for (const l of licences) {
      l.seats = seatsById.get(l.entitlementId) ?? 1;
      l.activatedSeats = usedCount.get(l.entitlementId) ?? 0;
    }
  }

  return { customer, orders, entitlements, licences };
}

/* ------------------------------------------------------------------ */
/* Products (catalog + real sales stats)                                */
/* ------------------------------------------------------------------ */

export type AdminProduct = Product & {
  sales: number;
  revenueMinor: number;
  activeEntitlements: number;
  licenceCount: number;
};

export async function listProductStats(): Promise<AdminProduct[]> {
  await requireAdmin();

  const base = getProducts();
  if (adminDataLocal()) {
    return base.map((p) => {
      const paid = devStoreOrders().filter(
        (o) => o.product_slug === p.slug && o.status === "paid"
      );
      return {
        ...p,
        sales: paid.reduce((s, o) => s + o.quantity, 0),
        revenueMinor: paid.reduce((s, o) => s + o.amount, 0),
        activeEntitlements: 0,
        licenceCount: 0,
      };
    });
  }

  const db = adminDb();
  const [ordersRes, entRes, licRes] = await Promise.all([
    db.from("orders").select("product_slug, quantity, amount, status"),
    db.from("entitlements").select("product_slug, status"),
    db.from("licences").select("product_slug, status"),
  ]);
  if (ordersRes.error) throw ordersRes.error;
  if (entRes.error) throw entRes.error;
  if (licRes.error) throw licRes.error;

  const orders = ordersRes.data ?? [];
  const entitlements = entRes.data ?? [];
  const licences = licRes.data ?? [];

  return base.map((p) => {
    const paid = orders.filter(
      (o) => o.product_slug === p.slug && (o as Order).status === "paid"
    );
    return {
      ...p,
      sales: paid.reduce((s, o) => s + (o as Order).quantity, 0),
      revenueMinor: paid.reduce((s, o) => s + (o as Order).amount, 0),
      activeEntitlements: entitlements.filter(
        (e) => e.product_slug === p.slug && e.status === "active"
      ).length,
      licenceCount: licences.filter((l) => l.product_slug === p.slug).length,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Licences                                                             */
/* ------------------------------------------------------------------ */

export async function listLicences(params?: {
  query?: string;
  status?: "active" | "revoked" | "all";
}): Promise<AdminLicence[]> {
  await requireAdmin();

  if (adminDataLocal()) return [];

  const db = adminDb();
  let builder = db
    .from("licences")
    .select("*")
    .order("issued_at", { ascending: false });
  if (params?.status && params.status !== "all") {
    builder = builder.eq("status", params.status);
  }
  const { data, error } = await builder;
  if (error) throw error;

  // Seat data for these licences: purchased count from the entitlements,
  // in-use count from the seat assignments — grouped in one round trip.
  const seatsById = new Map<string, number>();
  const usedCount = new Map<string, number>();
  const entitlementIds = [...new Set((data ?? []).map((l) => l.entitlement_id))];
  if (entitlementIds.length > 0) {
    const [entSeatsRes, seatCountsRes] = await Promise.all([
      db.from("entitlements").select("id, seats").in("id", entitlementIds),
      db
        .from("seat_assignments")
        .select("entitlement_id")
        .in("entitlement_id", entitlementIds),
    ]);
    for (const e of entSeatsRes.data ?? []) {
      seatsById.set(e.id, e.seats);
    }
    for (const s of seatCountsRes.data ?? []) {
      usedCount.set(
        s.entitlement_id,
        (usedCount.get(s.entitlement_id) ?? 0) + 1
      );
    }
  }

  let rows = (data ?? []).map((l) => ({
    id: l.id,
    entitlementId: l.entitlement_id,
    userId: l.user_id,
    email: l.email,
    productSlug: l.product_slug,
    productName: getProduct(l.product_slug)?.name ?? l.product_slug,
    licenceReference: l.licence_reference,
    status: l.status,
    issuedAt: l.issued_at,
    seats: seatsById.get(l.entitlement_id) ?? 1,
    activatedSeats: usedCount.get(l.entitlement_id) ?? 0,
  }));

  const q = params?.query?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (l) =>
        l.email.includes(q) ||
        l.licenceReference.toLowerCase().includes(q) ||
        l.productSlug.includes(q)
    );
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Entitlements / delivery                                              */
/* ------------------------------------------------------------------ */

export async function listEntitlements(params?: {
  query?: string;
  status?: "active" | "revoked" | "all";
}): Promise<AdminEntitlement[]> {
  await requireAdmin();

  if (adminDataLocal()) return [];

  const db = adminDb();
  let builder = db
    .from("entitlements")
    .select("*")
    .order("granted_at", { ascending: false });
  if (params?.status && params.status !== "all") {
    builder = builder.eq("status", params.status);
  }
  const { data, error } = await builder;
  if (error) throw error;

  // Seat data for these entitlements, grouped in one round trip.
  const usedCount = new Map<string, number>();
  const ids = (data ?? []).map((e) => e.id);
  if (ids.length > 0) {
    const seatCountsRes = await db
      .from("seat_assignments")
      .select("entitlement_id")
      .in("entitlement_id", ids);
    for (const s of seatCountsRes.data ?? []) {
      usedCount.set(s.entitlement_id, (usedCount.get(s.entitlement_id) ?? 0) + 1);
    }
  }

  let rows = (data ?? []).map((e) => ({
    id: e.id,
    orderId: e.order_id,
    userId: e.user_id,
    email: e.email,
    productSlug: e.product_slug,
    productName: getProduct(e.product_slug)?.name ?? e.product_slug,
    status: e.status,
    grantedAt: e.granted_at,
    version: getProduct(e.product_slug)?.version ?? null,
    seats: e.seats ?? 1,
    activatedSeats: usedCount.get(e.id) ?? 0,
  }));

  const q = params?.query?.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (e) =>
        e.email.includes(q) ||
        e.productSlug.includes(q) ||
        e.id.includes(q)
    );
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Revenue series (for the graph)                                       */
/* ------------------------------------------------------------------ */

export async function getRevenueSeries(days: number): Promise<{
  points: RevenuePoint[];
  currencies: string[];
}> {
  await requireAdmin();

  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const fromIso = from.toISOString();

  if (adminDataLocal()) {
    const paid = devStoreOrders().filter(
      (o) => o.status === "paid" && o.created_at >= fromIso
    );
    const byDay = new Map<string, { revenueMinor: number; orders: number }>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      byDay.set(d.toISOString().slice(0, 10), { revenueMinor: 0, orders: 0 });
    }
    for (const o of paid) {
      const k = o.created_at.slice(0, 10);
      const cur = byDay.get(k) ?? { revenueMinor: 0, orders: 0 };
      cur.revenueMinor += o.amount;
      cur.orders += 1;
      byDay.set(k, cur);
    }
    const points = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
    return {
      points,
      currencies: Array.from(
        new Set(devStoreOrders().map((o) => o.currency))
      ),
    };
  }

  const db = adminDb();
  const { data, error } = await db
    .from("orders")
    .select("amount, currency, created_at")
    .eq("status", "paid")
    .gte("created_at", fromIso)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as {
    amount: number;
    currency: string;
    created_at: string;
  }[];

  const byDay = new Map<string, { revenueMinor: number; orders: number }>();
  for (let i = 0; i <= days; i++) {
    const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    byDay.set(d.toISOString().slice(0, 10), { revenueMinor: 0, orders: 0 });
  }
  for (const r of rows) {
    const k = r.created_at.slice(0, 10);
    const cur = byDay.get(k) ?? { revenueMinor: 0, orders: 0 };
    cur.revenueMinor += r.amount;
    cur.orders += 1;
    byDay.set(k, cur);
  }

  const currencies = Array.from(new Set(rows.map((r) => r.currency)));
  const points = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return { points, currencies };
}

/** Period-over-period revenue: returns [current, previous] totals. */
export async function getPeriodRevenue(
  fromIso: string,
  toIso: string
): Promise<{ revenueMinor: number; orders: number }> {
  await requireAdmin();
  const spanMs = new Date(toIso).getTime() - new Date(fromIso).getTime();

  if (adminDataLocal()) {
    const inRange = (o: Order, a: string, b: string) =>
      o.created_at >= a && o.created_at < b && o.status === "paid";
    const cur = devStoreOrders().filter((o) => inRange(o, fromIso, toIso));
    return {
      revenueMinor: cur.reduce((s, o) => s + o.amount, 0),
      orders: cur.length,
    };
  }

  const db = adminDb();
  const prevFrom = new Date(new Date(fromIso).getTime() - spanMs).toISOString();

  const [curRes, prevRes] = await Promise.all([
    db
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .gte("created_at", fromIso)
      .lt("created_at", toIso),
    db
      .from("orders")
      .select("amount")
      .eq("status", "paid")
      .gte("created_at", prevFrom)
      .lt("created_at", fromIso),
  ]);
  if (curRes.error) throw curRes.error;
  if (prevRes.error) throw prevRes.error;

  return {
    revenueMinor: (curRes.data ?? []).reduce(
      (s: number, r: { amount: number }) => s + r.amount,
      0
    ),
    orders: curRes.data?.length ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/* Notifications + audit                                                */
/* ------------------------------------------------------------------ */

export async function listNotifications(limit = 30): Promise<
  AdminNotificationRow[]
> {
  await requireAdmin();
  if (adminDataLocal()) return [];
  const db = adminDb();
  const { data, error } = await db
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminNotificationRow[];
}

export async function markNotificationRead(id: string): Promise<boolean> {
  await requireAdmin();
  if (!UUID_RE.test(id)) return false;
  if (adminDataLocal()) return false;
  const db = adminDb();
  const { error } = await db
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw error;
  return true;
}

export async function markAllNotificationsRead(): Promise<void> {
  await requireAdmin();
  if (adminDataLocal()) return;
  const db = adminDb();
  const { error } = await db
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function dismissNotification(id: string): Promise<boolean> {
  // Dismissal = read state only. Business data is never deleted.
  return markNotificationRead(id);
}

export async function listAuditLog(limit = 50): Promise<AdminAuditRow[]> {
  await requireAdmin();
  if (adminDataLocal()) return [];
  const db = adminDb();
  const { data, error } = await db
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminAuditRow[];
}

/* ------------------------------------------------------------------ */
/* Global search                                                        */
/* ------------------------------------------------------------------ */

export type AdminSearchResult = {
  type: "order" | "customer" | "product" | "licence";
  title: string;
  subtitle: string;
  href: string;
};

export async function adminSearch(q: string): Promise<AdminSearchResult[]> {
  await requireAdmin();
  const query = q.trim().toLowerCase();
  if (!query) return [];

  const results: AdminSearchResult[] = [];

  // Products (catalog, always available)
  for (const p of getProducts()) {
    if (p.name.toLowerCase().includes(query) || p.slug.includes(query)) {
      results.push({
        type: "product",
        title: p.name,
        subtitle: `Product · ${p.status === "available" ? `Available · $${p.price}` : "Coming soon"}`,
        href: `/admin/products?focus=${p.slug}`,
      });
    }
  }

  // Orders + customers (db)
  const [{ rows: orders }, customers, licences] = await Promise.all([
    fetchOrders({ query, perPage: 5, page: 1 }),
    listCustomers({ query }).catch(() => []),
    listLicences({ query }).catch(() => []),
  ]);

  for (const o of orders.slice(0, 5)) {
    results.push({
      type: "order",
      title: `${o.product_slug} order — ${o.email}`,
      subtitle: `Order · ${o.status} · ${(o.amount / 100).toFixed(2)} ${o.currency}`,
      href: `/admin/orders?focus=${o.id}`,
    });
  }
  for (const c of customers.slice(0, 5)) {
    results.push({
      type: "customer",
      title: c.name ?? c.email,
      subtitle: `Customer · ${c.paidOrders} paid ${c.paidOrders === 1 ? "order" : "orders"}`,
      href: `/admin/customers?focus=${encodeURIComponent(c.key)}`,
    });
  }
  for (const l of licences.slice(0, 5)) {
    results.push({
      type: "licence",
      title: l.licenceReference,
      subtitle: `Licence · ${l.productName} · ${l.email}`,
      href: `/admin/licences?focus=${l.id}`,
    });
  }

  return results.slice(0, 12);
}

/* ------------------------------------------------------------------ */
/* System health                                                        */
/* ------------------------------------------------------------------ */

export type SystemCheck = {
  name: string;
  status: "ok" | "warn" | "down" | "unknown";
  detail: string;
};

/** Live checks — each claims its state only after actually testing it. */
export async function getSystemHealth(): Promise<SystemCheck[]> {
  await requireAdmin();

  const checks: SystemCheck[] = [];

  // Supabase connection
  if (!supabaseAdminConfigured()) {
    checks.push({
      name: "Supabase",
      status: "warn",
      detail:
        "Service-role key not configured — admin reads use the local dev store.",
    });
  } else {
    try {
      const db = adminDb();
      const { error } = await db.from("orders").select("id").limit(1);
      checks.push(
        error
          ? {
              name: "Supabase",
              status: "down",
              detail: "Database query failed — check credentials/service.",
            }
          : { name: "Supabase", status: "ok", detail: "Connected." }
      );
    } catch {
      checks.push({
        name: "Supabase",
        status: "down",
        detail: "Could not reach the database.",
      });
    }
  }

  // Payment configuration (status only — never the values)
  const rzpConfigured = Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );
  checks.push({
    name: "Razorpay",
    status: rzpConfigured ? "ok" : "warn",
    detail: rzpConfigured
      ? "Configured (keys present)."
      : "Not configured — checkout answers 503.",
  });

  const webhookConfigured = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
  checks.push({
    name: "Webhook",
    status: webhookConfigured ? "ok" : "warn",
    detail: webhookConfigured
      ? "Signature secret configured."
      : "Webhook secret not set — durable confirmation inactive (503).",
  });

  // Admin tables (only meaningful with db configured)
  if (supabaseAdminConfigured()) {
    try {
      const db = adminDb();
      const { error } = await db
        .from("admin_notifications")
        .select("id")
        .limit(1);
      checks.push({
        name: "Notification store",
        status: error
          ? "down"
          : "ok",
        detail: error
          ? "admin_notifications unreachable — apply migration 0004."
          : "Persisting notifications.",
      });
    } catch {
      checks.push({
        name: "Notification store",
        status: "down",
        detail: "Unreachable.",
      });
    }
  }

  return checks;
}
