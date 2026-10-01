/**
 * Verdict probe: does Supabase GoTrue honor redirects back to
 * https://veyra.caelmont.in/auth/callback (the exact URL sign-up and
 * password-reset emails use), and does it still REJECT unknown domains?
 *
 * Method: admin/generate_link builds a magic link WITHOUT sending email;
 * we then follow it like a browser would with an explicit redirect_to.
 * Honored  = Location starts with the requested redirect URL.
 * Fallback = Location is the bare Site URL (redirect was rejected).
 * Each target needs a fresh link (verify tokens are single-use).
 * Link tokens and session tokens are never printed.
 *
 *   node scripts/supabase-auth-redirect-probe.mjs
 */
import { readFileSync } from "node:fs";

const REF = "otqucrqcefdychplbbtq";
const BASE = `https://${REF}.supabase.co/auth/v1`;
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
const H = { "Content-Type": "application/json", apikey: SVC, Authorization: `Bearer ${SVC}` };

const TARGETS = [
  ["prod callback", "https://veyra.caelmont.in/auth/callback?next=%2Faccount"],
  ["prod reset    ", "https://veyra.caelmont.in/auth/callback?next=%2Faccount%2Freset-password"],
  ["dev localhost ", "http://localhost:3000/auth/callback?next=%2Faccount"],
  ["evil domain   ", "https://evil.example.com/auth/callback"],
];

const users = await (await fetch(`${BASE}/admin/users?page=1&per_page=5`, { headers: H })).json();
const email = users?.users?.[0]?.email;
if (!email) {
  console.log("no users found");
  process.exit(1);
}

/** Strip anything sensitive from a Location header for logging. */
function safe(loc) {
  if (!loc) return "(none)";
  try {
    const u = new URL(loc);
    return `${u.origin}${u.pathname}${u.search}`; // drops #fragment tokens
  } catch {
    return loc.slice(0, 80);
  }
}

for (const [label, target] of TARGETS) {
  const gen = await fetch(`${BASE}/admin/generate_link`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ type: "magiclink", email, options: { redirect_to: target } }),
  });
  const genBody = await gen.json();
  if (!gen.ok) {
    console.log(`${label}: generate_link ${gen.status}: ${JSON.stringify(genBody).slice(0, 160)}`);
    continue;
  }

  // Rebuild the verify URL with EXACTLY our redirect_to (authoritative —
  // independent of how the action_link embedded it).
  const link = new URL(genBody.action_link);
  link.searchParams.set("redirect_to", target);

  const v = await fetch(link.toString(), { redirect: "manual" });
  const loc = v.headers.get("location");

  const honored = loc?.startsWith(target);
  const siteFallback = loc != null && new URL(loc).origin === "https://veyra.caelmont.in" && !honored;
  const verdict = honored
    ? "HONORED ✅"
    : siteFallback
      ? "rejected → fell back to Site URL ⚠️"
      : `other (${safe(loc)})`;
  console.log(`${label}: ${v.status} ${verdict}`);
  if (!honored) console.log(`    requested: ${target}\n    got:      ${safe(loc)}`);
}