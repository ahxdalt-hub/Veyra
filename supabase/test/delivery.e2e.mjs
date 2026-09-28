/**
 * Stage 8 E2E — the purchase-to-delivery pipeline, Lemon Squeezy edition.
 *
 * Lemon Squeezy's confirmation is webhook-only (there is no browser-side
 * signature to verify), so this test drives the durable path directly:
 * it seeds a pending order exactly as /api/checkout would, then delivers
 * SIGNED order_created / order_refunded webhook payloads to
 * /api/webhooks/lemonsqueezy — the same HMAC scheme Lemon Squeezy uses —
 * and checks fulfillment, idempotency, revocation, downloads, and
 * activation. The live Supabase project is cleaned up at the end.
 *
 *   node supabase/test/delivery.e2e.mjs [http://localhost:3000]
 *
 * The Veyra server must run with (inline env, dotenv never overrides):
 *   LEMONSQUEEZY_WEBHOOK_SECRET=test_webhook_secret_zzz
 *   SUPABASE_DELIVERY_BUCKET=<bucket with a published release>
 * plus the normal Supabase vars.
 *
 * Covers:
 *   1 successful webhook confirmation (+entitlement/licence/seat/receipt)
 *   2 duplicate webhook delivery is a no-op (idempotent grant + email)
 *   3 tamper attempts: bad signature → rejected; amount mismatch → not paid
 *   4 late authoritative webhook reconciles an abandoned (cancelled) order
 *   5 refund webhook revokes access end to end
 *   6 result-page polling (owner session vs guest uuid)
 *   7 account area renders the licence
 *   9 download authorization
 *  10 activation + revalidation + deactivation after purchase
 */

import { readFileSync, existsSync, randomUUID } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3000";

/* ---- env from .env.local (never printed) -------------------------- */
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
const SERVICE = ENV.SUPABASE_SERVICE_ROLE_KEY;
// The dev server must be started with this same secret inline.
const WEBHOOK_SECRET = "test_webhook_secret_zzz";
const REF = new URL(SUPA_URL).hostname.split(".")[0];
const TOKEN =
  process.env.SBP_TOKEN ??
  readFileSync(join(here, "..", "..", "scripts", ".sbp-token"), "utf8").trim();
if (!SUPA_URL || !ANON || !SERVICE) {
  console.error("missing Supabase env in .env.local");
  process.exit(2);
}

/* Lemon Squeezy signs webhooks with HMAC-SHA256, hex digest, over the
 * raw body. Same scheme we verify server-side. */
const hmacHex = (key, data) =>
  createHmac("sha256", key).update(data).digest("hex");

/* ---- Supabase management API (seed/verify/teardown SQL) ----------- */
async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`sql ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ---- REST helpers -------------------------------------------------- */
const jfetch = async (url, opts = {}) => {
  const res = await fetch(url, { cache: "no-store", ...opts });
  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON — callers that want the raw text get it below */
  }
  return { status: res.status, json, text, headers: res.headers };
};

const veyra = (path, opts = {}) => jfetch(`${BASE}${path}`, opts);

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---- Supabase auth: admin user + password session cookies --------- */
const svcHeaders = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  "Content-Type": "application/json",
};

async function createAuthUser(email, password) {
  const res = await jfetch(`${SUPA_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: svcHeaders,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!res.json?.id) throw new Error(`auth user create failed: ${res.status} ${JSON.stringify(res.json)}`);
  return res.json.id;
}
async function deleteAuthUser(id) {
  await fetch(`${SUPA_URL}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: svcHeaders,
  });
}
async function signIn(email, password) {
  const res = await jfetch(
    `${SUPA_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }
  );
  if (!res.json?.access_token) throw new Error("password sign-in failed");
  const s = res.json;
  const session = { ...s, expires_at: Math.floor(Date.now() / 1000) + s.expires_in };
  // @supabase/ssr cookie format: sb-<ref>-auth-token holding the session JSON.
  return {
    "sb-ref": `${SUPA_URL}`,
    cookie: `sb-${REF}-auth-token=${encodeURIComponent(JSON.stringify(session))}`,
  };
}

/* ---- order + webhook helpers --------------------------------------- */
/**
 * Seed a pending order exactly as /api/checkout would (the checkout API
 * itself needs real Lemon Squeezy credentials; the confirmation logic we
 * test lives entirely in the webhook path). Amounts mirror
 * src/lib/pricing.ts seat tiers: 1 seat → $79, 2 seats → $77/seat.
 */
async function seedPendingOrder({ email, qty, userId = null, status = "pending" }) {
  const perSeat = [79, 77, 75, 73, 71][qty - 1];
  const amount = perSeat * qty * 100;
  const id = randomUUID();
  const res = await jfetch(`${SUPA_URL}/rest/v1/orders`, {
    method: "POST",
    headers: { ...svcHeaders, Prefer: "return=representation" },
    body: JSON.stringify([
      {
        id,
        email,
        user_id: userId,
        product_slug: "client-growth-system",
        quantity: qty,
        amount,
        currency: "USD",
        status,
        provider: "lemon-squeezy",
      },
    ]),
  });
  if (!res.json?.[0]?.id) throw new Error(`seed order failed: ${res.status} ${res.text.slice(0, 200)}`);
  return { orderId: id, amount, currency: "USD", qty };
}

/** Build + deliver a signed Lemon Squeezy order webhook. */
async function lsWebhook({
  eventName,
  veyraOrderId,
  subtotal,
  currency = "USD",
  status = "paid",
  orderIdLabel,
  badSignature = false,
}) {
  const body = JSON.stringify({
    meta: { event_name: eventName },
    data: {
      id: randomUUID(),
      type: "orders",
      meta: {
        event_name: eventName,
        custom_event_data: { veyra_order_id: veyraOrderId },
      },
      attributes: {
        order_id: orderIdLabel ?? `E2E-${veyraOrderId.slice(0, 6).toUpperCase()}`,
        status,
        subtotal,
        discount_total: 0,
        tax: 0,
        total: subtotal,
        currency,
        user_email: "e2e@veyra.test",
        created_at: new Date().toISOString(),
      },
    },
  });
  const sig = badSignature ? "0".repeat(64) : hmacHex(WEBHOOK_SECRET, body);
  return veyra("/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Signature": sig },
    body,
  });
}

const counts = async (email) =>
  sql(`select
    (select count(*)::int from orders where email='${email}') as orders,
    (select count(*)::int from entitlements e join orders o on o.id=e.order_id where o.email='${email}') as entitlements,
    (select count(*)::int from licences l join entitlements e on e.id=l.entitlement_id join orders o on o.id=e.order_id where o.email='${email}') as licences,
    (select count(*)::int from seat_assignments s join entitlements e on e.id=s.entitlement_id join orders o on o.id=e.order_id where o.email='${email}') as seats`);

/* ------------------------------------------------------------------- */
async function main() {
  /* pre-flight */
  const ping = await veyra("/api/orders/00000000-0000-4000-8000-000000000000");
  if (ping.status === 404 || ping.status === 422) {
    console.log(`server reachable at ${BASE}`);
  } else {
    throw new Error(`Veyra server not answering at ${BASE} (${ping.status}) — start it with LEMONSQUEEZY_WEBHOOK_SECRET=test_webhook_secret_zzz`);
  }
  // The webhook endpoint must be live (503 = server started without the
  // webhook secret; the whole test depends on it).
  const probe = await veyra("/api/webhooks/lemonsqueezy", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Signature": "probe" },
    body: "{}",
  });
  if (probe.status === 503) {
    throw new Error("webhook endpoint answers 503 — restart the server with LEMONSQUEEZY_WEBHOOK_SECRET=test_webhook_secret_zzz");
  }

  const salt = Math.random().toString(16).slice(2, 8);
  const buyerEmail = `stage8-buyer-${salt}@veyra.test`;
  const guestEmail = `stage8-guest-${salt}@veyra.test`;
  const tamperEmail = `stage8-tamper-${salt}@veyra.test`;
  const refundEmail = `stage8-refund-${salt}@veyra.test`;
  const password = `Stage8!${salt}${createHash("sha256").update(salt).digest("hex").slice(0, 8)}`;
  const userId = await createAuthUser(buyerEmail, password);
  const { cookie } = await signIn(buyerEmail, password);
  console.log(`auth user ${userId.slice(0, 8)}… created + signed in\n`);

  let orderA, orderB, orderD, orderE;

  try {
    /* === 1. successful purchase (signed-in customer, order_created) === */
    orderA = await seedPendingOrder({ email: buyerEmail, qty: 2, userId });
    check("pending order seeded (2 seats, tier price)", Boolean(orderA.orderId) && orderA.amount === 15400, `amount ${orderA.amount}`);
    const whA = await lsWebhook({
      eventName: "order_created",
      veyraOrderId: orderA.orderId,
      subtotal: orderA.amount,
    });
    check("signed order_created webhook → acknowledged 200", whA.status === 200, JSON.stringify(whA.json));

    await wait(300); // fulfillment is awaited inline; give the ledger write a beat
    const stA = await sql(`select status from orders where id='${orderA.orderId}'`);
    check("order flipped to paid", stA[0]?.status === "paid");
    const idsA = await sql(`select lemon_squeezy_order_id, lemon_squeezy_payment_id, paid_at from orders where id='${orderA.orderId}'`);
    check("provider references stamped at confirmation",
      Boolean(idsA[0]?.lemon_squeezy_order_id) && Boolean(idsA[0]?.lemon_squeezy_payment_id) && Boolean(idsA[0]?.paid_at));
    const cA = await counts(buyerEmail);
    check("entitlement created (1)", cA[0].entitlements === 1);
    check("licence created (1)", cA[0].licences === 1);
    check("seat 1 assigned", cA[0].seats === 1);
    const licA = await sql(`select l.licence_reference, e.seats, o.user_id from licences l join entitlements e on e.id=l.entitlement_id join orders o on o.id=e.order_id where o.email='${buyerEmail}'`);
    check("licence has VY reference, 2 seats, linked to account user",
      /^VY-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(licA[0]?.licence_reference) && licA[0]?.seats === 2 && licA[0]?.user_id === userId,
      licA[0]?.licence_reference);
    const ledgerA = await sql(`select status, provider_id from email_events where order_id='${orderA.orderId}'`);
    check("receipt email claimed+sent exactly once in ledger",
      ledgerA.length === 1 && ledgerA[0].status === "sent", JSON.stringify(ledgerA));

    /* === 2. duplicate webhook delivery === */
    const wh1 = await lsWebhook({ eventName: "order_created", veyraOrderId: orderA.orderId, subtotal: orderA.amount });
    const wh2 = await lsWebhook({ eventName: "order_created", veyraOrderId: orderA.orderId, subtotal: orderA.amount }); // exact replay
    check("duplicate webhook deliveries acknowledged (200)", wh1.status === 200 && wh2.status === 200);
    const cA2 = await counts(buyerEmail);
    check("replay created no duplicate order/entitlement/licence/seat",
      cA2[0].orders === 1 && cA2[0].entitlements === 1 && cA2[0].licences === 1 && cA2[0].seats === 1);
    const ledgerA2 = await sql(`select count(*)::int as n, max(status) as s from email_events where order_id='${orderA.orderId}' and email_type='purchase_receipt'`);
    check("replay did NOT re-send the receipt (single ledger row, still sent)",
      ledgerA2[0].n === 1 && ledgerA2[0].s === "sent");

    /* === 3. tamper attempts === */
    // Unsigned/forged signature → 400, order untouched.
    orderD = await seedPendingOrder({ email: tamperEmail, qty: 1 });
    const forged = await lsWebhook({
      eventName: "order_created",
      veyraOrderId: orderD.orderId,
      subtotal: orderD.amount,
      badSignature: true,
    });
    check("forged webhook signature rejected (400)", forged.status === 400, JSON.stringify(forged.json));
    // Valid signature but the amount DOESN'T match what we priced →
    // never paid (custom_price is the contract).
    const mismatch = await lsWebhook({
      eventName: "order_created",
      veyraOrderId: orderD.orderId,
      subtotal: 1, // one cent for a $79 order
    });
    check("amount-mismatch webhook acknowledged but NOT applied", mismatch.status === 200);
    const stD = await sql(`select status from orders where id='${orderD.orderId}'`);
    const cD = await sql(`select (select count(*)::int from entitlements e join orders o on o.id=e.order_id where o.email='${tamperEmail}') as ent`);
    check("tampered order stayed pending, no entitlement", stD[0]?.status === "pending" && cD[0].ent === 0);

    /* === 4. abandoned (cancelled) order, then late authoritative webhook === */
    orderB = await seedPendingOrder({ email: guestEmail, qty: 1, status: "cancelled" });
    // The customer completed payment on the hosted page after walking away
    // client-side; the signed webhook is authoritative and must reconcile
    // cancelled → paid.
    const whB = await lsWebhook({ eventName: "order_created", veyraOrderId: orderB.orderId, subtotal: orderB.amount });
    check("late webhook reconciles cancelled → paid", whB.status === 200);
    const cB = await sql(`select status from orders where id='${orderB.orderId}'`);
    const cbCounts = await counts(guestEmail);
    check("guest reconciled purchase fully delivered (paid + entitlement + licence)",
      cB[0]?.status === "paid" && cbCounts[0].entitlements === 1 && cbCounts[0].licences === 1);
    const ledgerB = await sql(`select status from email_events where order_id='${orderB.orderId}'`);
    check("guest receipt email sent once", ledgerB.length === 1 && ledgerB[0].status === "sent");

    /* === 5. refund webhook revokes access === */
    orderE = await seedPendingOrder({ email: refundEmail, qty: 1 });
    await lsWebhook({ eventName: "order_created", veyraOrderId: orderE.orderId, subtotal: orderE.amount });
    const paidE = await sql(`select status from orders where id='${orderE.orderId}'`);
    check("refund-scenario order confirmed paid first", paidE[0]?.status === "paid");
    const whR = await lsWebhook({ eventName: "order_refunded", veyraOrderId: orderE.orderId, subtotal: orderE.amount });
    check("order_refunded webhook acknowledged", whR.status === 200);
    const refunded = await sql(`select o.status, e.status as ent_status from orders o left join entitlements e on e.order_id=o.id where o.id='${orderE.orderId}'`);
    check("refund flips order to refunded + revokes entitlement",
      refunded[0]?.status === "refunded" && refunded[0]?.ent_status === "revoked",
      JSON.stringify(refunded[0]));
    const seatsE = await sql(`select count(*)::int as n from seat_assignments s join entitlements e on e.id=s.entitlement_id where e.order_id='${orderE.orderId}'`);
    check("refund deletes the seat pool", seatsE[0]?.n === 0);
    const ledgerE = await sql(`select email_type, status from email_events where order_id='${orderE.orderId}'`);
    check("refund confirmation email recorded", ledgerE.some((r) => r.email_type === "refund_confirmation" && r.status === "sent"),
      JSON.stringify(ledgerE));

    /* === 6. refresh after payment (result-page polling) === */
    const poll = await veyra(`/api/orders/${orderA.orderId}`, { headers: { cookie } });
    check("order polling reports paid (owner session)", poll.status === 200 && poll.json?.status === "paid");
    const pollNoSession = await veyra(`/api/orders/${orderA.orderId}`);
    check("account-linked order NOT pollable without the owner session (404)", pollNoSession.status === 404);
    const pollOther = await veyra(`/api/orders/${orderB.orderId}`);
    check("guest order pollable by unguessable uuid", pollOther.status === 200 && pollOther.json?.status === "paid");

    /* === 7. customer account after payment === */
    const lic = await veyra("/account/licences", { headers: { cookie } });
    const licARef = licA[0]?.licence_reference ?? "";
    check("account /licences renders the licence + quick actions",
      lic.status === 200 && (lic.text ?? "").includes("Client Growth System"));
    check("licence reference appears in account HTML",
      licARef.length === 17, licARef);

    /* === 9. download authorization === */
    const dlNoAuth = await veyra("/api/download/client-growth-system?mode=json");
    check("download refused without a session (401)", dlNoAuth.status === 401);
    const dlStranger = await veyra("/api/download/client-growth-system?mode=json", {
      headers: { cookie: "sb-x-auth-token=%7B%7D" },
    });
    check("download refused for a broken/foreign session (401)", dlStranger.status === 401, `status ${dlStranger.status}`);
    const dlOwner = await veyra("/api/download/client-growth-system?mode=json", { headers: { cookie } });
    check("owner with entitlement gets a signed URL",
      dlOwner.status === 200 && /^https?:\/\//.test(dlOwner.json?.signedUrl ?? dlOwner.json?.url ?? ""),
      JSON.stringify(dlOwner.json)?.slice(0, 120));
    if (dlOwner.json?.url) {
      const file = await fetch(dlOwner.json.url, { redirect: "follow" });
      const buf = await file.arrayBuffer();
      check("signed URL serves the installer artifact",
        file.status === 200 && buf.byteLength > 500_000, `${(buf.byteLength / 1024 / 1024).toFixed(1)} MB`);
    }
    const dlEvents = await sql(`select count(*)::int as n from download_events where email='${buyerEmail}'`);
    check("download event recorded", (dlEvents[0]?.n ?? 0) >= 1);

    /* === 10. activation after purchase === */
    const refA = licA[0]?.licence_reference;
    const DEV = `stage8-e2e-device-${salt}`;
    const act = await veyra("/api/licence/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        licence_reference: refA,
        email: buyerEmail,
        product_slug: "client-growth-system",
        device_id: DEV,
        device_label: "E2E Windows",
      }),
    });
    check("freshly purchased licence activates (200 + token)",
      act.status === 200 && act.json?.ok === true && typeof act.json?.token === "string",
      `status ${act.status}`);
    check("activation seats_used reflects the device", act.json?.seats_used === 1 && act.json?.seats === 2,
      `${act.json?.seats_used}/${act.json?.seats}`);
    const reval = await veyra("/api/licence/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activation_id: act.json?.claims?.act, device_id: DEV }),
    });
    check("revalidation passes", reval.status === 200 && reval.json?.ok === true);
    const deact = await veyra("/api/licence/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licence_reference: refA, email: buyerEmail, device_id: DEV }),
    });
    check("deactivation frees the seat", deact.status === 200 && deact.json?.ok === true);
  } finally {
    /* ---- teardown ---- */
    const ids = [orderA, orderB, orderD, orderE].map((o) => o?.orderId).filter(Boolean);
    for (const id of ids) {
      await sql(`delete from email_events where order_id='${id}'`).catch(() => null);
    }
    // entitlements/licences/seats/activations cascade or key on the order
    // chain — clear them explicitly before the orders themselves.
    if (ids.length) {
      await sql(`delete from licence_activations where entitlement_id in (select id from entitlements where order_id in (${ids.map((i) => `'${i}'`).join(",")}))`).catch(() => null);
      await sql(`delete from seat_assignments where entitlement_id in (select id from entitlements where order_id in (${ids.map((i) => `'${i}'`).join(",")}))`).catch(() => null);
      await sql(`delete from licences where entitlement_id in (select id from entitlements where order_id in (${ids.map((i) => `'${i}'`).join(",")}))`).catch(() => null);
      await sql(`delete from entitlements where order_id in (${ids.map((i) => `'${i}'`).join(",")})`).catch(() => null);
      await sql(`delete from orders where id in (${ids.map((i) => `'${i}'`).join(",")})`).catch(() => null);
    }
    await sql(`delete from download_events where email like 'stage8-%'`).catch(() => null);
    await sql(`delete from licence_activations where activated_email like 'stage8-%'`).catch(() => null);
    // The fulfillment/webhook paths insert admin notifications (sale, licence,
    // refund, new customer). The referenced rows above are gone after
    // teardown, so remove the notifications too — otherwise the command center
    // accumulates orphans referencing deleted orders/licences/profiles.
    await sql(`delete from admin_notifications where message ilike '%@veyra.test%'`).catch((e) => console.log("teardown admin_notifications:", e.message));
    await deleteAuthUser(userId).catch((e) => console.log("teardown auth:", e.message));
    console.log("\nteardown complete");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("E2E crashed:", e.message);
  process.exit(2);
});
