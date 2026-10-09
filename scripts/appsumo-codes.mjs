#!/usr/bin/env node
/**
 * Marketplace redemption codes — batch generator for the storefront deal.
 *
 * A code here is NOT a coupon. It is a key for a copy the buyer already paid
 * for, on a platform that is the merchant of record. Claiming one
 * (src/lib/redeem.ts → /api/redeem) mints a full-price paid order and runs the
 * same grantPurchaseForOrder() the processor webhook uses, so these codes ARE
 * the product. Treat the output file as a credential and never commit it.
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
/* 31^10 keyspace, so a 10k batch has a ~1-in-16,000 internal collision chance,
 * which the seen-set below removes anyway. The ceiling here is about the
 * database insert and the printed output, not the codes. */
if (!Number.isInteger(count) || count < 1 || count > 50000) {
  console.error(
    "Usage: node scripts/appsumo-codes.mjs --count <1-50000> [--out file.csv] [--commit] [--batch label] [--value-dollars 79] [--currency USD] [--channel appsumo] [--product slug]"
  );
  process.exit(1);
}
const batch = arg("batch") ?? new Date().toISOString().slice(0, 10);

/* Deal terms. Defaults match the live AppSumo offer; pass --value-dollars if
 * the listing changes so the redeemed orders report the real revenue. */
const valueCents = Math.round(Number(arg("value-dollars") ?? 79) * 100);
const currency = arg("currency") ?? "USD";
const channel = arg("channel") ?? "appsumo";
const product = arg("product") ?? "client-growth-system";
if (!Number.isInteger(valueCents) || valueCents < 0) {
  console.error("--value-dollars must be a non-negative number of dollars.");
  process.exit(1);
}


function newCode() {
  const group = () =>
    Array.from({ length: GROUP }, () =>
      ALPHABET.charAt(randomInt(ALPHABET.length))
    ).join("");
  return `${PREFIX}-${group()}-${group()}`;
}

/* One code, one copy, forever: there is no used_count column to increment
 * because the claim itself is the ledger — a redeemed row flips to status
 * 'redeemed' inside a single guarded UPDATE (redeem_code_claim, 0029), so two
 * buyers submitting the same key at the same instant cannot both win.
 *
 * value_cents is what the marketplace charged, and it becomes the order's
 * amount with no discount. Keep it equal to the live deal price or the
 * revenue reported from these orders will be wrong.
 *
 * Lowercase in the database, uppercase on paper: the claim lowercases whatever
 * the buyer types, and a code STORED uppercase would never be found. */
function buildRows() {
  const seen = new Set();
  const rows = [];
  while (rows.length < count) {
    const code = newCode();
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({
      code: code.toLowerCase(),
      product_slug: product,
      value_cents: valueCents,
      currency,
      channel,
      batch: `AppSumo — ${batch}`,
      status: "available",
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
  /* Dumping 10,001 codes onto a terminal buries everything else the run
   * reported; the CSV on disk is the artifact at that size. */
  if (count > 50) {
    console.log(rows.slice(0, 5).map((r) => r.code.toUpperCase()).join("\n"));
    console.log(`… and ${count - 5} more${out ? " in the CSV." : " (pass --out to write the CSV)."}`);
  } else {
    process.stdout.write(csv);
  }
  process.exit(0);
}

if (!out) {
  console.error(
    "Refusing to commit without --out: codes that exist only in the database cannot be sold."
  );
  process.exit(1);
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
console.log(`Inserting ${count} redeem codes (${currency} ${valueCents / 100}, ${channel}) into ${host}…`);

/* One 10,001-row request is the wrong shape: a single collision on the code
 * primary key rejects the entire body, and the buyer-facing CSV has already
 * been written by then. Chunks keep the blast radius to one chunk, and the
 * count-back at the end proves the CSV and the table agree. */
const CHUNK = 500;
const headers = {
  "content-type": "application/json",
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
  prefer: "return=minimal",
};

for (let i = 0; i < rows.length; i += CHUNK) {
  const slice = rows.slice(i, i + CHUNK);
  const response = await fetch(`${url}/rest/v1/redeem_codes`, {
    method: "POST",
    headers,
    body: JSON.stringify(slice),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(
      `\nChunk ${i / CHUNK + 1} failed (${response.status}) after ${i} rows were inserted.\n${detail.slice(0, 400)}\n` +
        `Codes up to row ${i} of ${rows.length} are live; the rest are not. Either finish the batch by hand or pull what landed:\n` +
        `  update redeem_codes set status = 'deactivated' where batch = 'AppSumo — ${batch}' and status = 'available';`
    );
    process.exit(1);
  }
  process.stdout.write(`\r  ${Math.min(i + CHUNK, rows.length)} / ${rows.length}`);
}
console.log("");

/* Read back rather than trusting the write path. A GET is capped at 1000
 * rows by Supabase's default db-max-rows, so ask for the count the way the
 * founding allocation does: HEAD + Prefer: count=exact. */
const check = await fetch(
  `${url}/rest/v1/redeem_codes?select=code&batch=eq.${encodeURIComponent(`AppSumo — ${batch}`)}&status=eq.available`,
  {
    method: "HEAD",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      prefer: "count=exact",
      range: "0-0",
      "range-unit": "items",
    },
  }
);
const range = check.headers.get("content-range"); // e.g. "0-0/10001"
const live = range ? Number(range.split("/")[1]) : NaN;
if (!Number.isFinite(live) || live !== count) {
  console.error(
    `Verification mismatch: expected ${count} unclaimed codes in batch "AppSumo — ${batch}", the database reports ${live}. Do not publish the CSV until this is resolved.`
  );
  process.exit(1);
}

console.log(
  `Verified: ${live} codes live in /admin/redeem-codes. Pull this whole batch later with:  update redeem_codes set status = 'deactivated' where batch = 'AppSumo — ${batch}' and status = 'available';`
);
