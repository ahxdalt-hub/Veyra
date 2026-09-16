#!/usr/bin/env node
/**
 * Fake Razorpay gateway — Stage 8 test infrastructure.
 *
 * Speaks just enough of the Razorpay REST API for Veyra's server-side
 * flow to run against it:
 *   POST /orders                      -> create an order
 *   GET  /payments/:id                -> payment entity (status per script)
 *   POST /_test/:order_id/capture     -> mint a captured payment
 *   POST /_test/:order_id/fail        -> mint a failed payment
 *
 * Signing behavior matches Razorpay's documented schemes exactly, using
 * the SAME secrets the server under test holds:
 *   checkout signature = HMAC(keySecret, "order|payment")
 *   webhook signature  = HMAC(webhookSecret, raw body)
 * so verify + webhook code paths are genuinely exercised, not stubbed.
 *
 * Test-only: never deploy this; it exists so `RAZORPAY_API_BASE` can point
 * the Veyra dev server at a local gateway and the purchase→delivery flow
 * runs end to end without live credentials.
 *
 * Usage:  node scripts/fake-razorpay.mjs [--port 7272]
 * Env:    FAKE_KEY_SECRET / FAKE_WEBHOOK_SECRET must match the server
 *         under test's RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET.
 */

import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";

const PORT = Number(process.env.FAKE_PORT || process.argv.find((a) => a.startsWith("--port"))?.split("=")[1] || 7272);
const KEY_SECRET = process.env.FAKE_KEY_SECRET || "test_key_secret_zzz";
const WEBHOOK_SECRET = process.env.FAKE_WEBHOOK_SECRET || "test_webhook_secret_zzz";

/** orders: razorpay order id -> entity. payments: id -> entity. */
const orders = new Map();
const payments = new Map();

const hmac = (key, data) => createHmac("sha256", key).update(data).digest("hex");

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  // The server under test points RAZORPAY_API_BASE at /v1 (mirroring the
  // real API), so strip an optional /v1 prefix before routing.
  let path = url.pathname;
  if (path.startsWith("/v1")) path = path.slice(3) || "/";
  const method = req.method;

  // Basic auth is required only on the real API surface (/orders,
  // /payments) — mirroring Razorpay's key auth so misconfigured clients
  // fail loudly. The /_test hooks are the local test driver's control
  // plane and are not authed.
  const auth = req.headers.authorization || "";
  if (!path.startsWith("/_test") && !auth.startsWith("Basic ")) {
    return send(res, 401, { error: { description: "Unauthorized" } });
  }

  try {
    /* ---- create order ---- */
    if (method === "POST" && path === "/orders") {
      const body = JSON.parse(await readBody(req) || "{}");
      const entity = {
        id: `order_fake_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
        amount: body.amount,
        currency: body.currency,
        status: "created",
        receipt: body.receipt,
        notes: body.notes || {},
        created_at: Math.floor(Date.now() / 1000),
      };
      orders.set(entity.id, entity);
      return send(res, 201, entity);
    }

    /* ---- list orders (used by the test-mode preflight's credential check) ---- */
    if (method === "GET" && path === "/orders") {
      return send(res, 200, {
        entity: "collection",
        count: orders.size,
        items: [...orders.values()],
      });
    }

    /* ---- fetch an order (relationship check for the E2E caller) ---- */
    const orderGet = path.match(/^\/orders\/([^/]+)$/);
    if (method === "GET" && orderGet) {
      const o = orders.get(orderGet[1]);
      if (!o) return send(res, 404, { error: { description: "Not found" } });
      return send(res, 200, o);
    }

    /* ---- fetch payment (authoritative state) ---- */
    const payGet = path.match(/^\/payments\/([^/]+)$/);
    if (method === "GET" && payGet) {
      const p = payments.get(payGet[1]);
      if (!p) return send(res, 404, { error: { description: "Not found" } });
      return send(res, 200, p);
    }

    /* ---- test hooks: capture / fail ---- */
    const hook = path.match(/^\/_test\/([^/]+)\/(capture|fail)$/);
    if (method === "POST" && hook) {
      const [, orderId, action] = hook;
      const order = orders.get(orderId);
      if (!order) return send(res, 404, { error: { description: "No such order" } });
      const payment = {
        id: `pay_fake_${randomUUID().replace(/-/g, "").slice(0, 14)}`,
        order_id: orderId,
        status: action === "capture" ? "captured" : "failed",
        amount: order.amount,
        currency: order.currency,
        method: "card",
        error_description:
          action === "fail" ? "Payment declined by the (fake) card issuer." : undefined,
        created_at: Math.floor(Date.now() / 1000),
      };
      payments.set(payment.id, payment);
      // The checkout handler signature — Razorpay's documented scheme.
      const signature = hmac(KEY_SECRET, `${orderId}|${payment.id}`);
      return send(res, 200, { ...payment, signature });
    }

    /* ---- webhook event builder for the E2E caller ---- */
    const webhook = path.match(/^\/_test\/webhook\/(payment\.captured|payment\.failed)$/);
    if (method === "POST" && webhook) {
      const body = JSON.parse(await readBody(req) || "{}");
      const payment = payments.get(body.payment_id);
      if (!payment) return send(res, 404, { error: { description: "No such payment" } });
      const payload = {
        event: webhook[1],
        payload: { payment: { entity: payment } },
      };
      const raw = JSON.stringify(payload);
      return send(res, 200, { body: raw, signature: hmac(WEBHOOK_SECRET, raw) });
    }

    return send(res, 404, { error: { description: `fake razorpay: no route ${method} ${path}` } });
  } catch (err) {
    return send(res, 500, { error: { description: String(err?.message || err) } });
  }
});

server.listen(PORT, () => {
  console.log(`fake razorpay gateway → http://127.0.0.1:${PORT}/v1`);
});
