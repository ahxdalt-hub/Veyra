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

/* Snapshotted before the swap below, because the build runs while
 * .env.local is temporarily public-only — see localValue(). */
const rawEnvLocal = existsSync(envLocal) ? readFileSync(envLocal, "utf8") : "";

function publicLines() {
  if (!existsSync(envLocal)) return "";
  return readFileSync(envLocal, "utf8")
    .split(/\r?\n/)
    .filter((line) => new RegExp(`^\\s*${PUBLIC_PREFIX}[A-Za-z0-9_]+=`).test(line))
    .join("\n");
}

/** The real value of a NON-SECRET variable in .env.local, or null. The build
 *  needs the actual mode: `dodoMode()` renders the mode banner, and a
 *  placeholder would bake the wrong one into a static route. Never call this
 *  for a name in FORBIDDEN. */
function localValue(name) {
  const line = rawEnvLocal
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  const value = line ? line.slice(name.length + 1).trim() : "";
  return value ? value : null;
}

/** Keys that must never appear in the uploaded artifact. */
const FORBIDDEN = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "DODO_PAYMENTS_API_KEY",
  "DODO_PAYMENTS_WEBHOOK_KEY",
  "RESEND_API_KEY",
  "VEYRA_LICENCE_SIGNING_KEY",
  "VEYRA_ADMIN_PASSWORD",
  "VEYRA_ADMIN_PIN",
  "VEYRA_ADMIN_SESSION_SECRET",
  "PARTNER_WEBHOOK_SECRET",
];

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    ...(env ? { env } : {}),
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
}

/**
 * The build must see the same variable SHAPE as the Worker, or `next build`
 * misclassifies routes. Stripping server-only vars is what did the damage:
 * with `SUPABASE_SERVICE_ROLE_KEY` absent, `adminAuthConfigured()` is false
 * during the build, so `/admin/sign-in` took its early `redirect()` before
 * ever touching `cookies()` — and Next baked it as a STATIC route. At runtime
 * the secret is present, the code reaches `cookies()`, and every anonymous
 * hit on the admin door was a 500 ("Page changed from static to dynamic").
 * `/account/sign-in`, `/account/sign-up`, `/account/forgot-password`,
 * `/account/reset-password` and `/checkout/complete` were baked the same way.
 *
 * So the names are restored with an unmistakable placeholder VALUE. Nothing
 * secret is in play, and the leak check below still runs against the built
 * artifact — if any of these names ever gets inlined anyway, the deploy
 * aborts rather than shipping it.
 */
const BUILD_PLACEHOLDER = "deploy-build-placeholder-not-a-secret";

/** Non-secret Dodo names the build must still SEE, for the same static-bake
 *  reason as above: `dodoConfigured()` and `dodoMode()` are read by server
 *  components (/checkout, /checkout/complete, /admin/settings), so a route
 *  that renders differently with them absent gets baked wrong. */
const BUILD_SHAPE = [
  "DODO_PAYMENTS_ENVIRONMENT",
  "DODO_PAYMENTS_PRODUCT_ID_CLIENT_GROWTH_SYSTEM",
];

function buildEnv() {
  const env = { ...process.env };
  for (const name of FORBIDDEN) env[name] = BUILD_PLACEHOLDER;
  for (const name of BUILD_SHAPE) env[name] = localValue(name) ?? BUILD_PLACEHOLDER;
  return env;
}

let swapped = false;
/** In-memory safety copy — the on-disk backup alone proved destructible
 *  (one run lost `.env.local.deploy-backup` mid-build and the restore
 *  failed with it gone). Contents in this process can't be deleted by the
 *  build, so the finally block can always put the file back. */
let envOriginal = null;
try {
  const publicOnly = publicLines();
  if (existsSync(envLocal)) {
    envOriginal = readFileSync(envLocal, "utf8");
    copyFileSync(envLocal, backup);
    rmSync(envLocal);
    swapped = true;
  }
  if (publicOnly) writeFileSync(envLocal, `${publicOnly}\n`);

  run("npx", ["opennextjs-cloudflare", "build"], buildEnv());

  if (!existsSync(bundleEnv)) throw new Error(`${bundleEnv} missing after build — refusing to deploy blind`);
  const built = readFileSync(bundleEnv, "utf8");
  const leaked = FORBIDDEN.filter((key) => built.includes(`"${key}"`));
  if (leaked.length > 0) {
    throw new Error(`build inlined server-only variables: ${leaked.join(", ")} — deploy aborted`);
  }
  console.log(`[deploy] artifact carries ${FORBIDDEN.length} server-only keys: none inlined`);

  // A deploy is a live-money action, so refuse on an incoherent payment
  // config rather than shipping it: the mode and the API key are mode-scoped,
  // and the paid product must map to a Dodo product id.
  const mode = (localValue("DODO_PAYMENTS_ENVIRONMENT") ?? "").toLowerCase();
  const apiKey = localValue("DODO_PAYMENTS_API_KEY") ?? "";
  const productId = localValue("DODO_PAYMENTS_PRODUCT_ID_CLIENT_GROWTH_SYSTEM") ?? "";
  if (apiKey) {
    if (mode !== "live_mode" && mode !== "test_mode") {
      throw new Error(
        `DODO_PAYMENTS_API_KEY is set but DODO_PAYMENTS_ENVIRONMENT is "${mode || "unset"}" — ` +
          `must be live_mode or test_mode. Keys are mode-scoped; a mismatch 401s at checkout.`
      );
    }
    if (mode === "live_mode" && !productId) {
      throw new Error(
        "DODO_PAYMENTS_ENVIRONMENT=live_mode but no product id is configured — " +
          "checkout would fail closed. Set DODO_PAYMENTS_PRODUCT_ID_CLIENT_GROWTH_SYSTEM."
      );
    }
    console.log(`[deploy] payment config: ${mode}, api key bound (${apiKey.length} chars), product ${productId || "NOT SET"}`);
  } else {
    console.log("[deploy] no DODO_PAYMENTS_API_KEY locally — checkout will refuse until the Worker secret is bound");
  }

  run("npx", ["opennextjs-cloudflare", "deploy"]);
} finally {
  if (swapped) {
    rmSync(envLocal, { force: true });
    if (existsSync(backup)) {
      rmSync(backup, { force: true });
    }
    // The backup file may not have survived the build; the in-memory copy
    // always has. Write bytes, not a file copy, so there is no second
    // dependency to fail on.
    writeFileSync(envLocal, envOriginal);
    console.log("[deploy] .env.local restored");
  }
}
