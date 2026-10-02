#!/usr/bin/env node
/**
 * Email configuration check — no email is ever sent.
 *
 *   npm run test:email:config        # env audit only (no network)
 *   npm run test:email:config --live # + verifies the Resend key and that
 *                                    #   the sender's domain is verified
 *
 * What it asserts:
 *   - RESEND_API_KEY present.
 *   - VEYRA_EMAIL_FROM present, shaped like "Name <addr@domain>", NOT a
 *     gmail.com/other freemail sender (Resend sandbox + freemail = the
 *     classic "emails silently only reach myself" trap).
 *   - Support address (src/lib/site.ts contact) is present so reply_to
 *     has a target.
 *   - --live: GET https://api.resend.com/domains proves the key works and
 *     reports whether the sender's domain is VERIFIED (a sandboxed domain
 *     can only deliver to the account owner's own inbox).
 *
 * Never prints any secret value — only presence, shape, and status.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", ".env.local");
const env = { ...process.env };
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && env[m[1]] === undefined) env[m[1]] = m[2].trim();
  }
}

const problems = [];
const notes = [];

const key = env.RESEND_API_KEY ?? "";
if (!key) {
  problems.push(
    "RESEND_API_KEY is not set — transactional emails render to the server console and are never delivered."
  );
} else {
  notes.push(`Resend API key present (${key.length} chars).`);
}

const from = env.VEYRA_EMAIL_FROM ?? "";
const addrMatch = from.match(/<\s*([^>\s]+)\s*>/) ?? (from.includes("@") ? [null, from.trim()] : [null, null]);
const addr = addrMatch?.[1] ?? null;
const domain = addr ? addr.split("@")[1]?.toLowerCase() ?? null : null;

if (!from) {
  problems.push(
    "VEYRA_EMAIL_FROM is not set — the app refuses to send (sender_not_configured) and receipts record a failure."
  );
} else if (!addr || !domain) {
  problems.push(
    `VEYRA_EMAIL_FROM doesn't contain a parseable address — expected "Name <sender@domain>" or "sender@domain".`
  );
} else if (/(\.|^)(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|aol)\./.test(domain)) {
  problems.push(
    `VEYRA_EMAIL_FROM sender domain is "${domain}" — freemail senders are rejected/unverifiable at Resend. Use the production domain (e.g. no-reply@veyra.caelmont.in).`
  );
} else {
  notes.push(`Sender address present: …@${domain}.`);
}

// Support/reply-to target comes from src/lib/site.ts — parse it rather
// than duplicating the address here.
const siteSrc = readFileSync(join(here, "..", "src", "lib", "site.ts"), "utf8");
const contact = siteSrc.match(/contact:\s*\{\s*email:\s*"([^"]+)"/);
if (!contact) {
  problems.push("src/lib/site.ts has no contact.email — reply_to and every support link resolve through it.");
} else {
  notes.push(`Support / reply-to address: ${contact[1]}.`);
  if (/gmail|googlemail|yahoo|hotmail|outlook|live|icloud|aol/i.test(contact[1])) {
    notes.push(
      "Support address is a freemail inbox — it works, but a domain mailbox (support@veyra.caelmont.in) is the production-grade follow-up."
    );
  }
}

// Purchase/receipt links come from NEXT_PUBLIC_SITE_URL.
const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
if (!siteUrl.startsWith("https://")) {
  problems.push(
    "NEXT_PUBLIC_SITE_URL is not an https URL — receipt links would point at localhost or an insecure origin."
  );
} else {
  notes.push(`Receipt/account links point at ${siteUrl}.`);
}

// Supabase auth emails (password reset + signup confirmation) are rendered
// by Supabase, not Resend — point at the apply script rather than guessing.
const templatesOk = ["confirmation.html", "recovery.html"].every((f) =>
  existsSync(join(here, "..", "supabase", "email-templates", f))
);
if (!templatesOk) {
  problems.push(
    "supabase/email-templates/ is missing confirmation.html or recovery.html — signup verification / password reset would fall back to Supabase defaults."
  );
} else {
  notes.push("Supabase auth templates present (confirmation, recovery) — apply with scripts/sb-set-email-templates.mjs.");
}

/* ---- network verification (GET /domains) ---------------------------- */
async function verifyResend() {
  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (res.status === 401) {
    problems.push("Resend rejected the API key (401) — the key is invalid or revoked.");
    return;
  }
  if (!res.ok) {
    problems.push(`Resend GET /domains answered ${res.status}.`);
    return;
  }
  const body = await res.json();
  const domains = body?.data ?? [];
  if (!domains.length) {
    problems.push("No domains are registered in this Resend account — sending is sandbox-only.");
    return;
  }
  for (const d of domains) {
    const status = d?.status ?? "unknown";
    notes.push(`Resend domain ${d?.name ?? "?"}: ${status}.`);
  }
  if (domain) {
    const match = domains.find((d) => String(d?.name).toLowerCase() === domain);
    if (!match) {
      problems.push(
        `Sender domain "${domain}" is not registered in this Resend account — every send fails or lands in the sandbox.`
      );
    } else if (String(match.status).toLowerCase() !== "verified") {
      problems.push(
        `Sender domain "${domain}" is registered but NOT verified (status: ${match.status}) — Resend only delivers to your own inbox until it is.`
      );
    } else {
      notes.push(`Sender domain "${domain}" is verified — production delivery is live.`);
    }
  }
}

const wantsLive = process.argv.includes("--live");
if (wantsLive && key) {
  await verifyResend();
} else if (wantsLive) {
  problems.push("--live requested but no RESEND_API_KEY to verify.");
}

for (const n of notes) console.log(`ok    ${n}`);
for (const p of problems) console.log(`PROBLEM  ${p}`);
if (!problems.length) {
  console.log("\nEmail configuration is production-safe for the current flow.");
  process.exit(0);
} else {
  console.log(`\n${problems.length} problem(s). Email is not production-safe until they are fixed.`);
  process.exit(1);
}
