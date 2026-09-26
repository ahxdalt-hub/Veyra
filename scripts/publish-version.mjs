#!/usr/bin/env node
/**
 * Stage 8 — release publisher.
 *
 * Uploads a built installer to the PRIVATE delivery bucket and publishes
 * the release into the server-side product registry (product_versions,
 * 0008+0016) in the right order: artifact first, registry pointer second.
 * A half-run can therefore only ever mean "file present, not yet served"
 * — never "registry points at a missing file".
 *
 * Usage:
 *   node scripts/publish-version.mjs \
 *     --file "../Veyra Client Growth System/src-tauri/target/release/bundle/nsis/Client Growth System_1.0.0_x64-setup.exe" \
 *     --slug client-growth-system --version 1.0.0 --notes "First public release"
 *
 *   --withdraw  client-growth-system@1.0.0   (stop serving, keep the file)
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

async function main() {
  if (args[0] === "--withdraw") {
    return withdraw(args[1]);
  }

  const file = arg("file");
  const slug = arg("slug");
  const version = arg("version");
  const notes = arg("notes") || null;
  if (!file || !slug || !version) {
    console.error("usage: --file <installer> --slug <product> --version <x.y[.z]> [--notes text]  |  --withdraw <slug@version>");
    process.exit(2);
  }
  if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
    console.error("version must look like 1.0 or 1.0.0");
    process.exit(2);
  }
  const bytes = readFileSync(file);
  const ext = (file.match(/\.[A-Za-z0-9]+$/)?.[0] || ".bin").toLowerCase();
  const objectKey = `${slug}/${version}/installer${ext}`;

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

  // 2. Publish into the registry: demote the old current first (the
  //    partial unique index forbids two current rows, and merge-duplicates
  //    must target the (product_slug, version) key), then upsert the new
  //    release as current + published. The gap between demote and promote
  //    is milliseconds — downloads in that instant honestly return
  //    not_published, never a stale artifact.
  const demote = await fetch(
    `${URL_BASE}/rest/v1/product_versions?product_slug=eq.${slug}&version=neq.${version}&current=eq.true`,
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
    `${URL_BASE}/rest/v1/product_versions?on_conflict=product_slug,version`,
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
  console.log(`✓ ${slug} v${version} is now the published download release`);
}

/** Stop serving a release (e.g. bad build) without deleting the artifact. */
async function withdraw(target) {
  const [slug, version] = (target || "").split("@");
  if (!slug || !version) {
    console.error("usage: --withdraw <slug>@<version>");
    process.exit(2);
  }
  const res = await fetch(
    `${URL_BASE}/rest/v1/product_versions?product_slug=eq.${slug}&version=eq.${version}`,
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
