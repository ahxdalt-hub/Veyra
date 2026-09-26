#!/usr/bin/env node
/**
 * Demo traffic generator — a "live store" for testing Veyra end to end.
 *
 * Every DEMO_INTERVAL_MS (default 7s) it simulates one customer checking
 * out through the REAL pipeline: POST /api/checkout → fake Razorpay
 * gateway capture/fail → signed webhook → fulfillment (entitlement,
 * licence, seats, receipt ledger, admin notifications).
 *
 * Each simulated customer gets a random name/email, a random seat count
 * 1–5 (which drives the server-side team pricing tiers), and a ~40%
 * chance of proposing one of the live coupon codes (launch20, tenback).
 * Outcomes are mixed so every order state appears in the admin views:
 *   ~80% paid   ~10% failed   ~10% cancelled (left as pending first)
 *
 * Requirements (same as the Stage 8 E2E):
 *   1. node scripts/fake-razorpay.mjs            # gateway on :7272
 *   2. dev server started with the fake-gateway env block from .env.local:
 *      RAZORPAY_KEY_ID=rzp_test_fake
 *      RAZORPAY_KEY_SECRET=test_key_secret_zzz
 *      RAZORPAY_WEBHOOK_SECRET=test_webhook_secret_zzz
 *      RAZORPAY_API_BASE=http://127.0.0.1:7272/v1
 *   3. node scripts/demo-orders.mjs
 *
 * Flags:
 *   --interval=MS   delay between orders   (default 7000)
 *   --count=N       stop after N orders    (default: run forever)
 *   --base=URL      Veyra base URL         (default http://localhost:3000)
 *
 * Demo rows are tagged with @veyra.test emails — easy to spot (and, if
 * ever needed, to wipe) in the admin command center.
 */

/* ---- configuration ------------------------------------------------- */
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
};
const BASE = arg("base", "http://localhost:3000");
const FAKE_BASE = "http://127.0.0.1:7272/v1";
const INTERVAL = Math.max(500, Number(arg("interval", 7000)));
const COUNT = Number(arg("count", Infinity));
/** Stop when PAID revenue (this run, cents) reaches the target.
 *  --target is in cents: $25,000 → --target=2500000 */
const TARGET_CENTS = Number(arg("target", 0)) || null;
/** --clear wipes all demo-tagged rows (and resets coupon usage) before a run. */
const CLEAR = process.argv.includes("--clear");

/* ---- Supabase management API (for --clear; mirrors delivery.e2e.mjs) -- */
const { readFileSync, existsSync } = await import("node:fs");
const TOKEN = (() => {
  const p = new URL("./.sbp-token", import.meta.url);
  return existsSync(p) ? readFileSync(p, "utf8").trim() : process.env.SBP_TOKEN;
})();
const REF = (() => {
  const envPath = new URL("../.env.local", import.meta.url);
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("NEXT_PUBLIC_SUPABASE_URL="));
    if (line) return new URL(line.split("=").slice(1).join("=")).hostname.split(".")[0];
  }
  return "otqucrqcefdychplbbtq"; // project ref pinned in scripts/sb-query.mjs
})();
async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`sql ${res.status}: ${text.slice(0, 300)}`);
  return text;
}

/** Remove every row the demo created, keyed on its @veyra.test email
 *  prefix, so the command center starts from a clean zero. Rebuilds
 *  coupons.used_count from the surviving paid orders so the counter
 *  never drifts after a wipe. Idempotent. */
async function clearDemoData() {
  const guard = "veyra.test"; // @veyra.test emails only
  console.log("clearing demo data (@veyra.test)…");
  const steps = [
    // Child rows first (orders referenced by everything else).
    `delete from email_events where order_id in (select id from orders where email like '%@${guard}')`,
    `delete from download_events where email like '%@${guard}'`,
    `delete from licence_activations where activated_email like '%@${guard}'`,
    `delete from seat_assignments where entitlement_id in (select id from entitlements where email like '%@${guard}')`,
    `delete from licences where email like '%@${guard}'`,
    `delete from entitlements where email like '%@${guard}'`,
    // related_id is text; cast the uuid side to match.
    `delete from admin_notifications where (related_id in (select id::text from orders where email like '%@${guard}')) or message ilike '%@${guard}'`,
    `delete from orders where email like '%@${guard}'`,
    // Rebuild coupon usage from whatever PAID orders remain (usually none).
    `update coupons c set used_count = (select count(*)::int from orders o where o.status='paid' and o.coupon_code = c.code)`,
  ];
  for (const s of steps) await sql(s);
  const rem = await sql(`select count(*)::int as n from orders where email like '%@${guard}'`);
  console.log(`demo data cleared (${rem} demo orders remain)\n`);
}
const WEBHOOK_SECRET = process.env.FAKE_WEBHOOK_SECRET || "test_webhook_secret_zzz";
const GATEWAY_AUTH = "Basic ZmFrZTpmYWtl"; // fake gateway's /_test hooks are unauthed anyway

/* ---- demo population ------------------------------------------------ */
const NAMES = [
  ["Aarav Mehta", "aarav.mehta"],
  ["Priya Sharma", "priya.sharma"],
  ["Daniel Okafor", "daniel.okafor"],
  ["Sofia Ramirez", "sofia.ramirez"],
  ["Liam O'Connor", "liam.oconnor"],
  ["Hana Sato", "hana.sato"],
  ["Jonas Weber", "jonas.weber"],
  ["Amara Diallo", "amara.diallo"],
  ["Ethan Brooks", "ethan.brooks"],
  ["Meera Iyer", "meera.iyer"],
  ["Lucas Moreau", "lucas.moreau"],
  ["Zara Ahmed", "zara.ahmed"],
  ["Noah Lindqvist", "noah.lindqvist"],
  ["Isabella Rossi", "isabella.rossi"],
  ["Karan Malhotra", "karan.malhotra"],
  ["Grace Kim", "grace.kim"],
];
const COUPONS = ["launch20", "tenback"];
const EMAIL_DOMAIN = "veyra.test";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/** Seats 1–5, middle-weighted like real small-team purchases. */
const pickQty = () => [1, 1, 2, 2, 3, 3, 3, 4, 5][Math.floor(Math.random() * 9)];

/* ---- http helpers ---------------------------------------------------- */
async function veyra(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...opts });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON is fine */ }
  return { status: res.status, json };
}

async function gateway(path, body) {
  const res = await fetch(`${FAKE_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: GATEWAY_AUTH },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text().catch(() => "");
  try { return { status: res.status, json: JSON.parse(text) }; }
  catch { return { status: res.status, json: null }; }
}

/** Sign a webhook payload exactly like Razorpay does: HMAC-SHA256 hex. */
const { createHmac } = await import("node:crypto");
const hmacHex = (data) => createHmac("sha256", WEBHOOK_SECRET).update(data).digest("hex");

async function deliverWebhook(event, payment) {
  const payload = JSON.stringify({ event, payload: { payment: { entity: payment } } });
  return veyra("/api/webhooks/razorpay", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": hmacHex(payload) },
    body: payload,
  });
}

/* ---- one simulated customer journey ---------------------------------- */
const pad = (s, n) => String(s).padEnd(n);

async function simulateOneCustomer(seq) {
  const [name, handle] = pick(NAMES);
  // Repeat customers exist, but most orders are first-time buyers.
  const email = Math.random() < 0.25
    ? `demo.${handle}@${EMAIL_DOMAIN}`
    : `demo.${handle}.${seq}@${EMAIL_DOMAIN}`;
  const qty = pickQty();
  const useCoupon = Math.random() < 0.4;
  const coupon = useCoupon ? pick(COUPONS) : undefined;
  const roll = Math.random();
  const outcome = roll < 0.8 ? "paid" : roll < 0.9 ? "failed" : "cancelled";

  const started = Date.now();
  const res = await veyra("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, items: [{ slug: "client-growth-system", qty }], ...(coupon ? { coupon } : {}) }),
  });

  if (res.status !== 200 || !res.json?.orderId) {
    console.log(`✗  #${seq} checkout FAILED (${res.status}): ${res.json?.error ?? "unknown"}`);
    return { ok: false };
  }
  const o = res.json;
  const money = `$${(o.amount / 100).toFixed(2)}`;
  const couponPart = o.coupon
    ? ` coupon ${o.coupon.code.toUpperCase()} −$${(o.coupon.discountMinor / 100).toFixed(2)}`
    : " no-coupon";
  const line = `${pad(name, 16)} ${pad(email, 34)} ${o.productName} ×${o.seats} seat${o.seats > 1 ? "s" : " "}  ` +
    `tier −${o.discountPercent}%${couponPart}  → ${money}`;

  if (outcome === "paid") {
    const cap = await gateway(`/_test/${o.razorpayOrderId}/capture`);
    if (cap.status !== 200 || !cap.json?.id) {
      console.log(`✗  #${seq} capture failed: ${cap.status}`);
      return { ok: false };
    }
    const wh = await deliverWebhook("payment.captured", cap.json);
    const paid = wh.status === 200;
    console.log(`${paid ? "✓" : "✗"}  #${seq} PAID      ${line}   (${Date.now() - started}ms${paid ? "" : `, webhook ${wh.status}`})`);
    return { ok: paid, paid, email, amount: o.amount, coupon: o.coupon?.code, seats: o.seats };
  }

  if (outcome === "failed") {
    const fail = await gateway(`/_test/${o.razorpayOrderId}/fail`);
    if (fail.status === 200 && fail.json?.id) await deliverWebhook("payment.failed", fail.json);
    console.log(`·  #${seq} FAILED    ${line}   (payment declined)`);
    return { ok: true, email, amount: o.amount, seats: o.seats, failed: true };
  }

  // cancelled: the customer closed the modal — order stays for the admin
  // views as a cancelled/abandoned checkout.
  await veyra("/api/checkout/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: o.orderId }),
  });
  console.log(`·  #${seq} CANCELLED ${line}   (abandoned at payment)`);
  return { ok: true, email, amount: o.amount, seats: o.seats, cancelled: true };
}

/* ---- main loop -------------------------------------------------------- */
const stats = { paid: 0, failed: 0, cancelled: 0, errors: 0, revenue: 0 };

function printStats() {
  const target = TARGET_CENTS ? ` · target ${fmtCents(TARGET_CENTS)}` : "";
  console.log(
    `\n── demo totals: ${stats.paid} paid · ${stats.failed} failed · ${stats.cancelled} cancelled · ${stats.errors} errors · revenue ${fmtCents(stats.revenue)}${target}\n`
  );
}

function fmtCents(c) {
  return `$${(c / 100).toFixed(2)}`;
}

/* ---- optional clear-from-zero ------------------------------------- */
if (CLEAR) {
  await clearDemoData();
}

/* ---- main loop -------------------------------------------------------- */
console.log(
  `veyra demo traffic → ${BASE} | one customer every ${INTERVAL / 1000}s` +
    (COUNT !== Infinity ? ` | stopping after ${COUNT} orders` : "") +
    (TARGET_CENTS ? ` | auto-stop at ${fmtCents(TARGET_CENTS)} paid revenue` : "") +
    (CLEAR ? " | CLEARED demo data first" : "") +
    (COUNT === Infinity && !TARGET_CENTS ? " | Ctrl+C to stop" : "") +
    "\n"
);

let seq = 0;
let stopping = false;
process.on("SIGINT", () => { stopping = true; printStats(); process.exit(0); });

async function tick() {
  if (stopping) return;
  seq += 1;
  try {
    const r = await simulateOneCustomer(seq);
    if (r.ok === false) stats.errors += 1;
    else if (r.paid) { stats.paid += 1; stats.revenue += r.amount; }
    else if (r.failed) stats.failed += 1;
    else if (r.cancelled) stats.cancelled += 1;
  } catch (err) {
    stats.errors += 1;
    console.log(`✗  #${seq} crashed: ${err.message}`);
  }
  // Auto-stop conditions.
  const hitTarget = TARGET_CENTS && stats.revenue >= TARGET_CENTS;
  if (hitTarget) {
    console.log(`\n✓ target revenue ${fmtCents(TARGET_CENTS)} reached at order #${seq} — stopping.`);
    printStats();
    process.exit(0);
  }
  if (seq >= COUNT) { printStats(); process.exit(0); }
}

await tick(); // first customer walks in immediately
setInterval(tick, INTERVAL); // the interval keeps the process alive
