#!/usr/bin/env node
/**
 * Stage 8 — release publisher. (0021: per-platform releases.)
 *
 * Uploads a built installer to the PRIVATE delivery bucket and publishes
 * the release into the server-side product registry (product_versions,
 * 0008+0016+0021) in the right order: artifact first, registry pointer
 * second. A half-run can therefore only ever mean "file present, not yet
 * served" — never "registry points at a missing file".
 *
 * Each platform (windows | macos) keeps its OWN current release:
 * publishing a new Mac .dmg never demotes the Windows .exe and vice
 * versa. Windows defaults keep the pre-0021 invocation byte-identical.
 *
 * Usage:
 *   node scripts/publish-version.mjs \
 *     --file "../Veyra Client Growth System/src-tauri/target/release/bundle/nsis/Client Growth System_1.0.0_x64-setup.exe" \
 *     --slug client-growth-system --version 1.0.0 --notes "First public release"
 *
 *   node scripts/publish-version.mjs \
 *     --file "../Veyra Client Growth System/release/Client-Growth-System-Setup-universal.dmg" \
 *     --slug client-growth-system --version 1.0.0 --platform macos --notes "Mac release"
 *
 *   --withdraw  client-growth-system@1.0.0        (both platforms)
 *   --withdraw  client-growth-system@1.0.0@macos  (one platform only)
 *
 * Credentials: reads Veyra/.env.local (service role + URL). The bucket is
 * created private if missing. NEVER run this from CI with committed keys —
 * it is an operator tool.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/* ---- env ---------------------------------------------------------- */
function loadEnv() {
  const envPath = join(here, "..", ".env.local");
  const env = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  }
  return { ...env, ...process.env };
}
const ENV = loadEnv();
const URL_BASE = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = ENV.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = ENV.SUPABASE_DELIVERY_BUCKET || "veyra-delivery";
if (!URL_BASE || !SERVICE) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(2);
}
const H = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
};

/* ---- args --------------------------------------------------------- */
const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const PLATFORMS = ["windows", "macos"];
// The extension each platform's artifact is expected to carry.
const EXPECTED_EXT = { windows: ".exe", macos: ".dmg" };

async function main() {
  if (args[0] === "--withdraw") {
    return withdraw(args[1]);
  }

  const file = arg("file");
  const slug = arg("slug");
  const version = arg("version");
  const notes = arg("notes") || null;
  const platform = arg("platform") || "windows";
  if (!file || !slug || !version) {
    console.error("usage: --file <installer> --slug <product> --version <x.y[.z]> [--platform windows|macos] [--notes text]  |  --withdraw <slug@version[@platform]>");
    process.exit(2);
  }
  if (!PLATFORMS.includes(platform)) {
    console.error(`--platform must be one of: ${PLATFORMS.join(", ")}`);
    process.exit(2);
  }
  if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
    console.error("version must look like 1.0 or 1.0.0");
    process.exit(2);
  }
  const bytes = readFileSync(file);
  const ext = (file.match(/\.[A-Za-z0-9]+$/)?.[0] || ".bin").toLowerCase();
  if (ext !== EXPECTED_EXT[platform] && !args.includes("--force")) {
    console.error(
      `--platform ${platform} expects a ${EXPECTED_EXT[platform]} artifact, got "${ext}" — refusing to serve the wrong build type. (Override with --force.)`
    );
    process.exit(2);
  }
  // Windows keeps the pre-0021 key layout exactly; macos artifacts get
  // their own path segment so the two installers never collide.
  const platformDir = platform === "windows" ? "" : `${platform}/`;
  const objectKey = `${slug}/${version}/${platformDir}installer${ext}`;

  await ensureBucket();

  // 1. Upload the artifact first.
  const up = await fetch(
    `${URL_BASE}/storage/v1/object/${BUCKET}/${objectKey}`,
    {
      method: "POST",
      headers: { ...H, "Content-Type": "application/octet-stream", "x-upsert": "true" },
      body: bytes,
      cache: "no-store",
    }
  );
  if (!up.ok) {
    console.error(`upload failed (${up.status}):`, await up.text());
    process.exit(1);
  }
  console.log(`✓ uploaded ${(bytes.length / 1024 / 1024).toFixed(1)} MB → ${BUCKET}/${objectKey}`);

  // 2. Publish into the registry: demote the old current FIRST — only on
  //    this platform, so promoting a Mac build never disturbs the live
  //    Windows delivery (the partial unique index now forbids two current
  //    rows per product+platform, and merge-duplicates must target the
  //    (product_slug, version, platform) key). The gap between demote and
  //    promote is milliseconds — downloads in that instant honestly return
  //    not_published, never a stale artifact.
  const demote = await fetch(
    `${URL_BASE}/rest/v1/product_versions?product_slug=eq.${slug}&platform=eq.${platform}&version=neq.${version}&current=eq.true`,
    {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ current: false }),
      cache: "no-store",
    }
  );
  if (!demote.ok) {
    console.error(`demote old versions failed (${demote.status}):`, await demote.text());
    process.exit(1);
  }
  const ins = await fetch(
    `${URL_BASE}/rest/v1/product_versions?on_conflict=product_slug,version,platform`,
    {
      method: "POST",
      headers: {
        ...H,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        product_slug: slug,
        version,
        platform,
        notes,
        current: true,
        release_status: "published",
        artifact_key: objectKey,
        published_at: new Date().toISOString(),
      }),
      cache: "no-store",
    }
  );
  if (!ins.ok) {
    console.error(`registry upsert failed (${ins.status}):`, await ins.text());
    process.exit(1);
  }
  console.log(`✓ ${slug} v${version} (${platform}) is now the published download release`);
}

/** Stop serving a release (e.g. bad build) without deleting the artifact.
 *  `<slug>@<version>` withdraws every platform's row for that version;
 *  `<slug>@<version>@<platform>` targets one build only. */
async function withdraw(target) {
  const parts = (target || "").split("@");
  const [slug, version, platform] = parts;
  if (parts.length > 3 || (parts.length === 3 && !PLATFORMS.includes(platform))) {
    console.error("usage: --withdraw <slug>@<version>[@windows|macos]");
    process.exit(2);
  }
  if (!slug || !version) {
    console.error("usage: --withdraw <slug>@<version>[@platform]");
    process.exit(2);
  }
  const filter = platform ? `&platform=eq.${platform}` : "";
  const res = await fetch(
    `${URL_BASE}/rest/v1/product_versions?product_slug=eq.${slug}&version=eq.${version}${filter}`,
    {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ release_status: "withdrawn", current: false }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    console.error(`withdraw failed (${res.status}):`, await res.text());
    process.exit(1);
  }
  console.log(`✓ ${slug}@${version} withdrawn — downloads now refuse it`);
}

/** The delivery bucket must exist and be private. */
async function ensureBucket() {
  const list = await fetch(`${URL_BASE}/storage/v1/bucket/${BUCKET}`, {
    headers: H,
    cache: "no-store",
  });
  if (list.ok) return;
  const create = await fetch(`${URL_BASE}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: 0, allowed_mime_types: null }),
    cache: "no-store",
  });
  if (!create.ok) {
    console.error(`bucket create failed (${create.status}):`, await create.text());
    process.exit(1);
  }
  console.log(`✓ created private bucket '${BUCKET}'`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
