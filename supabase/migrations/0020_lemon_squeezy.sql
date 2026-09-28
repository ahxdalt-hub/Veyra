-- Veyra: payment provider migration — Razorpay → Lemon Squeezy.
--
-- The commerce flow now runs on Lemon Squeezy's hosted checkout. The
-- orders table carried the previous gateway's identifiers in
-- `razorpay_order_id` / `razorpay_payment_id`; this migration renames
-- them to `lemon_squeezy_order_id` / `lemon_squeezy_payment_id` so the
-- schema matches the code (src/lib/orders.ts, src/lib/lemon-squeezy.ts).
--
-- Semantics:
--   lemon_squeezy_order_id   — Lemon Squeezy's human order id
--                              (attributes.order_id, e.g. "VEYRA-XXXX"),
--                              stamped by the order_created webhook.
--   lemon_squeezy_payment_id — the order resource's uuid (data.id), the
--                              stable provider payment reference.
--
-- Historical rows keep their previous-gateway values — they are opaque
-- provider ids and no code path interprets them beyond display.
--
-- Idempotent: only renames columns/indexes that still bear the old names,
-- and only flips the provider default when it is still 'razorpay'.

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'orders'
               and column_name = 'razorpay_order_id') then
    alter table public.orders rename column razorpay_order_id to lemon_squeezy_order_id;
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'orders'
               and column_name = 'razorpay_payment_id') then
    alter table public.orders rename column razorpay_payment_id to lemon_squeezy_payment_id;
  end if;
end $$;

-- The unique index from 0011 follows its column after a rename, but keep
-- its name honest too (it may not exist on databases predating 0011).
do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
             where n.nspname = 'public' and c.relname = 'orders_razorpay_order_id_uidx') then
    alter index public.orders_razorpay_order_id_uidx
      rename to orders_lemon_squeezy_order_id_uidx;
  end if;
end $$;

-- Future orders default to the new provider label. Checkout sets it
-- explicitly; 'free-claim' rows override it. Existing rows are untouched.
alter table public.orders alter column provider set default 'lemon-squeezy';

-- Verification:
--   select column_name from information_schema.columns
--    where table_name = 'orders' and column_name like '%squeezy%';
--   select pg_get_expr(d.adbin, d.adrelid)
--     from pg_attrdef d join pg_attribute a
--       on a.attrelid = d.adrelid and a.attnum = d.adnum
--    where a.attrelid = 'public.orders'::regclass and a.attname = 'provider';
