-- Veyra — Stage 08b: the coupons base table (canonical reconstruction).
--
-- HISTORY: coupons was created by an early uncommitted migration (the
-- numbering gap at 0009 — 0013's header still says "apply after 0008 and
-- 0009"). The file was lost; the table has been live ever since. 0011 and
-- 0013 extend it in place ("extend, don't duplicate") and so pre-suppose
-- this base exists. This file restores the base so a fresh database can
-- run 0001 → 0025 in order without failing at 0011.
--
-- The column set mirrors the live table's base columns exactly (the
-- max_uses/per_customer_limit/used_count/created_at/updated_at columns
-- and the extra checks are added by 0011/0013). Inline constraint names
-- (coupons_pkey, coupons_kind_check, coupons_value_check) match the live
-- database, so 0011/0013's guarded re-adds no-op either way.
--
-- Idempotent: create-if-not-exists; safe on the live database (no-op).

create table if not exists public.coupons (
  code         text primary key,
  label        text not null,
  kind         text not null default 'percent' check (kind in ('percent','fixed')),
  value        integer not null check (value > 0),
  active       boolean not null default true,
  starts_at    date,
  ends_at      date,
  min_subtotal integer
);

-- Verification:
--   select to_regclass('public.coupons');   -- set
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='coupons'
--    order by ordinal_position;             -- 8 base columns
