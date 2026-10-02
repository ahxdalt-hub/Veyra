/**
 * Shared rate limiter test — REAL Postgres (PGlite), 0025_rate_limits.sql.
 *
 * Verifies the atomic fixed-window counter that backs src/lib/rate-limit.ts:
 *   - limit is enforced exactly (limit N → N allowed takes, then blocked)
 *   - the counter reports the true remaining allowance
 *   - a new window resets the bucket
 *   - one bucket never touches another
 *   - expired windows of a bucket are pruned on take
 *   - invalid parameters are refused, not crash
 *
 * Run: node --test supabase/test/rate.limit.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const run = (sql) => db.exec(sql).then((r) => r[r.length - 1] ?? { rows: [] });
const take = async (bucket, limit, windowSeconds) =>
  (
    await run(
      `select rate_limit_take('${bucket}', ${limit}, ${windowSeconds}) as r`
    )
  ).rows[0].r;

test("0025_rate_limits.sql applies cleanly", async () => {
  // The migration references Supabase's platform roles; PGlite starts
  // without them, so shim the grants' targets first.
  await run(`do $$ begin
    if not exists (select 1 from pg_roles where rolname='anon')
       then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname='authenticated')
       then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname='service_role')
       then create role service_role nologin; end if;
  end $$;`);
  const sql = readFileSync(
    new URL("../migrations/0025_rate_limits.sql", import.meta.url),
    "utf8"
  );
  await run(sql);
  const { rows } = await run(
    `select to_regclass('public.rate_limits') is not null as has_table,
            relrowsecurity as rls_on
       from pg_class where relname='rate_limits'`
  );
  assert.equal(rows[0].has_table, true);
  assert.equal(rows[0].rls_on, true);
});

test("limit is enforced exactly within the window", async () => {
  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(await take("test:exact", 3, 60));
  }
  assert.equal(results[0].allowed, true);
  assert.equal(results[1].allowed, true);
  assert.equal(results[2].allowed, true);
  assert.equal(results[2].remaining, 0);
  assert.equal(results[3].allowed, false);
  assert.equal(results[4].allowed, false);
});

test("a new window resets the bucket", async () => {
  assert.equal((await take("test:reset", 1, 60)).allowed, true);
  assert.equal((await take("test:reset", 1, 60)).allowed, false);
  // Simulate the window rolling over by backdating the stored window.
  await run(
    `update rate_limits set window_start = window_start - interval '10 minutes'
      where bucket='test:reset'`
  );
  const next = await take("test:reset", 1, 60);
  assert.equal(next.allowed, true);
  assert.equal(next.remaining, 0);
});

test("buckets are independent", async () => {
  for (let i = 0; i < 3; i++) await take("test:indep-a", 2, 60);
  const other = await take("test:indep-b", 2, 60);
  assert.equal(other.allowed, true);
  assert.equal(other.remaining, 1);
});

test("expired windows of a bucket are pruned on take", async () => {
  await take("test:prune", 5, 60);
  await run(
    `update rate_limits set window_start = window_start - interval '10 minutes'
      where bucket='test:prune'`
  );
  await take("test:prune", 5, 60);
  const { rows } = await run(
    `select count(*)::int as n from rate_limits where bucket='test:prune'`
  );
  assert.equal(rows[0].n, 1);
});

test("invalid parameters are refused", async () => {
  assert.equal((await take("test:bad", 0, 60)).ok, false);
  assert.equal((await take("test:bad", 3, 0)).ok, false);
  assert.equal((await take("", 3, 60)).ok, false);
  assert.equal((await take("test:bad", 3, 100000)).ok, false);
});
