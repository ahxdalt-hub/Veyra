/**
 * Seed/cleanup helpers for the Stage 7 desktop-UI walkthrough.
 *   node supabase/test/ui-seed.mjs seed    → creates a 2-seat licence, prints
 *                                            the reference + email
 *   node supabase/test/ui-seed.mjs revoke  → revokes that licence (keeps ids)
 *   node supabase/test/ui-seed.mjs clean   → removes all seeded rows
 * Ids persist in supabase/test/.ui-seed.json between calls.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const TOKEN = readFileSync(new URL("../../scripts/.sbp-token", import.meta.url).pathname.slice(1), "utf8").trim();
const REF = "otqucrqcefdychplbbtq";
const STATE = new URL("./.ui-seed.json", import.meta.url).pathname.slice(1);
const run = async (query) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`sql ${res.status}: ${t.slice(0, 300)}`);
  try { return JSON.parse(t); } catch { return t; }
};

const mode = process.argv[2];
const EMAIL = "stage7-ui@veyra.test";

if (mode === "seed") {
  const s = Math.random().toString(16).slice(2, 6);
  const order = `e2e1${s}-e2e0-4e00-8000-000000000000`;
  const ent = `e2e2${s}-e2e0-4e00-8000-000000000000`;
  const lic = `e2e3${s}-e2e0-4e00-8000-000000000000`;
  const seat = `e2e4${s}-e2e0-4e00-8000-000000000000`;
  const hex = ent.replace(/-/g, "").slice(0, 12).toUpperCase();
  const reference = `VY-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  await run(`insert into orders (id, email, product_slug, quantity, amount, status)
             values ('${order}', '${EMAIL}', 'client-growth-system', 2, 1560000, 'paid')`);
  await run(`insert into entitlements (id, order_id, email, product_slug, seats, status)
             values ('${ent}', '${order}', '${EMAIL}', 'client-growth-system', 2, 'active')`);
  await run(`insert into licences (id, entitlement_id, email, product_slug, licence_reference, status)
             values ('${lic}', '${ent}', '${EMAIL}', 'client-growth-system', '${reference}', 'active')`);
  await run(`insert into seat_assignments (id, entitlement_id, seat_number, email, status)
             values ('${seat}', '${ent}', 1, '${EMAIL}', 'active')`);
  writeFileSync(STATE, JSON.stringify({ order, ent, lic, seat, reference, email: EMAIL }));
  console.log(JSON.stringify({ reference, email: EMAIL }));
} else if (mode === "revoke") {
  const st = JSON.parse(readFileSync(STATE, "utf8"));
  await run(`update licences set status='revoked' where id='${st.lic}'`);
  await run(`update entitlements set status='revoked' where id='${st.ent}'`);
  console.log("revoked", st.reference);
} else if (mode === "clean") {
  if (existsSync(STATE)) {
    const st = JSON.parse(readFileSync(STATE, "utf8"));
    await run(`delete from orders where id='${st.order}'`);
    console.log("cleaned");
  } else console.log("nothing to clean");
} else {
  console.error("usage: node ui-seed.mjs seed|revoke|clean");
  process.exit(2);
}
