// Ad-hoc helper: run SQL against the live Veyra Supabase project via the
// management API. Usage: node scripts/sb-query.mjs "select ..."
import { readFileSync } from "node:fs";
const TOKEN = readFileSync(new URL("./.sbp-token", import.meta.url), "utf8").trim();
const REF = "otqucrqcefdychplbbtq";
const query = process.argv[2];
if (!query) { console.error("usage: node scripts/sb-query.mjs <sql>"); process.exit(2); }
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const text = await res.text();
console.log(`HTTP ${res.status}`);
try { console.log(JSON.stringify(JSON.parse(text), null, 1)); } catch { console.log(text); }
if (!res.ok) process.exit(1);
