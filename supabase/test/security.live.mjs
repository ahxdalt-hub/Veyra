/**
 * Security boundary tests — REAL project, REAL RLS, real roles.
 *
 * The PGlite suites connect as superuser, which BYPASSES row-level
 * security — they prove the SECURITY DEFINER functions' logic, never the
 * customer isolation. This file proves isolation against the LIVE
 * Supabase project by signing in as real users through anon-key
 * password auth and querying PostgREST exactly as the app does.
 *
 *   node supabase/test/security.live.mjs [base-url]
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * SUPABASE_SERVICE_ROLE_KEY (service-role REST seeds and tears down; no
 * management token involved). base-url defaults to https://veyra.caelmont.in; pass
 * http://localhost:3000 when testing a dev server.
 *
 * Sections:
 *   A. Unauthenticated user  — can read nothing, download nothing
 *   B. Customer A vs B       — orders/entitlements/licences/devices invisible
 *   C. Seat holder           — own seat row only; own devices only; cannot
 *                              release the owner's device; cannot manage
 *                              other seats; cannot claim redelivery for
 *                              another's entitlement
 *   D. Licensing RPC surface — licence_* RPCs are not client-callable
 *   E. Checkout tampering    — client-supplied amounts/products ignored
 *   F. Webhook forgery       — bad signature creates/changes nothing
 *   G. Admin boundary        — admin API refuses non-admins
 *
 * Everything it creates is torn down (rows + auth users). The seeded
 * orders for sections E/F are pending rows deleted at the end; no email
 * is sent for any of them.
 */

import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createHmac } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "https://veyra.caelmont.in";

/* ---- env ----------------------------------------------------------- */
const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", "..", ".env.local");
const ENV = {};
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) ENV[m[1]] = m[2].trim();
  }
}
const SUPA_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const ANON = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY ? ENV.SUPABASE_SERVICE_ROLE_KEY : null;
const REF = new URL(SUPA_URL).hostname.split(".")[0];
if (!SUPA_URL || !ANON || !SERVICE) {
  console.error("missing Supabase env in .env.local");
  process.exit(2);
}

/* ---- helpers -------------------------------------------------------- */
const jfetch = async (url, opts = {}) => {
  const res = await fetch(url, { cache: "no-store", ...opts });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = JSON.parse(text); } catch { /* html or empty */ }
  return { status: res.status, json, text };
};

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail && !pass ? ` — ${detail}` : ""}`);
}

const rest = (path) => `${SUPA_URL}/rest/v1/${path}`;

async function restSelect(path, headers) {
  const r = await jfetch(rest(path), { headers });
  return { status: r.status, rows: Array.isArray(r.json) ? r.json : null, raw: r.json };
}
async function restWrite(method, path, body, headers) {
  const r = await jfetch(rest(path), {
    method,
    headers: { "Content-Type": "application/json", ...headers, Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, rows: Array.isArray(r.json) ? r.json : null, raw: r.json };
}

const userHeaders = (token) => ({ apikey: ANON, Authorization: `Bearer ${token}` });
const anonHeaders = { apikey: ANON };

const svcHeaders = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
async function createAuthUser(email, password) {
  const res = await jfetch(`${SUPA_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: svcHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.json?.id) throw new Error(`auth user create failed: ${res.status}`);
  return res.json.id;
}
async function deleteAuthUser(id) {
  await jfetch(`${SUPA_URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: svcHeaders });
}
async function signIn(email, password) {
  const res = await jfetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.json?.access_token) throw new Error(`sign-in failed for ${email}`);
  return res.json.access_token;
}

/* ---- seed ----------------------------------------------------------- */
const STAMP = Date.now().toString(36);
const PASSWORD = `VeyraSecTest!${STAMP}`;
const EMAIL_A = `sec-a-${STAMP}@veyra-security-test.invalid`;
const EMAIL_B = `sec-b-${STAMP}@veyra-security-test.invalid`;
const EMAIL_SEAT = `sec-seat-${STAMP}@veyra-security-test.invalid`;

const made = { users: [], orders: [], entitlements: [], licences: [], seats: [], activations: [] };
const uuid = () => randomUUID();
const refFromUuid = (u) =>
  `VY-${u.replace(/-/g, "").slice(0, 4).toUpperCase()}-${u.replace(/-/g, "").slice(4, 8).toUpperCase()}-${u.replace(/-/g, "").slice(8, 12).toUpperCase()}`;

async function seedCustomer(email, userId, seats) {
  const orderId = uuid();
  await restWrite("POST", "orders", {
    id: orderId, email, user_id: userId, product_slug: "client-growth-system",
    quantity: seats, amount: 7900, currency: "USD", status: "paid",
  }, svcHeaders);
  const entId = uuid();
  await restWrite("POST", "entitlements", {
    id: entId, order_id: orderId, user_id: userId, email,
    product_slug: "client-growth-system", seats,
  }, svcHeaders);
  const licRef = refFromUuid(orderId);
  await restWrite("POST", "licences", {
    entitlement_id: entId, user_id: userId, email,
    product_slug: "client-growth-system", licence_reference: licRef, status: "active",
  }, svcHeaders);
  const licId = (await restSelect(`licences?select=id&licence_reference=eq.${licRef}`, svcHeaders)).rows[0].id;
  await restWrite("POST", "seat_assignments", {
    entitlement_id: entId, seat_number: 1, email, user_id: userId, status: "active",
  }, svcHeaders);
  made.orders.push(orderId); made.entitlements.push(entId); made.licences.push(licId);
  return { orderId, entId, licId, licRef };
}

try {
  const userA = await createAuthUser(EMAIL_A, PASSWORD);
  const userB = await createAuthUser(EMAIL_B, PASSWORD);
  const userSeat = await createAuthUser(EMAIL_SEAT, PASSWORD);
  made.users.push(userA, userB, userSeat);

  const A = await seedCustomer(EMAIL_A, userA, 2);
  const B = await seedCustomer(EMAIL_B, userB, 1);
  // Seat holder on A's licence, seat 2.
  await restWrite("POST", "seat_assignments", {
    entitlement_id: A.entId, seat_number: 2, email: EMAIL_SEAT, user_id: userSeat, status: "active",
  }, svcHeaders);

  await signIn(EMAIL_A, PASSWORD); // proves the seeded users can sign in
  const tokenB = await signIn(EMAIL_B, PASSWORD);
  const tokenSeat = await signIn(EMAIL_SEAT, PASSWORD);

  /* ================= A. Unauthenticated ================= */
  for (const table of ["orders", "entitlements", "licences", "seat_assignments", "licence_activations", "redelivery_requests", "email_events"]) {
    const r = await restSelect(`${table}?select=*`, anonHeaders);
    check(`anon (no session) reads ZERO rows from ${table}`,
      r.status === 200 && r.rows !== null && r.rows.length === 0,
      `status ${r.status}, rows ${r.rows?.length}`);
  }
  {
    const r = await jfetch(`${BASE}/api/download/client-growth-system?mode=json`, {});
    check("anon download refused (401)", r.status === 401, `status ${r.status}`);
  }

  /* ================= B. Customer A vs B ================= */
  {
    const mine = await restSelect(`orders?select=id&email=eq.${EMAIL_B}`, userHeaders(tokenB));
    check("B sees their own order", mine.rows?.length === 1);
    const cross = await restSelect(`orders?select=id&email=eq.${EMAIL_A}`, userHeaders(tokenB));
    check("B sees ZERO of A's orders", cross.rows?.length === 0, JSON.stringify(cross.rows));
    const crossEnt = await restSelect(`entitlements?select=id&id=eq.${A.entId}`, userHeaders(tokenB));
    check("B sees ZERO of A's entitlements", crossEnt.rows?.length === 0, JSON.stringify(crossEnt.rows));
    const crossLic = await restSelect(`licences?select=id&id=eq.${A.licId}`, userHeaders(tokenB));
    check("B sees ZERO of A's licences", crossLic.rows?.length === 0, JSON.stringify(crossLic.rows));
    // A forged uuid guess still leaks nothing.
    const crossAct = await restSelect(`licence_activations?select=id&entitlement_id=eq.${A.entId}`, userHeaders(tokenB));
    check("B sees ZERO of A's device activations", crossAct.rows?.length === 0, JSON.stringify(crossAct.rows));

    // Write attempts across the boundary — RLS makes them no-ops.
    const upd = await restWrite("PATCH", `orders?id=eq.${A.orderId}&email=eq.${EMAIL_A}`, { status: "refunded" }, userHeaders(tokenB));
    check("B cannot modify A's order (0 rows affected)", upd.status === 401 || upd.status === 403 || (Array.isArray(upd.rows) && upd.rows.length === 0), JSON.stringify(upd.raw));
    const del = await restWrite("DELETE", `seat_assignments?entitlement_id=eq.${A.entId}`, null, userHeaders(tokenB));
    check("B cannot delete A's seats (403 or 0 rows)", del.status === 401 || del.status === 403 || (Array.isArray(del.rows) && del.rows.length === 0), JSON.stringify(del.raw));
  }

  /* ================= C. Seat holder boundaries ================= */
  {
    const ownSeat = await restSelect(`seat_assignments?select=id&user_id=eq.${userSeat}`, userHeaders(tokenSeat));
    check("seat holder sees their own seat row", ownSeat.rows?.length === 1);
    // Own devices only (0024 policy): seed the seat user's activation.
    const act = await jfetch(rest("rpc/licence_activate"), {
      method: "POST", headers: svcHeaders,
      body: JSON.stringify({
        p_licence_reference: A.licRef, p_email: EMAIL_SEAT,
        p_product_slug: "client-growth-system",
        p_device_id: "SecTestSeatDevice000000001", p_device_label: "SecTest",
      }),
    }).then((r) => r.json);
    check("seat holder activates via service-role RPC (context)", act?.ok === true, JSON.stringify(act));
    if (act?.ok) made.activations.push(act.activation_id);

    const devices = await restSelect(
      `licence_activations?select=id,activated_email&entitlement_id=eq.${A.entId}`,
      userHeaders(tokenSeat)
    );
    check("seat holder sees only THEIR OWN devices",
      devices.rows?.length === 1 && devices.rows[0].activated_email === EMAIL_SEAT,
      JSON.stringify(devices.rows));

    const ownerDevices = await restSelect(
      `licence_activations?select=id&entitlement_id=eq.${A.entId}&activated_email=eq.${EMAIL_A}`,
      userHeaders(tokenSeat)
    );
    check("seat holder sees ZERO of the owner's devices (0024)", ownerDevices.rows?.length === 0, JSON.stringify(ownerDevices.rows));

    // Client-side RPC execution is revoked: calling licence_deactivate as
    // an authenticated user must be denied outright.
    const rpc = await jfetch(rest("rpc/licence_deactivate"), {
      method: "POST", headers: { ...userHeaders(tokenSeat), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_licence_reference: A.licRef, p_email: EMAIL_A,
        p_device_id: "SecTestOwnerDevice00000001",
      }),
    });
    check("licence_deactivate RPC is NOT client-callable (permission denied)",
      rpc.status === 401 || rpc.status === 403 || rpc.status === 404, `status ${rpc.status}`);

    // Redelivery for someone else's entitlement is refused by RLS.
    const redel = await restWrite("POST", "redelivery_requests", {
      user_id: userSeat, entitlement_id: B.entId,
      product_slug: "client-growth-system", product_version: "1.0",
    }, userHeaders(tokenSeat));
    check("seat holder cannot file redelivery for ANOTHER customer's entitlement",
      redel.status === 401 || redel.status === 403 || (Array.isArray(redel.rows) && redel.rows.length === 0),
      JSON.stringify(redel.raw));

    // Seat holder cannot edit another seat row (owner-only update policy).
    const seatEdit = await restWrite("PATCH", `seat_assignments?entitlement_id=eq.${A.entId}&seat_number=eq.1`,
      { email: "hijacked@attacker.invalid" }, userHeaders(tokenSeat));
    check("seat holder cannot reassign the OWNER's seat (0 rows / 403)",
      seatEdit.status === 401 || seatEdit.status === 403 || (Array.isArray(seatEdit.rows) && seatEdit.rows.length === 0),
      JSON.stringify(seatEdit.raw));
  }

  /* ================= D. Ownership logic over the REAL db ================ */
  {
    // Owner email may release the seat's device; the seat's email may NOT
    // release the owner's device — the 0024 function, exercised live.
    await jfetch(rest("rpc/licence_activate"), {
      method: "POST", headers: svcHeaders,
      body: JSON.stringify({
        p_licence_reference: A.licRef, p_email: EMAIL_A,
        p_product_slug: "client-growth-system",
        p_device_id: "SecTestOwnerDevice00000001", p_device_label: "SecTest",
      }),
    });
    const seatTriesOwnerDevice = await jfetch(rest("rpc/licence_deactivate"), {
      method: "POST", headers: svcHeaders,
      body: JSON.stringify({
        p_licence_reference: A.licRef, p_email: EMAIL_SEAT,
        p_device_id: "SecTestOwnerDevice00000001",
      }),
    }).then((r) => r.json);
    check("seat email cannot deactivate the OWNER's device (not_seat — requires migration 0024 applied to this database)",
      seatTriesOwnerDevice?.code === "not_seat", JSON.stringify(seatTriesOwnerDevice));

    const ownerReleasesSeatDevice = await jfetch(rest("rpc/licence_deactivate"), {
      method: "POST", headers: svcHeaders,
      body: JSON.stringify({
        p_licence_reference: A.licRef, p_email: EMAIL_A,
        p_device_id: "SecTestSeatDevice000000001",
      }),
    }).then((r) => r.json);
    check("owner CAN deactivate the seat holder's device", ownerReleasesSeatDevice?.ok === true, JSON.stringify(ownerReleasesSeatDevice));
  }

  /* ============ E/F/G. Live HTTP boundaries (app server) ================ */
  let httpUp = false;
  try {
    const ping = await jfetch(`${BASE}/api/download/client-growth-system`, {});
    httpUp = ping.status > 0;
  } catch { httpUp = false; }

  if (!httpUp) {
    console.log(`SKIP  sections E–G — app server at ${BASE} unreachable`);
  } else {
    // E. Checkout tampering: client fields never decide price/product.
    const tamper = await jfetch(`${BASE}/api/checkout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ slug: "client-growth-system", qty: 1, amount: 1, total: 1, price: 1 }],
        email: `sec-tamper-${STAMP}@veyra-security-test.invalid`,
        amount: 1, total: 1, currency: "USD",
      }),
    });
    made.orders.push(tamper.json?.orderId);
    const serverPrice = tamper.json?.amount;
    check("checkout IGNORES client-supplied amount (server tier price charged)",
      tamper.status === 200 && serverPrice === 7900,
      `status ${tamper.status} amount ${JSON.stringify(serverPrice)}`);

    const bogus = await jfetch(`${BASE}/api/checkout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ slug: "nonexistent-product", qty: 1 }],
        email: `sec-tamper-${STAMP}@veyra-security-test.invalid`,
      }),
    });
    check("checkout refuses a non-catalog product", bogus.status >= 400 && bogus.status < 500, `status ${bogus.status}`);

    const flood = await jfetch(`${BASE}/api/checkout`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ slug: "client-growth-system", qty: 99 }],
        email: `sec-tamper-${STAMP}@veyra-security-test.invalid`,
      }),
    });
    check("checkout refuses quantity beyond MAX_SEATS (422)",
      flood.status === 422, `status ${flood.status} body ${JSON.stringify(flood.json)}`);

    // F. Webhook forgery: a signature made with the WRONG secret is
    // rejected and changes nothing.
    const forgedOrder = uuid();
    const body = JSON.stringify({
      meta: { event_name: "order_created", custom_event_data: { veyra_order_id: forgedOrder } },
      data: { id: `forged-${STAMP}`, attributes: { status: "paid", currency: "USD", subtotal: 7900, discount_total: 0 } },
    });
    const badSig = createHmac("sha256", "attacker-does-not-know-the-secret").update(body).digest("hex");
    const forged = await jfetch(`${BASE}/api/webhooks/lemonsqueezy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-signature": badSig },
      body,
    });
    check("webhook with FORGED signature is rejected (403/400)", forged.status === 403 || forged.status === 400, `status ${forged.status}`);
    const leaked = await restSelect(`orders?select=id&id=eq.${forgedOrder}`, svcHeaders);
    check("forged webhook created NO order/entitlement state", (leaked.rows ?? []).length === 0, JSON.stringify(leaked.rows));

    // G. Admin boundary.
    const adminNoSession = await jfetch(`${BASE}/api/admin/orders`, {});
    check("admin orders API refuses unauthenticated caller", [401, 403].includes(adminNoSession.status), `status ${adminNoSession.status}`);
    const adminB = await jfetch(`${BASE}/api/admin/orders`, { headers: { cookie: `sb-${REF}-auth-token=${encodeURIComponent(JSON.stringify({ access_token: tokenB }))}` } });
    check("admin orders API refuses a non-admin session", [401, 403].includes(adminB.status), `status ${adminB.status}`);
    const adminLogin = await jfetch(`${BASE}/api/admin/session`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin", password: "totally-wrong-password" }),
    });
    check("admin sign-in refuses wrong credentials", adminLogin.status === 401 || adminLogin.status === 403 || adminLogin.status === 429, `status ${adminLogin.status}`);
  }
} finally {
  /* ---- teardown ----------------------------------------------------- */
  try {
    await restWrite("DELETE", `licence_activations?entitlement_id=in.(${made.entitlements.join(",")})`, null, svcHeaders);
    await restWrite("DELETE", `seat_assignments?entitlement_id=in.(${made.entitlements.join(",")})`, null, svcHeaders);
    await restWrite("DELETE", `licences?entitlement_id=in.(${made.entitlements.join(",")})`, null, svcHeaders);
    await restWrite("DELETE", `entitlements?id=in.(${made.entitlements.join(",")})`, null, svcHeaders);
    await restWrite("DELETE", `orders?id=in.(${made.orders.join(",")})`, null, svcHeaders);
    for (const u of made.users) await deleteAuthUser(u);
  } catch (e) {
    console.error("TEARDOWN ERROR — clean up manually:", e.message);
    console.error("test emails:", EMAIL_A, EMAIL_B, EMAIL_SEAT, `sec-tamper-${STAMP}@veyra-security-test.invalid`);
  }
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} security checks passed.`);
if (failed.length) {
  console.log("FAILED:");
  for (const f of failed) console.log(`  ✗ ${f.name}`);
  process.exit(1);
}
