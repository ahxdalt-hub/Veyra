#!/usr/bin/env node
/**
 * `npm run deploy` — build and ship the Worker WITHOUT putting secrets in it.
 *
 * `opennextjs-cloudflare build` inlines every variable it finds in
 * `.env.local` into `.open-next/cloudflare/next-env.mjs`, and `init.js`
 * applies that file with `process.env[key] ??= …`. Real Worker secrets
 * already win, so the inlined copy buys nothing — it only means the
 * RLS-bypassing service key and the shared partner webhook secret sit inside
 * a downloadable artifact. (Ported from Caelmont's deploy guard; the bare
 * `opennextjs-cloudflare build && deploy` that used to live in package.json
 * had no such protection.)
 *
 * So the build runs against a temporary, public-only env file, the artifact
 * is verified before upload, and the operator's real `.env.local` is put
 * back on every path, including a failed build.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocal = path.join(root, ".env.local");
const backup = `${envLocal}.deploy-backup`;
const bundleEnv = path.join(root, ".open-next", "cloudflare", "next-env.mjs");

/** Anything a browser may already see. Everything else is server-only. */
const PUBLIC_PREFIX = "NEXT_PUBLIC_";

function publicLines() {
  if (!existsSync(envLocal)) return "";
  return readFileSync(envLocal, "utf8")
    .split(/\r?\n/)
    .filter((line) => new RegExp(`^\\s*${PUBLIC_PREFIX}[A-Za-z0-9_]+=`).test(line))
    .join("\n");
}

/** Keys that must never appear in the uploaded artifact. */
const FORBIDDEN = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "LEMONSQUEEZY_API_KEY",
  "LEMONSQUEEZY_WEBHOOK_SECRET",
  "RAZORPAY_KEY_SECRET",
  "RESEND_API_KEY",
  "VEYRA_LICENCE_SIGNING_KEY",
  "VEYRA_ADMIN_PASSWORD",
  "VEYRA_ADMIN_PIN",
  "VEYRA_ADMIN_SESSION_SECRET",
  "PARTNER_WEBHOOK_SECRET",
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: true });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
}

let swapped = false;
try {
  const publicOnly = publicLines();
  if (existsSync(envLocal)) {
    copyFileSync(envLocal, backup);
    rmSync(envLocal);
    swapped = true;
  }
  if (publicOnly) writeFileSync(envLocal, `${publicOnly}\n`);

  run("npx", ["opennextjs-cloudflare", "build"]);

  if (!existsSync(bundleEnv)) throw new Error(`${bundleEnv} missing after build — refusing to deploy blind`);
  const built = readFileSync(bundleEnv, "utf8");
  const leaked = FORBIDDEN.filter((key) => built.includes(`"${key}"`));
  if (leaked.length > 0) {
    throw new Error(`build inlined server-only variables: ${leaked.join(", ")} — deploy aborted`);
  }
  console.log(`[deploy] artifact carries ${FORBIDDEN.length} server-only keys: none inlined`);

  run("npx", ["opennextjs-cloudflare", "deploy"]);
} finally {
  if (swapped) {
    rmSync(envLocal, { force: true });
    copyFileSync(backup, envLocal);
    rmSync(backup, { force: true });
    console.log("[deploy] .env.local restored");
  }
}
