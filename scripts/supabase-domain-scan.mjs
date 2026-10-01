/**
 * Scan every exposed PostgREST table for stale domain references left over
 * from the veyra.co → veyra.caelmont.in migration (old worker hostnames,
 * localhost dev URLs). Uses the SERVICE ROLE key — read-only.
 *
 *   node scripts/supabase-domain-scan.mjs
 */
import { readFileSync } from "node:fs";

const REF = "otqucrqcefdychplbbtq";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    })
);
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}` };
const STALE = /veyra\.co\b|veyra\.ahxd|localhost:3000|127\.0\.0\.1:3000/i;

const oa = await (await fetch(`https://${REF}.supabase.co/rest/v1/`, { headers: H })).json();
const tables = Object.keys(oa.definitions ?? {});
console.log(`exposed tables (${tables.length}): ${tables.join(", ")}`);

let hits = 0;
for (const t of tables) {
  const r = await fetch(`https://${REF}.supabase.co/rest/v1/${t}?select=*&limit=500`, {
    headers: H,
  });
  if (!r.ok) {
    console.log(`${t}: HTTP ${r.status} (skipped)`);
    continue;
  }
  const rows = await r.json();
  rows.forEach((row, i) => {
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === "string" && STALE.test(v)) {
        hits++;
        console.log(`STALE ${t}[${row.id ?? i}].${k} = ${v.slice(0, 200)}`);
      } else if (v && typeof v === "object" && STALE.test(JSON.stringify(v))) {
        hits++;
        console.log(`STALE ${t}[${row.id ?? i}].${k} (nested) = ${JSON.stringify(v).slice(0, 200)}`);
      }
    }
  });
}
console.log(hits ? `\n${hits} stale reference(s) found.` : "\nNo stale domain references in any exposed table.");



