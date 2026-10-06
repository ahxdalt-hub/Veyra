#!/usr/bin/env node
/**
 * `npm run dodo:setup` — the whole Dodo Payments wiring, printed as copyable
 * lines, plus a check of what is already in place.
 *
 * Reads `.env.local` (never prints a value that looks like a secret — only
 * key names, lengths and a mode) and reports exactly which variables are
 * missing, in the order they stop checkout from working.
 *
 *   npm run dodo:setup              # audit + emit env lines for .env.local
 *   npm run test:payments:live      # same, aimed at the live-mode cutover
 *
 * No network calls. A Dodo API key is mode-scoped and the only honest test is
 * creating a real test-mode checkout, which is a purchase flow, not a health
 * check — do that by hand once the keys are bound.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forLive = process.argv.includes("--live");

/* Products checkout can charge. Free catalog entries (The Growth Audit) are
 * claimed through /api/claim and never reach a processor, so they need no
 * Dodo product. Keep in sync with src/lib/products.ts (status "available"
 * and not `free`). */
const PRODUCTS = [
  { slug: "client-growth-system", title: "Client Growth System" },
];

function envVarName(slug) {
  return `DODO_PAYMENTS_PRODUCT_ID_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

/** Parse KEY=value lines out of .env.local without printing values. */
function readEnv() {
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return { parsed: new Map(), exists: false };
  const parsed = new Map();
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    parsed.set(m[1], m[2].replace(/^["']|["']$/g, ""));
  }
  return { parsed, exists: true };
}

const LOOKS_LIKE_SECRET = /API_KEY|WEBHOOK_KEY|WEBHOOK_SECRET|SECRET|SERVICE_ROLE|SIGNING_KEY|PASSWORD|PIN/;

function describe(name, value) {
  if (value === undefined) return "ABSENT";
  if (value === "") return "present but EMPTY";
  if (LOOKS_LIKE_SECRET.test(name)) return `set (${value.length} chars, value not shown)`;
  return `set to ${value}`;
}

const { parsed, exists } = readEnv();

console.log(`\nDodo Payments configuration audit (${forLive ? "live" : "test"} mode requested)`);
console.log(`  .env.local declares: ${parsed.get("DODO_PAYMENTS_ENVIRONMENT") ?? "unset"}\n`);
console.log(exists ? "  .env.local     — read (values other than mode flags are never printed)"
                   : "  .env.local     — MISSING; the lines below have to be created");

const required = [
  ["PAYMENT_PROVIDER", parsed.get("PAYMENT_PROVIDER")],
  ["DODO_PAYMENTS_ENVIRONMENT", parsed.get("DODO_PAYMENTS_ENVIRONMENT")],
  ["DODO_PAYMENTS_API_KEY", parsed.get("DODO_PAYMENTS_API_KEY")],
  ["DODO_PAYMENTS_WEBHOOK_KEY", parsed.get("DODO_PAYMENTS_WEBHOOK_KEY")],
  ...PRODUCTS.map((p) => [envVarName(p.slug), parsed.get(envVarName(p.slug))]),
];

let problems = 0;
for (const [name, value] of required) {
  const ok =
    value &&
    (name !== "PAYMENT_PROVIDER" || /^(dodo|dodo-payments)$/.test(value)) &&
    (name !== "DODO_PAYMENTS_ENVIRONMENT" ||
      new RegExp(forLive ? "^live(_mode)?$" : "^(test|live)(_mode)?$").test(value));
  if (!ok) problems++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name.padEnd(46)} ${describe(name, value)}`);
}

/* Legacy keys left behind would be inert but confusing — and a stale
 * PAYMENT_PROVIDER value fails the whole checkout closed. */
const stale = [...parsed.keys()].filter((k) => /RAZORPAY|LEMONSQUEEZY|LEMON_SQUEEZY/i.test(k));
if (stale.length) {
  problems++;
  console.log(`\n  stale keys to delete from .env.local: ${stale.join(", ")}`);
}

console.log(`
— Copy these into .env.local (secrets stay local; this file is gitignored) —
`);
const lines = [
  "PAYMENT_PROVIDER=dodo",
  `DODO_PAYMENTS_ENVIRONMENT=${forLive ? "live_mode" : "test_mode"}`,
  "DODO_PAYMENTS_API_KEY=<paste from Dodo dashboard → Developers → API keys>",
  "DODO_PAYMENTS_WEBHOOK_KEY=<paste whsec_… from dashboard → Developers → Webhooks>",
  ...PRODUCTS.map((p) => `${envVarName(p.slug)}=<paste the ${p.title} product id>`),
];
console.log(lines.map((l) => `  ${l}`).join("\n"));

console.log(`
— Steps a key cannot cover —
  1. Dashboard → Products: create ONE product per catalog entry above, each with
     "Pay What You Want" enabled and a $1.00 price. Without PWYW, Dodo ignores
     the amount Veyra computes and silently charges the stored price.
  2. Dashboard → Developers → Webhooks: add
     https://veyra.caelmont.in/api/webhooks/dodo
     for events  payment.succeeded, refund.succeeded. Copy the signing secret
     (whsec_…) into DODO_PAYMENTS_WEBHOOK_KEY.
  3. Ship the same vars to the Worker, then bind the secrets out-of-band:
       npx wrangler deploy               # or: npm run deploy
       npx wrangler secret put DODO_PAYMENTS_API_KEY
       npx wrangler secret put DODO_PAYMENTS_WEBHOOK_KEY
     Deploying without the keys is safe — checkout answers 503
     payments_not_configured rather than charging the wrong amount.
  4. Put money on the account before ${forLive ? "going live" : "expecting real charges"}:
     Dodo is the merchant of record, so payouts come from Dodo, not from
     Razorpay's or Lemon Squeezy's old balances.
`);

/* The Worker's non-secret product ids live in wrangler.jsonc; show whether
 * they are filled so a deploy does not ship an empty mapping. */
try {
  const wrangler = readFileSync(path.join(root, "wrangler.jsonc"), "utf8");
  const unfilled = PRODUCTS
    .map((p) => envVarName(p.slug))
    .filter((name) => new RegExp(`"${name}"\\s*:\\s*""`).test(wrangler));
  if (unfilled.length) {
    console.log(`  note: wrangler.jsonc still has empty ${unfilled.join(", ")} — fill them (public ids) or bind them as secrets before deploying.\n`);
  }
} catch {
  /* wrangler.jsonc unreadable is not a payments failure. */
}

console.log(problems === 0 ? "Audit: no blocking gaps.\n" : `Audit: ${problems} gap(s) above must be closed before checkout works.\n`);
process.exit(problems === 0 ? 0 : 1);
