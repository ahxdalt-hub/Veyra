// Apply Veyra's branded Supabase Auth email templates through the Management
// API (same .sbp-token as sb-query.mjs).
// Usage: node scripts/sb-set-email-templates.mjs                # all templates
//        node scripts/sb-set-email-templates.mjs confirmation   # just one
//
// Templates live in supabase/email-templates/<name>.html with the subject in
// supabase/email-templates/<name>.subject.txt — those files are the source of
// truth; edit them and re-run this script to update the live project.
// Only templates Veyra actually sends are wired here; add entries to
// TEMPLATES (e.g. invite, magic_link, email_change) when the app grows.
import { readFileSync, existsSync } from "node:fs";

const REF = "otqucrqcefdychplbbtq";
const API = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const TOKEN = readFileSync(new URL("./.sbp-token", import.meta.url), "utf8").trim();
const DIR = new URL("../supabase/email-templates/", import.meta.url);

/** template name → the auth-config fields it maps to. */
const TEMPLATES = {
  confirmation: {
    subject: "mailer_subjects_confirmation",
    content: "mailer_templates_confirmation_content",
    customFlag: "MAILER_TEMPLATES_CONFIRMATION_CONTENT",
  },
  recovery: {
    subject: "mailer_subjects_recovery",
    content: "mailer_templates_recovery_content",
    customFlag: "MAILER_TEMPLATES_RECOVERY_CONTENT",
  },
};

const requested = process.argv.slice(2);
const names = requested.length ? requested : Object.keys(TEMPLATES);

const body = {};
for (const name of names) {
  const tpl = TEMPLATES[name];
  if (!tpl) {
    console.error(`unknown template "${name}" — known: ${Object.keys(TEMPLATES).join(", ")}`);
    process.exit(2);
  }
  const htmlFile = new URL(`${name}.html`, DIR);
  const subjectFile = new URL(`${name}.subject.txt`, DIR);
  if (!existsSync(htmlFile) || !existsSync(subjectFile)) {
    console.error(`missing ${name}.html and/or ${name}.subject.txt in supabase/email-templates/`);
    process.exit(2);
  }
  body[tpl.subject] = readFileSync(subjectFile, "utf8").trim();
  body[tpl.content] = readFileSync(htmlFile, "utf8").trim();
}

const patch = await fetch(API, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const patchText = await patch.text();
console.log(`PATCH ${API} -> HTTP ${patch.status}`);
if (!patch.ok) {
  console.log(patchText);
  process.exit(1);
}

// Verify the project now reports our content as custom (not stock Supabase).
const get = await fetch(API, { headers: { Authorization: `Bearer ${TOKEN}` } });
const cfg = await get.json();
let failed = false;
for (const name of names) {
  const tpl = TEMPLATES[name];
  const isCustom = cfg.mailer_templates_custom_contents?.[tpl.customFlag];
  const subject = cfg[tpl.subject];
  console.log(`${isCustom ? "OK  " : "FAIL"} ${name} — subject: ${subject}`);
  if (!isCustom) failed = true;
}
if (failed) process.exit(1);
