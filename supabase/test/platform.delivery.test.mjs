/**
 * Platform delivery integration test (0021) — REAL Postgres, all migrations.
 *
 * Same harness as activation.engine.test.mjs (PGlite — Postgres in WASM —
 * with the Supabase auth/storage shim), extended past 0008 to the delivery
 * migrations (0016 release metadata, 0021 platform column). It proves the
 * registry semantics macOS support depends on:
 *
 *   existing Windows rows keep platform='windows' + stay current (zero
 *   migration fallout) · the same version may exist once per platform ·
 *   per-platform current-release lookup (the exact shape /api/download
 *   authorizes against) · promoting a Mac build never demotes Windows ·
 *   withdrawing Mac never stops Windows · at most one current row per
 *   (product, platform) · the check constraint refuses unknown platforms.
 *
 * Run: node --test supabase/test/platform.delivery.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url);
const SKIP = ["0004_reconcile.sql", "0004_admin.sql"];
/** Files after 0008 that this test actually needs (0012+ admin/coupon
 *  history is not a prerequisite of the delivery registry). */
const EXTRA = new Set(["0016_delivery_automation.sql", "0021_platform_delivery.sql"]);

const db = new PGlite();
const run = (sql) => db.exec(sql).then((r) => r[r.length - 1] ?? { rows: [] });

async function applyMigrations() {
  await run(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb default '{}'::jsonb
    );
    create or replace function auth.uid() returns uuid
    language sql stable as $$
      select coalesce(
        nullif(current_setting('test.auth_uid', true), ''),
        '00000000-0000-0000-0000-000000000000'
      )::uuid;
    $$;
    create schema if not exists storage;
    create table if not exists storage.migrations (
      id integer primary key, name text not null,
      hash text not null, inserted_at timestamp default now(),
      updated_at timestamp default now()
    );
    do $$ begin create role anon nologin noinherit; exception when duplicate_object then null; end $$;
    do $$ begin create role authenticated nologin noinherit; exception when duplicate_object then null; end $$;
    do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && !SKIP.includes(f))
    .filter((f) => Number(f.slice(0, 4)) <= 8 || EXTRA.has(f))
    .sort();
  for (const file of files) {
    await run(readFileSync(new URL(file, MIGRATIONS_DIR), "utf8"));
  }
  return files;
}

test("0021 applies on top of the full delivery migration chain", async () => {
  const files = await applyMigrations();
  assert.ok(files.includes("0021_platform_delivery.sql"));
  const { rows } = await run(`
    select column_name, column_default from information_schema.columns
     where table_schema='public' and table_name='product_versions' and column_name='platform'
  `);
  assert.equal(rows.length, 1);
  assert.match(rows[0].column_default, /'windows'/);
});

test("pre-existing Windows release is untouched by the migration", async () => {
  const { rows } = await run(`
    select version, platform, current, release_status, artifact_key
      from product_versions where product_slug='client-growth-system'
  `);
  // 0008 seeds exactly one flagship version; 0021 must have defaulted it.
  assert.equal(rows.length, 1);
  assert.equal(rows[0].platform, "windows");
  assert.equal(rows[0].current, true);
  assert.equal(rows[0].release_status, "published");
  assert.match(rows[0].artifact_key, /\.zip$|\.exe$/); // 0016 backfill key
});

test("the same version may ship once per platform (0021 uniqueness)", async () => {
  // The seeded Windows release is v1.0 — insert the SAME version for Mac.
  await run(`
    insert into product_versions (product_slug, version, platform, current, release_status, artifact_key, published_at)
    values ('client-growth-system', '1.0', 'macos', true, 'published',
            'client-growth-system/1.0/macos/installer.dmg', now())
    on conflict (product_slug, version, platform) do update set current = true
  `);
  const { rows } = await run(`
    select platform, artifact_key from product_versions
     where product_slug='client-growth-system' and version='1.0' and current and release_status='published'
       and artifact_key is not null
     order by platform
  `);
  assert.deepEqual(
    rows.map((r) => r.platform),
    ["macos", "windows"]
  );
  assert.equal(
    rows.find((r) => r.platform === "macos").artifact_key,
    "client-growth-system/1.0/macos/installer.dmg"
  );
  assert.match(rows.find((r) => r.platform === "windows").artifact_key, /^client-growth-system\/1\.0\//);
});

test("per-platform current-release lookup (the /api/download authorization shape)", async () => {
  // Exactly the query registry.currentRelease() runs, per platform.
  const query = (platform) => run(`
    select version, artifact_key, platform from product_versions
     where product_slug='client-growth-system' and platform='${platform}'
       and current and release_status='published' and artifact_key is not null
  `);
  const win = await query("windows");
  const mac = await query("macos");
  assert.equal(win.rows.length, 1);
  assert.equal(win.rows[0].platform, "windows");
  assert.equal(mac.rows.length, 1);
  assert.equal(mac.rows[0].artifact_key, "client-growth-system/1.0/macos/installer.dmg");
});

test("publishing a newer Mac build never demotes the Windows release", async () => {
  // scripts/publish-version.mjs --platform macos semantics: demote current
  // macos rows (this platform ONLY), then promote the new one.
  await run(`
    update product_versions set current=false
     where product_slug='client-growth-system' and platform='macos' and version <> '1.1.0' and current
  `);
  await run(`
    insert into product_versions (product_slug, version, platform, current, release_status, artifact_key)
    values ('client-growth-system', '1.1.0', 'macos', true, 'published',
            'client-growth-system/1.1.0/macos/installer.dmg')
    on conflict (product_slug, version, platform) do update
      set current=true, release_status='published', artifact_key=excluded.artifact_key
  `);
  const { rows } = await run(`
    select platform, version from product_versions
     where product_slug='client-growth-system' and current and release_status='published'
     order by platform
  `);
  assert.deepEqual(rows, [
    { platform: "macos", version: "1.1.0" },
    { platform: "windows", version: "1.0" },
  ]);
});

test("withdrawing the Mac build never stops Windows delivery", async () => {
  await run(`
    update product_versions set release_status='withdrawn', current=false
     where product_slug='client-growth-system' and version='1.1.0' and platform='macos'
  `);
  const { rows } = await run(`
    select platform, release_status from product_versions
     where product_slug='client-growth-system' and current
     order by platform
  `);
  assert.deepEqual(rows, [{ platform: "windows", release_status: "published" }]);
});

test("at most one current release per product AND platform", async () => {
  await assert.rejects(
    () => run(`
      insert into product_versions (product_slug, version, platform, current, release_status, artifact_key)
      values ('client-growth-system', '9.9.9', 'windows', true, 'published', 'x/y/installer.exe')
    `),
    (err) => /product_versions_current_idx/.test(err.message ?? "")
  );
});

test("unknown platforms are refused by the check constraint", async () => {
  await assert.rejects(
    () => run(`
      insert into product_versions (product_slug, version, platform, current, release_status, artifact_key)
      values ('client-growth-system', '8.8.8', 'linux', false, 'draft', null)
    `),
    (err) => /platform/.test(err.message ?? "")
  );
});
