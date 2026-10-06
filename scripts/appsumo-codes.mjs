#!/usr/bin/env node
/**
 * AppSumo redemption codes — batch generator for the storefront deal.
 *
 * A code here is a 100% coupon: checkout's free-order branch
 * (src/app/api/checkout/route.ts) skips the payment gateway, walks the order
 * pending → paid, and runs the same grantPurchaseForOrder() the processor
 * webhook uses. So these codes ARE the product. Treat the output file as a
 * credential and never commit it.
 *
 *   node scripts/appsumo-codes.mjs --count 50                 # dry run, prints
 *   node scripts/appsumo-codes.mjs --count 50 --out codes.csv # writes the CSV
 *   node scripts/appsumo-codes.mjs --count 50 --commit        # inserts into the DB
 *
 * Insertion is always opt-in (`--commit`). Without it nothing is spent and
 * nothing is written to the database, so a draft listing costs nothing.
 *
 * AppSumo's uploader skips the first line of the file, so the CSV carries a
 * `code` header and exactly one code per line after it.
 */
import { randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Unambiguous alphabet: no 0/O, 1/I/L. Buyers type these from an email, and
 * every character a support ticket has to disambiguate is a refund risk. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUP = 5;
const PREFIX = "ASV";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}
const has = (name) => process.argv.includes(`--${name}`);

const count = Number(arg("count") ?? 0);
if (!Number.isInteger(count) || count < 1 || count > 2000) {
  console.error(
    "Usage: node scripts/appsumo-codes.mjs --count <1-2000> [--out file.csv] [--commit] [--batch label]"
  );
  process.exit(1);
}

const batch = arg("batch") ?? new Date().toISOString().slice(0, 10);

function newCode() {
  const group = () =>
    Array.from({ length: GROUP }, () =>
      ALPHABET.charAt(randomInt(ALPHABET.length))
    ).join("");
  return `${PREFIX}-${group()}-${group()}`;
}

/* Single-use and single-customer are what make a leaked code worth one copy
 * rather than many. used_count is stamped by the database's own trigger when
 * the order flips to paid — it is initialised to 0 here and never written
 * again.
 *
 * Lowercase in the database, uppercase on paper: validate_coupon() looks a
 * code up as `code = lower(trim(p_code))` (0013), so a code STORED uppercase
 * can never be found however the buyer types it. The CSV shows uppercase
 * because that is what a human reads off a receipt, and the lookup lowercases
 * whatever they type in. */
function buildRows() {
  const seen = new Set();
  const rows = [];
  while (rows.length < count) {
    const code = newCode();
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({
      code: code.toLowerCase(),
      label: `AppSumo — ${batch}`,
      kind: "percent",
      value: 100,
      active: true,
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: null,
      max_uses: 1,
      per_customer_limit: 1,
      used_count: 0,
    });
  }
  return rows;
}

const rows = buildRows();
const csv = ["code", ...rows.map((r) => r.code.toUpperCase())].join("\n") + "\n";

console.log(`Batch "${batch}" — ${count} codes generated (nothing spent).`);

const out = arg("out");
if (out) {
  const target = path.resolve(root, out);
  writeFileSync(target, csv, { mode: 0o600 });
  console.log(
    `CSV written to ${path.relative(root, target)} — this file entitles anyone to a free copy. Do not commit it.`
  );
}

if (!has("commit")) {
  console.log("\nDry run. Re-run with --commit to insert these into the database.\n");
  process.stdout.write(csv);
  process.exit(0);
}

let env;
try {
  env = readFileSync(path.join(root, ".env.local"), "utf8");
} catch {
  console.error("Missing .env.local — cannot reach the database.");
  process.exit(1);
}
const read = (key) =>
  env.match(new RegExp(`^${key}=["']?([^"'\\n]+)["']?$`, "m"))?.[1]?.trim();

const url = read("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = read("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !serviceKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both required in .env.local."
  );
  process.exit(1);
}

const host = new URL(url).host;
console.log(`Inserting ${count} coupons into ${host}…`);

const response = await fetch(`${url}/rest/v1/coupons`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    prefer: "return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!response.ok) {
  const detail = await response.text();
  console.error(
    `Insert failed (${response.status}). Nothing was added if the database rejected the batch as a whole.\n${detail.slice(0, 400)}`
  );
  process.exit(1);
}

console.log(
  `Inserted. Deactivate this whole batch later with:  update coupons set active = false where label = 'AppSumo — ${batch}';`
);
