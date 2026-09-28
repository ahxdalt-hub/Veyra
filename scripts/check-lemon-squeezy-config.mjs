#!/usr/bin/env node
/**
 * Lemon Squeezy configuration check — no payment is ever created.
 *
 *   npm run test:payments:config          # env audit only (no network)
 *   npm run test:payments:live            # + verifies the API key works
 *                                          against Lemon Squeezy's GET /user
 *
 * What it asserts:
 *   - LEMONSQUEEZY_API_KEY present, looks like an LS API key (JWT: three
 *     dot-separated base64url segments).
 *   - LEMONSQUEEZY_STORE_ID numeric; every currently purchasable product
 *     has a numeric LEMONSQUEEZY_VARIANT_ID_<SLUG>.
 *   - LEMONSQUEEZY_WEBHOOK_SECRET present (6–40 chars, LS's documented
 *     length range) — without it /api/webhooks/lemonsqueezy answers 503.
 *   - LEMONSQUEEZY_MODE matches expectations: with MODE=live, warn loudly
 *     that this deployment can now charge real money.
 *   - Never prints any secret value — only presence, length, and shape.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", ".env.local");
const env = { ...process.env };
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim();
  }
}

/* Purchasable catalog entries (status "available" in src/lib/products.ts).
   Kept in sync manually — a new product must be added here and get a
   variant env var before checkout will charge for it. */
const PURCHASABLE_SLUGS = ["client-growth-system", "growth-audit"];
const variantEnvKey = (slug) =>
  `LEMONSQUEEZY_VARIANT_ID_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;

const problems = [];
const notes = [];

const key = env.LEMONSQUEEZY_API_KEY ?? "";
if (!key) {
  problems.push("LEMONSQUEEZY_API_KEY is not set — checkout will honestly answer 'payments not configured'.");
} else if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
  problems.push("LEMONSQUEEZY_API_KEY does not look like a Lemon Squeezy API key (expected a JWT: three dot-separated segments).");
} else {
  notes.push(`API key present (${key.length} chars, JWT-shaped).`);
}

const store = env.LEMONSQUEEZY_STORE_ID ?? "";
if (!store) problems.push("LEMONSQUEEZY_STORE_ID is not set (numeric id from Lemon Squeezy → Developer settings).");
else if (!/^\d+$/.test(store)) problems.push("LEMONSQUEEZY_STORE_ID must be numeric.");

for (const slug of PURCHASABLE_SLUGS) {
  const id = env[variantEnvKey(slug)] ?? "";
  if (!id) problems.push(`${variantEnvKey(slug)} is not set — ${slug} cannot be charged for.`);
  else if (!/^\d+$/.test(id)) problems.push(`${variantEnvKey(slug)} must be a numeric variant id.`);
}

const secret = env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";
if (!secret) problems.push("LEMONSQUEEZY_WEBHOOK_SECRET is not set — /api/webhooks/lemonsqueezy answers 503 and no order ever confirms.");
else if (secret.length < 6 || secret.length > 40) problems.push("LEMONSQUEEZY_WEBHOOK_SECRET must be 6–40 characters (Lemon Squeezy's documented range).");
else notes.push(`Webhook secret present (${secret.length} chars).`);

const mode = (env.LEMONSQUEEZY_MODE ?? "test").toLowerCase();
if (mode === "live") notes.push("LEMONSQUEEZY_MODE=live — this deployment is declared LIVE. Real money moves if the key is a live key.");
else if (mode !== "test") problems.push(`LEMONSQUEEZY_MODE="${mode}" is neither "test" nor "live".`);

/* ---- network verification (GET /v1/user) --------------------------- */
async function verifyApiKey() {
  const res = await fetch("https://api.lemonsqueezy.com/v1/user", {
    headers: { Accept: "application/vnd.api+json", Authorization: `Bearer ${key}` },
  });
  if (res.status === 401) {
    problems.push("Lemon Squeezy rejected the API key (401). Check Developer settings.");
    return;
  }
  if (!res.ok) {
    problems.push(`Lemon Squeezy GET /user answered ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return;
  }
  const me = await res.json();
  const email = me?.data?.attributes?.email;
  notes.push(`API key valid — authenticated as ${email ?? "the store owner"}.`);
}

const wantsLive = process.argv.includes("--live");
if (wantsLive && key) {
  await verifyApiKey();
} else if (wantsLive) {
  problems.push("--live requested but no API key to verify.");
}

for (const n of notes) console.log(`ok    ${n}`);
for (const p of problems) console.log(`PROBLEM  ${p}`);
if (!problems.length) {
  console.log("\nLemon Squeezy configuration is complete for the purchasable catalog.");
  process.exit(0);
} else {
  console.log(`\n${problems.length} problem(s). Checkout fails closed until they are fixed — nothing is charged.`);
  process.exit(1);
}
