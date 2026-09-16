#!/usr/bin/env node
/**
 * Razorpay TEST MODE preflight — Veyra.
 *
 * Proves, against the REAL Razorpay TEST API and a running Veyra server,
 * that the checkout is wired to test mode and nothing else:
 *
 *   A. Configuration audit (static)
 *      - RAZORPAY_MODE is "test" (a live deployment is refused here)
 *      - the key id is a rzp_test_… key, the key secret + webhook secret
 *        are present, and RAZORPAY_API_BASE is NOT set (real test mode)
 *      - no Razorpay secret is exposed through any NEXT_PUBLIC_ variable,
 *        and no secret string appears in the browser bundles in .next/static
 *   B. Credentials (network)
 *      - Razorpay accepts the test keys (GET /orders)
 *   C. Order relationship (network + app)
 *      - POST /api/checkout returns the PUBLIC key id only, test mode, and
 *        the server-computed amount for 1 seat of client-growth-system
 *      - the Razorpay order carries OUR receipt/notes, the same amount and
 *        currency → Veyra order ↔ Razorpay order ↔ customer ↔ product ↔ amount
 *      - the response body contains no secret
 *      - the order is then cancelled (pending → cancelled) and never paid
 *   D. Webhook hardening (app)
 *      - unsigned delivery → 400
 *      - wrong signature   → 400
 *      - valid signature, unknown order → 200 no-op
 *      - valid signature, non-captured status under payment.captured → 200,
 *        order NOT moved to paid
 *      (a genuine captured payment is deliberately NOT synthesized — real
 *       capture is covered by the in-browser test matrix in the README)
 *
 * Usage:
 *   node scripts/check-razorpay-test-mode.mjs [--origin http://localhost:3000]
 *                                            [--config-only]
 *
 * Reads credentials from .env.local (or inline env, which wins) and NEVER
 * prints a secret.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createHmac } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const ORIGIN = flag("origin", "http://localhost:3000").replace(/\/$/, "");
const CONFIG_ONLY = argv.includes("--config-only");
/** Local test infrastructure (scripts/fake-razorpay.mjs). Only for running
 *  this checker without Razorpay credentials; a real test-mode run must NOT
 *  pass it. */
const ALLOW_LOCAL = argv.includes("--allow-local-gateway");

/* ---- env: .env.local, with inline process env winning ------------- */
const FILE_ENV = {};
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) FILE_ENV[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const env = (key) => (process.env[key] ?? FILE_ENV[key] ?? "").trim();

const MODE = (env("RAZORPAY_MODE") || "test").toLowerCase();
const KEY_ID = env("RAZORPAY_KEY_ID");
const KEY_SECRET = env("RAZORPAY_KEY_SECRET");
const WEBHOOK_SECRET = env("RAZORPAY_WEBHOOK_SECRET");
const API_BASE = env("RAZORPAY_API_BASE");
const RAZORPAY_API = "https://api.razorpay.com/v1";
/** Where THIS script asks Razorpay for order state. */
const API = ALLOW_LOCAL && API_BASE ? API_BASE.replace(/\/$/, "") : RAZORPAY_API;

/* ---- tiny harness -------------------------------------------------- */
const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}
function skip(name, why) {
  results.push({ name, pass: true, skipped: true });
  console.log(`SKIP  ${name} — ${why}`);
}
const jfetch = async (url, opts = {}) => {
  const res = await fetch(url, { cache: "no-store", ...opts });
  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON responses are returned as text */
  }
  return { status: res.status, json, text, headers: res.headers };
};
const authHeader = () =>
  "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
const webhookSig = (raw) =>
  createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");

/* ---- secret-redaction helpers (used in every message we print) ----- */
const mask = (value) =>
  value ? `${value.slice(0, 10)}…(${value.length} chars)` : "missing";
const secrets = () => [KEY_SECRET, WEBHOOK_SECRET].filter(Boolean);
function leaksSecrets(text) {
  return secrets().some((s) => s && text.includes(s));
}
/* =================================================================== */
/* A. Configuration audit                                              */
/* =================================================================== */
console.log("\nA. Configuration audit");
check("RAZORPAY_MODE is test", MODE === "test", `RAZORPAY_MODE=${MODE}`);
check(
  "key id is a Razorpay TEST key",
  KEY_ID.startsWith("rzp_test_"),
  `RAZORPAY_KEY_ID=${mask(KEY_ID)}${
    KEY_ID.startsWith("rzp_live_") ? " ← LIVE KEY REFUSED" : ""
  }`
);
check("key secret present (server-side only)", Boolean(KEY_SECRET));
check("webhook secret present (server-side only)", Boolean(WEBHOOK_SECRET));
if (ALLOW_LOCAL) {
  skip(
    "no local-gateway override (real Razorpay TEST MODE)",
    "explicitly allowed by --allow-local-gateway (test infrastructure run)"
  );
} else {
  check(
    "no local-gateway override (real Razorpay TEST MODE)",
    !API_BASE,
    API_BASE ? `RAZORPAY_API_BASE=${API_BASE}` : "RAZORPAY_API_BASE unset"
  );
}
const publicSecretVars = Object.entries({ ...FILE_ENV, ...process.env }).filter(
  ([k, v]) =>
    k.startsWith("NEXT_PUBLIC_") && v && secrets().includes(String(v).trim())
);
check(
  "no RAZORPAY secret behind a NEXT_PUBLIC_ variable",
  publicSecretVars.length === 0,
  publicSecretVars.map(([k]) => k).join(", ")
);

/* Browser-bundle scan: the shipped client bundles must not contain a
   secret. Bounded (static assets only, ≤ 400 files, ≤ 8 MB each). */
function scanDir(dir, maxFiles = 400, maxSize = 8 * 1024 * 1024) {
  const hits = [];
  if (!existsSync(dir)) return { hits, scanned: 0 };
  let scanned = 0;
  const walk = (d) => {
    if (hits.length || scanned > maxFiles) return;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (hits.length || scanned > maxFiles) return;
      const p = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(p);
      } else {
        if (statSync(p).size > maxSize) continue;
        scanned += 1;
        if (leaksSecrets(readFileSync(p, "utf8"))) {
          hits.push(p.replace(root, ""));
        }
      }
    }
  };
  walk(dir);
  return { hits, scanned };
}
if (secrets().length) {
  const { hits, scanned } = scanDir(join(root, ".next", "static"));
  check(
    "no secret in browser bundles (.next/static)",
    hits.length === 0,
    `${scanned} files scanned${hits.length ? ` · ${hits.join(", ")}` : ""}`
  );
} else {
  skip("no secret in browser bundles (.next/static)", "no secrets configured yet");
}

/* A configuration-only run stops here — everything below needs the app
   and/or Razorpay's API. */
if (CONFIG_ONLY) {
  report("configuration-only run");
  process.exit(results.some((r) => !r.pass) ? 1 : 0);
}

/* =================================================================== */
/* B. Credentials — Razorpay TEST API                                 */
/* =================================================================== */
console.log("\nB. Razorpay TEST credentials (network)");
const keysUsable = KEY_ID.startsWith("rzp_test_") && Boolean(KEY_SECRET);
if (keysUsable) {
  const r = await jfetch(`${API}/orders?count=1`, {
    headers: { Authorization: authHeader() },
  });
  check(
    "Razorpay accepts the TEST keys (GET /orders)",
    r.status === 200,
    `HTTP ${r.status}${
      r.status === 401 ? " — key id / key secret do not match" : ""
    }`
  );
} else {
  skip(
    "Razorpay accepts the TEST keys (GET /orders)",
    "set RAZORPAY_KEY_ID=rzp_test_… and RAZORPAY_KEY_SECRET in .env.local first"
  );
}

/* =================================================================== */
/* C. Order relationship — server-priced, test-mode, no secret leaks   */
/* =================================================================== */
console.log("\nC. Order relationship (app + Razorpay)");
let appUp = false;
try {
  const ping = await jfetch(
    `${ORIGIN}/api/orders/00000000-0000-4000-8000-000000000000`
  );
  appUp = ping.status < 500;
} catch {
  appUp = false;
}
check("Veyra server reachable", appUp, ORIGIN);

/** Order created by this run (guest, cancelled at the end of section C). */
let createdOrderId = null;
let createdRazorpayOrderId = null;

if (appUp) {
  const email = `razorpay-testmode-${Date.now().toString(36)}@veyra.test`;
  const co = await jfetch(`${ORIGIN}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      items: [{ slug: "client-growth-system", qty: 1 }],
    }),
  });
  const order = co.json ?? {};
  const priced = order.amount === 7900 && order.currency === "USD";

  if (co.status === 503) {
    check(
      "POST /api/checkout creates a Razorpay TEST order",
      false,
      `HTTP 503 (${order.code}) ${order.reason ?? ""}`
    );
  } else {
    check(
      "POST /api/checkout creates a Razorpay TEST order",
      co.status === 200 && typeof order.razorpayOrderId === "string",
      `HTTP ${co.status} razorpay_order_id=${order.razorpayOrderId ?? "—"}`
    );
    check(
      "canonical product client-growth-system priced from src/lib/pricing.ts",
      order.productName === "Client Growth System" && priced,
      `${order.productName} · ${order.amount} ${order.currency} (1 seat = $79 → 7900)`
    );
    check(
      "only the PUBLIC key id reaches the browser",
      order.keyId === KEY_ID && Boolean(order.keyId?.startsWith("rzp_test_")),
      `keyId=${mask(order.keyId)}`
    );
    check(
      "response reports the expected mode/gateway",
      order.mode === "test" &&
        order.gateway === (ALLOW_LOCAL ? "local-test-gateway" : "razorpay"),
      `mode=${order.mode} gateway=${order.gateway}`
    );
    check(
      "no secret in the checkout response body",
      !leaksSecrets(co.text),
      `${co.text.length} bytes scanned`
    );

    // The HTML the browser actually receives for /checkout must carry no
    // credential either — the page is a server component that reads only
    // the resolved mode.
    const pageHtml = await jfetch(`${ORIGIN}/checkout`);
    check(
      "no secret in the served /checkout HTML",
      pageHtml.status === 200 && !leaksSecrets(pageHtml.text),
      `HTTP ${pageHtml.status} · ${pageHtml.text.length} bytes scanned`
    );

    if (order.razorpayOrderId) {
      const rzp = await jfetch(`${API}/orders/${order.razorpayOrderId}`, {
        headers: { Authorization: authHeader() },
      });
      const entity = rzp.json ?? {};
      check(
        "Veyra order ↔ Razorpay order ↔ customer ↔ product ↔ amount",
        rzp.status === 200 &&
          entity.amount === order.amount &&
          entity.currency === order.currency &&
          entity.receipt === order.orderId &&
          entity.notes?.internal_order_id === order.orderId,
        `receipt=${entity.receipt} notes.product_slug=${entity.notes?.product_slug} amount=${entity.amount}`
      );
    }

    const cancelled = await jfetch(`${ORIGIN}/api/checkout/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.orderId }),
    });
    const after = await jfetch(`${ORIGIN}/api/orders/${order.orderId}`);
    check(
      "unpaid attempt leaves NO paid order (pending → cancelled)",
      cancelled.status === 200 &&
        cancelled.json?.status === "cancelled" &&
        after.json?.status === "cancelled",
      `${cancelled.json?.status} → read back ${after.json?.status}`
    );
    createdOrderId = order.orderId ?? null;
    createdRazorpayOrderId = order.razorpayOrderId ?? null;
  }
} else {
  skip("checkout order assertions", "start the dev server first (npm run dev)");
}

/* =================================================================== */
/* D. Webhook hardening — signature, event, status, idempotency        */
/* =================================================================== */
console.log("\nD. Webhook hardening");
if (!appUp) {
  skip("webhook hardening", "start the dev server first (npm run dev)");
} else if (!WEBHOOK_SECRET) {
  skip("webhook hardening", "set RAZORPAY_WEBHOOK_SECRET first");
} else {
  const deliver = (raw, signature) =>
    jfetch(`${ORIGIN}/api/webhooks/razorpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature ? { "x-razorpay-signature": signature } : {}),
      },
      body: raw,
    });

  const captureEvent = (orderId, status, amount = 7900) =>
    JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_unknown_${Date.now().toString(36)}`,
            order_id: orderId,
            status,
            amount,
            currency: "USD",
          },
        },
      },
    });

  const unsigned = await deliver('{"event":"payment.captured"}', "");
  check("unsigned delivery is rejected (400)", unsigned.status === 400, `HTTP ${unsigned.status}`);

  const badSig = await deliver('{"event":"payment.captured"}', "deadbeef");
  check("forged signature is rejected (400)", badSig.status === 400, `HTTP ${badSig.status}`);

  const unknownOrder = captureEvent("order_not_ours_0000000000", "captured");
  const unknownRes = await deliver(unknownOrder, webhookSig(unknownOrder));
  check(
    "valid signature for an unknown order is a safe no-op (200, nothing trusted)",
    unknownRes.status === 200 && unknownRes.json?.received === true,
    `HTTP ${unknownRes.status} ${JSON.stringify(unknownRes.json)}`
  );

  const unstoredEvent = JSON.stringify({ event: "order.paid", payload: {} });
  const unstoredRes = await deliver(unstoredEvent, webhookSig(unstoredEvent));
  check(
    "unhandled event is acknowledged without action (200)",
    unstoredRes.status === 200 && unstoredRes.json?.received === true,
    `HTTP ${unstoredRes.status}`
  );

  if (createdRazorpayOrderId && createdOrderId) {
    // payment.captured carrying a NON-captured payment status must never
    // move an order to paid.
    const inconsistent = captureEvent(createdRazorpayOrderId, "created");
    const inconsistentRes = await deliver(inconsistent, webhookSig(inconsistent));
    const afterStatus = await jfetch(`${ORIGIN}/api/orders/${createdOrderId}`);
    check(
      "payment.captured with status \"created\" does NOT pay the order",
      inconsistentRes.status === 200 && afterStatus.json?.status === "cancelled",
      `HTTP ${inconsistentRes.status} · order stays ${afterStatus.json?.status}`
    );

    // Amount mismatch on a genuine-looking capture must not pay the order.
    const wrongAmount = captureEvent(createdRazorpayOrderId, "captured", 100);
    const wrongAmountRes = await deliver(wrongAmount, webhookSig(wrongAmount));
    const afterAmount = await jfetch(`${ORIGIN}/api/orders/${createdOrderId}`);
    check(
      "amount mismatch does NOT pay the order",
      wrongAmountRes.status === 200 && afterAmount.json?.status === "cancelled",
      `expected 7900, sent 100 · order stays ${afterAmount.json?.status}`
    );

    // Duplicate delivery of one event: both accepted, still not paid.
    const dup = captureEvent(createdRazorpayOrderId, "created");
    const first = await deliver(dup, webhookSig(dup));
    const second = await deliver(dup, webhookSig(dup));
    const afterDup = await jfetch(`${ORIGIN}/api/orders/${createdOrderId}`);
    check(
      "duplicate delivery is idempotent (200 both times, single effect)",
      first.status === 200 && second.status === 200 && afterDup.json?.status === "cancelled",
      `HTTP ${first.status}/${second.status} · order ${afterDup.json?.status}`
    );
  } else {
    skip(
      "payment.captured / amount-mismatch / duplicate assertions",
      "no order from section C (server or credentials unavailable)"
    );
  }
  console.log(
    "  NOTE  a genuine captured payment is never synthesized by this script — the\n" +
      "        in-browser test matrix (README → Razorpay TEST MODE) covers real capture."
  );
}

/* =================================================================== */
/* Report                                                             */
/* =================================================================== */
function report(label) {
  const failed = results.filter((r) => !r.pass);
  const passed = results.filter((r) => r.pass && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  console.log(
    `\n${label}: ${passed} passed, ${failed.length} failed, ${skipped} skipped`
  );
  if (failed.length) {
    console.log("Failures:");
    for (const f of failed) console.log(`  - ${f.name}`);
  }
  return failed.length === 0;
}
const ok = report("Razorpay test-mode check");
if (createdOrderId) {
  console.log(`test order: ${createdOrderId} (cancelled — no paid order left behind)`);
}
process.exit(ok ? 0 : 1);



