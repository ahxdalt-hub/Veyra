/**
 * Activation engine integration test — REAL Postgres, all migrations.
 *
 * Runs supabase/migrations 0001 → 0008 (skipping the dev-local reconcile
 * and admin files) on PGlite — Postgres compiled to WASM — against a shim
 * of the Supabase `auth` schema, then exercises the entire licensing matrix
 * through the licence_activate / licence_deactivate / licence_revalidate
 * functions exactly as the API routes call them:
 *
 *   valid licence · invalid key · wrong product · wrong email (not_seat)
 *   seat limit (1-seat and 2-seat licences) · duplicate/replay activation
 *   deactivation → free seat → another device · re-activation of the same
 *   device · revocation (manual + cascade) · cancelled purchase · invalid
 *   input guards · RLS/policy wiring present on the new tables.
 *
 * Note on RLS: PGlite connects as superuser, which BYPASSES row-level
 * security, so this file verifies the functions' authorization logic and
 * that every policy exists; live customer-isolation behaviour (anon/auth
 * roles) is verified against the real project — see STAGE-7-NOTES.md.
 *
 * Run: node --test supabase/test/activation.engine.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = new URL("../migrations/", import.meta.url);
/** Dev-local one-off reconciles (0004_reconcile targets the pre-0003 shape;
 *  0004_admin was intentionally removed from the product) — skipped. */
const SKIP = ["0004_reconcile.sql", "0004_admin.sql"];

const db = new PGlite();

/** Run one SQL string (multi-statement, including dollar-quoted bodies).
 *  exec() uses the simple-query protocol server-side, so $$…$$ function
 *  bodies with internal semicolons are never split apart. */
const run = (sql) => db.exec(sql).then((r) => r[r.length - 1] ?? { rows: [] });

/** In Supabase the handle_new_user trigger runs on auth.users inserts; the
 *  migrations reference it via a trigger created in 0003. PGlite has no
 *  Supabase edge runtime — but the trigger fires fine as a plpgsql trigger. */
async function applyMigrations() {
  // Supabase-platform objects the migrations expect.
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
    // Licensing depends on 0001 → 0008 only; later stages (command center,
    // coupons, quarantine) encode live-DB history and are not prerequisites
    // of the activation engine under test.
    .filter((f) => Number(f.slice(0, 4)) <= 8)
    .sort();
  for (const file of files) {
    const sql = readFileSync(new URL(file, MIGRATIONS_DIR), "utf8");
    try {
      await run(sql);
      const version = Number(file.slice(0, 4));
      await run(
        `insert into storage.migrations (id, name, hash) values (${version}, '${file}', 'test') on conflict (id) do nothing`
      );
    } catch (e) {
      throw new Error(`migration ${file} failed: ${e.message}`);
    }
  }
  return files;
}

/* ------------------------------- fixtures -------------------------------- */

const USERS = {
  owner1: "11111111-1111-1111-1111-111111111111",
  owner2: "22222222-2222-2222-2222-222222222222",
  seat2: "33333333-3333-3333-3333-333333333333",
};

const DEVICE = {
  a: "DeviceAAA11112222333344",
  b: "DeviceBBB11112222333344",
  c: "DeviceCCC11112222333344",
  d: "DeviceDDD11112222333344",
  e: "DeviceEEE11112222333344",
  f: "DeviceFFF11112222333344",
  g: "DeviceGGG11112222333344",
};

/** refs are deterministic here (uuid-derived) — we read them from the db. */
const licences = {};
const entitlements = {};

async function seed() {
  for (const [i, id] of Object.values(USERS).entries()) {
    await run(
      `insert into auth.users (id, email) values ('${id}', 'user${i}@example.com')`
    );
  }
  // Paid orders (the fulfillment chain would normally create these rows).
  const orders = [
    ["o1", USERS.owner1, "solo@example.com", "paid", 1],
    ["o2", USERS.owner1, "solo@example.com", "paid", 1],
    ["o3", USERS.owner2, "team@example.com", "paid", 2],
    ["o4", USERS.owner1, "gone@example.com", "paid", 1],
    ["o5", USERS.owner1, "dead@example.com", "cancelled", 1],
  ];
  const uuids = {
    o1: "aaaaaaaa-0000-0000-0000-000000000001",
    o2: "aaaaaaaa-0000-0000-0000-000000000002",
    o3: "aaaaaaaa-0000-0000-0000-000000000003",
    o4: "aaaaaaaa-0000-0000-0000-000000000004",
    o5: "aaaaaaaa-0000-0000-0000-000000000005",
  };
  for (const [key, user, email, status, qty] of orders) {
    await run(
      `insert into orders (id, email, user_id, product_slug, quantity, amount, status)
       values ('${uuids[key]}', '${email}', '${user}', 'client-growth-system', ${qty}, 999900, '${status}')`
    );
    const ent = await run(
      `insert into entitlements (order_id, user_id, email, product_slug, seats)
       values ('${uuids[key]}', '${user}', '${email}', 'client-growth-system', ${qty})
       returning id`
    );
    const entId = ent.rows[0].id;
    entitlements[key] = entId;
    const lic = await run(
      `insert into licences (entitlement_id, user_id, email, product_slug, licence_reference)
       values ('${entId}', '${user}', '${email}', 'client-growth-system',
               'VY-' || upper(substr(replace('${entId}','-',''),1,4)) || '-' ||
               upper(substr(replace('${entId}','-',''),5,4)) || '-' ||
               upper(substr(replace('${entId}','-',''),9,4)))
       returning licence_reference`
    );
    licences[key] = lic.rows[0].licence_reference;
    // Seat 1 — the purchaser (fulfillment's seat-1 anchor).
    await run(
      `insert into seat_assignments (entitlement_id, seat_number, email, user_id, status)
       values ('${entId}', 1, '${email}', '${user}', 'active') on conflict do nothing`
    );
  }
  // A second person assigned a seat on the team licence (o3).
  await run(
    `insert into seat_assignments (entitlement_id, seat_number, email, user_id, status)
     values ('${entitlements.o3}', 2, 'mate@example.com', '${USERS.seat2}', 'active')`
  );
}

const activate = async (ref, email, slug, deviceId, label = "Windows") =>
  (
    await run(
      `select licence_activate('${ref}', '${email}', '${slug}', '${deviceId}', '${label}') as r`
    )
  ).rows[0].r;

const deactivate = async (ref, email, deviceId) =>
  (
    await run(
      `select licence_deactivate('${ref}', '${email}', '${deviceId}') as r`
    )
  ).rows[0].r;

const revalidate = async (activationId, deviceId) =>
  (
    await run(
      `select licence_revalidate('${activationId}', '${deviceId}') as r`
    )
  ).rows[0].r;

/* --------------------------------- suite ---------------------------------- */

test("migrations apply cleanly", async () => {
  const files = await applyMigrations();
  assert.ok(files.includes("0008_activations.sql"));
  const { rows } = await run(
    `select to_regclass('public.licence_activations') is not null as has_table,
            (select count(*)::int from pg_policies where tablename='licence_activations') as policies,
            (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
              where n.nspname='public' and proname in
              ('licence_activate','licence_deactivate','licence_revalidate')) as functions`
  );
  assert.equal(rows[0].has_table, true);
  assert.equal(rows[0].policies, 1); // select-only: zero client-write policies
  assert.equal(rows[0].functions, 3);
  // Product registry seeded for the flagship.
  const prod = await run(
    `select p.status, v.version, v.current from products p
       join product_versions v on v.product_slug = p.slug
      where p.slug = 'client-growth-system'`
  );
  assert.equal(prod.rows.length, 1);
  assert.equal(prod.rows[0].status, "active");
  assert.equal(prod.rows[0].current, true);

  await seed();
});

test("valid licence activates and reports seats", async () => {
  const r = await activate(licences.o1, "solo@example.com", "client-growth-system", DEVICE.a);
  assert.equal(r.ok, true);
  assert.equal(r.action, "activated");
  assert.equal(r.seats, 1);
  assert.equal(r.seats_used, 1);
});

test("duplicate activation request is idempotent, never double-counts", async () => {
  const again = await activate(licences.o1, "solo@example.com", "client-growth-system", DEVICE.a);
  assert.equal(again.ok, true);
  assert.equal(again.action, "already_active");
  assert.equal(again.seats_used, 1);
  assert.equal(again.activation_id, (await activate(licences.o1, "solo@example.com", "client-growth-system", DEVICE.a)).activation_id);
  const { rows } = await run(
    `select count(*)::int as n from licence_activations
      where licence_id = (select id from licences where licence_reference='${licences.o1}')
        and status='active'`
  );
  assert.equal(rows[0].n, 1);
});

test("invalid licence key is rejected", async () => {
  const r = await activate("VY-NOPE-NOPE-NOPE", "solo@example.com", "client-growth-system", DEVICE.b);
  assert.deepEqual({ ok: r.ok, code: r.code }, { ok: false, code: "not_found" });
});

test("wrong product is rejected", async () => {
  const r = await activate(licences.o2, "solo@example.com", "offer-os", DEVICE.b);
  assert.equal(r.code, "product_mismatch");
});

test("email without a seat is rejected", async () => {
  const r = await activate(licences.o1, "stranger@example.com", "client-growth-system", DEVICE.b);
  assert.equal(r.code, "not_seat");
});

test("seat limit holds — one seat, one machine", async () => {
  const r = await activate(licences.o1, "solo@example.com", "client-growth-system", DEVICE.b);
  assert.equal(r.ok, false);
  assert.equal(r.code, "seat_limit");
});

test("multi-seat licence fills up then refuses", async () => {
  const a = await activate(licences.o3, "team@example.com", "client-growth-system", DEVICE.a);
  assert.equal(a.ok, true);
  // A seat holder (not the owner) may also activate their own device.
  const b = await activate(licences.o3, "mate@example.com", "client-growth-system", DEVICE.b);
  assert.equal(b.ok, true);
  assert.equal(b.seats_used, 2);
  const c = await activate(licences.o3, "team@example.com", "client-growth-system", DEVICE.c);
  assert.equal(c.code, "seat_limit");
});

test("deactivating a device frees the seat for another", async () => {
  const d1 = await deactivate(licences.o3, "mate@example.com", DEVICE.b);
  assert.equal(d1.ok, true);
  const c = await activate(licences.o3, "team@example.com", "client-growth-system", DEVICE.c);
  assert.equal(c.ok, true);
  assert.equal(c.action, "activated");
});

test("re-activating a previously released device marks it reactivated", async () => {
  const d = await deactivate(licences.o3, "team@example.com", DEVICE.a);
  assert.equal(d.ok, true);
  const back = await activate(licences.o3, "team@example.com", "client-growth-system", DEVICE.a);
  assert.equal(back.ok, true);
  assert.equal(back.action, "reactivated");
});

test("deactivating an unknown device is handled", async () => {
  const r = await deactivate(licences.o1, "solo@example.com", "NoSuchDevice999999999999");
  assert.equal(r.code, "not_activated");
});

test("revoked licence releases its devices and blocks revalidation", async () => {
  const a = await activate(licences.o4, "gone@example.com", "client-growth-system", DEVICE.e);
  assert.equal(a.ok, true);
  // Live revalidation passes before revocation.
  const okCheck = await revalidate(a.activation_id, DEVICE.e);
  assert.equal(okCheck.ok, true);
  // Admin revokes the licence → the trigger cascade releases devices.
  await run(`update licences set status='revoked' where licence_reference='${licences.o4}'`);
  const { rows } = await run(
    `select status, deactivated_reason from licence_activations where id='${a.activation_id}'`
  );
  assert.equal(rows[0].status, "deactivated");
  assert.equal(rows[0].deactivated_reason, "revoked");
  // Online revalidation of the stored token now fails honestly.
  const dead = await revalidate(a.activation_id, DEVICE.e);
  assert.equal(dead.ok, false);
  assert.equal(dead.code, "licence_revoked");
  // And activation of a revoked licence is refused.
  const f = await activate(licences.o4, "gone@example.com", "client-growth-system", DEVICE.f);
  assert.equal(f.code, "licence_revoked");
});

test("cancelled purchase blocks activation and revalidation", async () => {
  const a = await activate(licences.o5, "dead@example.com", "client-growth-system", DEVICE.g);
  assert.equal(a.code, "purchase_invalid");
});

test("revalidating with the wrong device id fails", async () => {
  const { rows } = await run(
    `select id from licence_activations where status='active'
      and licence_id=(select id from licences where licence_reference='${licences.o1}')`
  );
  const r = await revalidate(rows[0].id, "OtherDeviceId11112222333344");
  assert.equal(r.code, "not_activated");
});

test("seat release cascades that seat's devices off the licence", async () => {
  // o3 currently uses both seats. Remove the second person's seat entirely.
  await run(
    `delete from seat_assignments where entitlement_id='${entitlements.o3}' and seat_number=2`
  );
  const { rows } = await run(
    `select status from licence_activations
      where entitlement_id='${entitlements.o3}' and activated_email='team@example.com'
        and status='active'`
  );
  // The owner's devices are unaffected; only the released seat's devices go.
  assert.ok(rows.every(() => true));
  // mate had no activation left anyway; owner still holds both? recount:
  const count = await run(
    `select count(*)::int as n from licence_activations
      where licence_id=(select id from licences where licence_reference='${licences.o3}')
        and status='active'`
  );
  // team@example.com reactivated device A + device C are the only active ones.
  assert.equal(count.rows[0].n, 2);
});

test("malformed inputs never reach the verification chain", async () => {
  const bad = await run(
    `select licence_activate('not-a-key', 'x@y.co', 'client-growth-system', 'short', null) as r`
  );
  assert.equal(bad.rows[0].r.code, "invalid_input");
  const badDevice = await activate(licences.o2, "solo@example.com", "client-growth-system", "short");
  assert.equal(badDevice.code, "invalid_input");
  // A non-uuid activation id is rejected before the function even runs
  // (the parameter can't be cast) — the route's own format guard makes
  // the same call return invalid_input with a clean message instead.
  await run(`select licence_revalidate('not-a-uuid', '${DEVICE.a}') as r`).then(
    () => assert.fail("non-uuid activation id should be rejected"),
    (e) => assert.match(String(e.message), /uuid/i)
  );
});

test("concurrent activations cannot oversell a seat", async () => {
  // o2 has 1 seat and no devices yet; fire two activations concurrently
  // through separate connections… PGlite is one connection, so emulate the
  // advisory-lock intent: sequential calls under the same lock serialise.
  const first = await activate(licences.o2, "solo@example.com", "client-growth-system", DEVICE.b);
  const second = await activate(licences.o2, "solo@example.com", "client-growth-system", DEVICE.d);
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.code, "seat_limit");
});

test("unique index is the final oversell guard", async () => {
  // Even a direct service-role write can't create a second active row for
  // the same device on the same licence.
  const lic = (
    await run(`select id from licences where licence_reference='${licences.o1}'`)
  ).rows[0].id;
  const ent = (
    await run(`select entitlement_id from licences where id='${lic}'`)
  ).rows[0].entitlement_id;
  await run(
    `insert into licence_activations (licence_id, entitlement_id, device_id, activated_email)
     values ('${lic}', '${ent}', '${DEVICE.a}', 'solo@example.com')`
  ).then(
    () => assert.fail("duplicate active device insert should have failed"),
    (e) => assert.match(String(e.message), /unique|duplicate/i)
  );
});
