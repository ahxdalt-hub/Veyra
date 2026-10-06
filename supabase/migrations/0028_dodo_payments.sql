-- Veyra: payment provider migration — Razorpay / Lemon Squeezy → Dodo Payments.
--
-- Both legacy processors are gone from the code (src/lib/dodo-payments.ts is
-- now the only integration). Their identifier columns stayed behind, so this
-- file consolidates provider references into the two processor-agnostic
-- columns the schema has carried since the Stripe era (0010):
--
--   provider_session_id  — the processor's checkout reference. Dodo's session
--                          id (`cks_…`), written at checkout creation.
--   provider_payment_id  — the processor's confirmed payment id (`pay_…`),
--                          written by the payment.succeeded webhook and the
--                          handle a refund is issued against.
--
-- This is the third rename in this table's history (0020 renamed
-- razorpay_* → lemon_squeezy_*, 0022 re-added razorpay_*), which is exactly
-- why the destination columns are named for the ROLE rather than the vendor:
-- a provider switch should never need another migration.
--
-- DATA: history is backfilled, not discarded. Rows paid through Razorpay or
-- Lemon Squeezy keep their reference (and their `provider` label, so the
-- admin still says which processor took the money) in the new columns before
-- the old ones are dropped. Backfill skips a reference that more than one row
-- shares, because provider_session_id is unique — colliding would abort the
-- migration for the sake of a display value.
--
-- Idempotent: every step is guarded on existence, so it is safe to re-run,
-- and a fresh database built from 0001..0027 converges on the same shape.
--
-- Verify BEFORE applying (live database, 2026-10-05): 4 orders, all
-- `pending`, all provider 'razorpay' with razorpay_order_id set and every
-- payment id null — i.e. nothing has ever been paid, so no fulfillment or
-- partner credit depends on the columns being dropped.

-- ---------------------------------------------------------------------------
-- 1. Backfill the provider-agnostic columns
-- ---------------------------------------------------------------------------

-- Session/checkout reference: Lemon Squeezy's order id takes precedence over
-- Razorpay's (0020 renamed the live column, so it holds the most recent era).
update public.orders o
   set provider_session_id = v.ref
  from (
          select coalesce(o2.lemon_squeezy_order_id, o2.razorpay_order_id) as ref,
                 o2.id
            from public.orders o2
           where o2.provider_session_id is null
             and coalesce(o2.lemon_squeezy_order_id, o2.razorpay_order_id) is not null
       ) v
 where v.id = o.id
   -- Unique across the table, so the unique index cannot reject the write.
   and not exists (
         select 1
           from public.orders o3
          where coalesce(o3.lemon_squeezy_order_id, o3.razorpay_order_id) = v.ref
            and o3.id <> o.id
       );

-- Payment reference.
update public.orders o
   set provider_payment_id = v.ref
  from (
          select coalesce(o2.lemon_squeezy_payment_id, o2.razorpay_payment_id) as ref,
                 o2.id
            from public.orders o2
           where o2.provider_payment_id is null
             and coalesce(o2.lemon_squeezy_payment_id, o2.razorpay_payment_id) is not null
       ) v
 where v.id = o.id;

-- ---------------------------------------------------------------------------
-- 2. Drop the vendor-named columns (and the indexes that hang off them)
-- ---------------------------------------------------------------------------

drop index if exists orders_lemon_squeezy_order_id_uidx;
-- Created for the Razorpay column, then dragged through the 0020 rename:
-- it actually indexes lemon_squeezy_order_id.
drop index if exists idx_orders_razorpay_order_id;
drop index if exists orders_razorpay_order_id_uidx;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'orders'
                and column_name = 'lemon_squeezy_order_id') then
    alter table public.orders drop column lemon_squeezy_order_id;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'orders'
                and column_name = 'lemon_squeezy_payment_id') then
    alter table public.orders drop column lemon_squeezy_payment_id;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'orders'
                and column_name = 'razorpay_order_id') then
    alter table public.orders drop column razorpay_order_id;
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'orders'
                and column_name = 'razorpay_payment_id') then
    alter table public.orders drop column razorpay_payment_id;
  end if;
  -- The Razorpay modal's callback signature. Dodo's hosted checkout has no
  -- browser-side callback at all, so there is nothing to replace it with.
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'orders'
                and column_name = 'razorpay_signature') then
    alter table public.orders drop column razorpay_signature;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Default provider label for rows written without an explicit value
-- ---------------------------------------------------------------------------
-- Checkout and the claim/free-grant paths set `provider` explicitly; this
-- default only backstops a raw insert. Guarded so an intentional value
-- (e.g. a local database still on 'lemon-squeezy') isn't silently rewritten
-- by a re-run.
do $$
begin
  if exists (select 1 from pg_attrdef d
              join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
             where a.attrelid = 'public.orders'::regclass
               and a.attname = 'provider'
               and pg_get_expr(d.adbin, d.adrelid) in ('''lemon-squeezy''::text', '''razorpay''::text')) then
    alter table public.orders alter column provider set default 'dodo';
  end if;
end $$;

comment on column public.orders.provider is
  'The processor that took (or would have taken) the money: ''dodo'', ''free-claim'', ''manual-grant'', or a pre-switch ''razorpay'' / ''lemon-squeezy''. Informational — refunds always go back through whatever actually charged the order.';
comment on column public.orders.provider_session_id is
  'Dodo checkout session id (cks_…), stamped when checkout creates the hosted session. Pre-Dodo rows carry their former Razorpay/Lemon Squeezy reference here.';
comment on column public.orders.provider_payment_id is
  'Dodo payment id (pay_…), written by the payment.succeeded webhook. This is what /api/webhooks/dodo dedupes on, what the admin terminal refunds, and what Caelmont''s partner ledger keys its commission against.';

-- Verification:
--   select column_name from information_schema.columns
--    where table_name = 'orders'
--      and (column_name like '%razorpay%' or column_name like '%squeezy%');   -- 0 rows
--   select id, provider, provider_session_id, provider_payment_id from public.orders;
--   select pg_get_expr(d.adbin, d.adrelid)
--     from pg_attrdef d join pg_attribute a
--       on a.attrelid = d.adrelid and a.attnum = d.adnum
--    where a.attrelid = 'public.orders'::regclass and a.attname = 'provider';
