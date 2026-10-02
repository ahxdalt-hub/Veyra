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
  : args[0];
if (!query) { console.error("usage: node scripts/sb-query.mjs <sql> | --file <path.sql>"); process.exit(2); }
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const text = await res.text();
console.log(`HTTP ${res.status}`);
try { console.log(JSON.stringify(JSON.parse(text), null, 1)); } catch { console.log(text); }
if (!res.ok) process.exit(1);
