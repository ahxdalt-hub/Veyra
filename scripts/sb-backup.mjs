// Full JSON backup of the live Veyra Supabase project.
//
// Usage: node scripts/sb-backup.mjs
//
// Writes one .json file per table plus auth users and storage object
// metadata into backups/<timestamp>/ (backups/ is gitignored). Run this
// before any destructive operation; the files are plain row arrays that can
// be re-inserted by hand if needed.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TOKEN = readFileSync(new URL("./.sbp-token", import.meta.url), "utf8").trim();
const REF = "otqucrqcefdychplbbtq";

const PUBLIC_TABLES = [
  "admin_audit_log",
  "admin_notifications",
  "coupons",
  "download_events",
  "email_events",
  "entitlements",
  "leads",
  "legacy_abandoned_checkouts",
  "legacy_customers",
  "legacy_license_seats",
  "legacy_order_items",
  "legacy_products",
  "legacy_reviews",
  "legacy_webhook_events",
  "licence_activations",
  "licences",
  "orders",
  "product_versions",
  "products",
  "profiles",
  "redelivery_requests",
  "seat_assignments",
];

const QUERIES = {
  auth_users:
    "select id, email, raw_app_meta_data, raw_user_meta_data, created_at, last_sign_in_at from auth.users order by created_at",
  storage_objects:
    "select bucket_id, name, created_at, updated_at, metadata from storage.objects order by created_at",
};
for (const t of PUBLIC_TABLES) {
  QUERIES[t] = `select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) as rows from public.${t} x`;
}

async function run(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return JSON.parse(text);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = fileURLToPath(new URL(`../backups/${stamp}/`, import.meta.url));
mkdirSync(dir, { recursive: true });

let total = 0;
for (const [name, query] of Object.entries(QUERIES)) {
  const data = await run(query);
  const rows = Array.isArray(data) && data.length === 1 && "rows" in data[0] ? data[0].rows : data;
  const count = Array.isArray(rows) ? rows.length : 0;
  total += count;
  writeFileSync(`${dir}${name}.json`, JSON.stringify(rows, null, 2));
  console.log(`${String(count).padStart(5)}  ${name}`);
}
console.log(`\n${total} rows backed up to backups/${stamp}/`);
