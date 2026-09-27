#!/usr/bin/env node
/**
 * DEMO ONLY — direct-insert traffic generator for the admin panel.
 *
 * The sibling scripts/demo-orders.mjs walks the REAL checkout pipeline
 * but needs the dev server restarted with the fake-gateway env block.
 * This one needs nothing: it inserts straight into Supabase with the
 * service key, and the command center reacts exactly as it would to a
 * real sale, because the reaction is driven by the SAME two things —
 *
 *   orders row        → LiveOrdersTable's 10s poll flashes it in
 *   admin_notifications row → Supabase Realtime → instant toast
 *
 * Every 4s (configurable) one simulated customer:
 *   1. an order lands as `pending` (quiet "Order placed" toast),
 *   2. a couple of seconds later 75% flip to `paid` + a `sale` toast
 *      (the celebration), ~10% flip to `failed` + payment_failed toast,
 *      the rest abandon at checkout.
 *
 * Usage:
 *   node scripts/demo-orders-direct.mjs                # 15 orders / 4s
 *   node scripts/demo-orders-direct.mjs --interval=4000 --count=999
 *   node scripts/demo-orders-direct.mjs --cleanup      # wipe all demo rows
 *
 * Demo rows are tagged (demo+…@veyra.test emails, order_DEMO ids) so
 * --cleanup deletes every trace. No fulfillment is run — licences,
 * emails and download records are deliberately NOT created.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  let txt = "";
  try {
    txt = readFileSync(resolve(root, ".env.local"), "utf8");
  } catch {
    console.error("No .env.local at repo root.");
    process.exit(1);
  }
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

/* — catalog (slugs must exist in src/lib/products.ts; amounts are
   cents, matching the real USD checkout totals). — */
const CATALOG = [
  { slug: "client-growth-system", name: "Client Growth System", amounts: [14900, 19900, 24900, 29900] },
  { slug: "growth-audit", name: "Veyra Growth Audit", amounts: [4900] },
];
const Payers = [
  "aarav.shah", "priya.nair", "jonas.weber", "mara.dutt",
  "sam.ortiz", "lena.kovac", "noah.lindqvist", "zara.ahmed",
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const ts = () => new Date().toLocaleTimeString();
const usd = (c) => `$${(c / 100).toFixed(2)}`; // matches the real writer's money() shape
/** --all-paid: every customer completes payment (no failures/abandons),
 *  and every 6th "customer" is a FREE product claim ($0 sale toast). */
const ALL_PAID = process.argv.includes("--all-paid");

async function notify(row, orderId) {
  const { error } = await supabase
    .from("admin_notifications")
    .insert({ ...row, related_entity: "order", related_id: orderId });
  if (error) console.warn("  (notification failed:", error.message, ")");
}

/** One customer journey: walk in pending, then pay / fail / abandon. */
async function simulateOneCustomer(seq) {
  // Free-product claims (real path: /api/claim → notifyNewSale with
  // amountMinor 0) — notification only, exactly what the admin sees.
  if (ALL_PAID && seq % 6 === 0) {
    const product = pick(CATALOG);
    const email = `demo+${pick(Payers)}.${seq}@veyra.test`;
    console.log(`[${ts()}] ◦ #${seq} FREE     ${product.name}  ${email}`);
    await notify(
      {
        kind: "sale",
        severity: "success",
        title: "New sale",
        message: `${product.name} — ${usd(0)} · ${email}`,
      },
      `claim_DEMO${rnd()}`
    );
    return;
  }

  const product = pick(CATALOG);
  const amount = pick(product.amounts);
  const email = `demo+${pick(Payers)}.${seq}@veyra.test`;
  const now = new Date().toISOString();

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      razorpay_order_id: `order_DEMO${rnd()}`,
      email,
      product_slug: product.slug,
      quantity: 1,
      amount,
      currency: "USD",
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) {
    console.error("orders insert:", error.message);
    return;
  }
  console.log(`[${ts()}] · #${seq} PENDING  ${usd(amount)}  ${product.name}  ${email}`);
  await notify(
    {
      kind: "system",
      severity: "info",
      title: "Order placed",
      message: `${product.name} — ${usd(amount)} · ${email}`,
    },
    order.id
  );

  // The customer "opens the checkout modal" and decides 2.4s later.
  const roll = ALL_PAID ? 0 : Math.random();
  setTimeout(async () => {
    const stamp = new Date().toISOString();
    if (roll < 0.75) {
      const { error: upErr } = await supabase
        .from("orders")
        .update({
          status: "paid",
          razorpay_payment_id: `pay_DEMO${rnd()}`,
          provider: "razorpay",
          paid_at: stamp,
          updated_at: stamp,
        })
        .eq("id", order.id);
      if (upErr) return void console.warn("update failed:", upErr.message);
      console.log(`[${ts()}] ✓ #${seq} PAID     ${usd(amount)}  ${product.name}`);
      await notify(
        {
          kind: "sale",
          severity: "success",
          title: "New sale",
          message: `${product.name} — ${usd(amount)} · ${email}`,
        },
        order.id
      );
    } else if (roll < 0.85) {
      const { error: upErr } = await supabase
        .from("orders")
        .update({ status: "failed", updated_at: stamp })
        .eq("id", order.id);
      if (upErr) return void console.warn("update failed:", upErr.message);
      console.log(`[${ts()}] ✗ #${seq} FAILED   ${usd(amount)}  ${product.name}`);
      await notify(
        {
          kind: "payment_failed",
          severity: "error",
          title: "Payment failed",
          message: `${product.name} — ${usd(amount)} · ${email}`,
        },
        order.id
      );
    }
    // else: abandoned at the payment modal — row stays pending on purpose.
  }, 2400);
}

async function cleanup() {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id")
    .like("razorpay_order_id", "order_DEMO%");
  if (error) throw new Error(error.message);
  const ids = (orders ?? []).map((o) => o.id);
  // Every notification this script writes embeds a demo email, so one
  // sweep clears paid/pending/failed/free-claim toasts alike.
  const { error: e1 } = await supabase
    .from("admin_notifications")
    .delete()
    .ilike("message", "%@veyra.test%");
  if (e1) throw new Error(e1.message);
  if (ids.length === 0) {
    console.log("No demo orders found — notifications swept.");
    return;
  }
  const { error: e2 } = await supabase
    .from("orders")
    .delete()
    .like("razorpay_order_id", "order_DEMO%");
  if (e2) throw new Error(e2.message);
  console.log(`Removed ${ids.length} demo order(s) and their notifications.`);
}

/* — runner — */
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
};

try {
  if (process.argv.includes("--cleanup")) {
    await cleanup();
  } else {
    const count = arg("count", 15);
    const every = Math.max(1000, arg("interval", 4000));
    console.log(
      `veyra DIRECT demo traffic → ${url}\n` +
        `one customer every ${every / 1000}s · ${count} customers · Ctrl+C to stop\n` +
        `when you're done:  node scripts/demo-orders-direct.mjs --cleanup\n`
    );
    let seq = 0;
    let timer = null;
    const tick = async () => {
      seq += 1;
      await simulateOneCustomer(seq).catch((e) => console.error("tick failed:", e.message));
      if (seq >= count) {
        clearInterval(timer);
        // Let the last customer finish deciding (the 2.4s settle) before
        // the process exits, so no order is left hanging in pending.
        clearInterval(timer);
        setTimeout(() => process.exit(0), 3500);
      }
    };
    await tick(); // first customer walks in immediately
    timer = setInterval(tick, every);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
