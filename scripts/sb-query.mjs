// Ad-hoc helper: run SQL against the live Veyra Supabase project via the
// management API.
// Usage: node scripts/sb-query.mjs "select ..."
//        node scripts/sb-query.mjs --file supabase/migrations/XXXX.sql
//
// Prefer --file for multi-statement DDL. Passing SQL with embedded double
// quotes as a shell argument is unreliable — PowerShell (5.1) and cmd split
// the argument at the quotes, so only the first fragment reaches the server
// and the statement silently "succeeds" having done nothing.
import { readFileSync } from "node:fs";
const TOKEN = readFileSync(new URL("./.sbp-token", import.meta.url), "utf8").trim();
const REF = "otqucrqcefdychplbbtq";
const args = process.argv.slice(2);
const query = args[0] === "--file"
  ? (args[1] ? readFileSync(args[1], "utf8") : "")
  : args.filter((a) => a !== "--yes-i-mean-prod").join(" ");
if (!query) { console.error("usage: node scripts/sb-query.mjs <sql> | --file <path.sql> [--yes-i-mean-prod]"); process.exit(2); }

// This project is LIVE commerce. Read-only statements run freely, but anything
// that mutates rows or schema is refused unless the operator passes
// --yes-i-mean-prod, so one fat-fingered command cannot silently corrupt or
// wipe real orders. Strip strings/comments first so the detector isn't fooled
// by a keyword appearing inside a quoted literal.
const CONFIRM = args.includes("--yes-i-mean-prod");
const scannable = query
  .replace(/'([^']|'')*'/g, "''")
  .replace(/--(?!\n)[^\n]*/g, "")
  .replace(/"[^"]*"/g, '""')
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .toUpperCase();
const WRITE = /\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|REINDEX|VACUUM|COMMENT|COPY|REFRESH|CLUSTER|LOCK|DO)\b/.test(scannable);
if (WRITE && !CONFIRM) {
  console.error("REFUSED: this query mutates the LIVE Veyra database (" + REF + ").");
  console.error("Re-run with --yes-i-mean-prod to confirm you intend to change production data or schema.");
  process.exit(1);
}
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const text = await res.text();
console.log(`HTTP ${res.status}`);
try { console.log(JSON.stringify(JSON.parse(text), null, 1)); } catch { console.log(text); }
if (!res.ok) process.exit(1);
