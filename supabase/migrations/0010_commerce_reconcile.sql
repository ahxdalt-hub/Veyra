-- Veyra — Stage 08c: commerce reconcile (canonical reconstruction of 0010).
--
-- HISTORY: the numbering gap at 0010 covers several uncommitted editor
-- passes that shaped the live schema between 0008 and the 0011 rebuild:
--   • the Stripe-era orders columns (order_number, provider_session_id,
--     provider_payment_id, subtotal/discount/total, coupon_code, paid_at)
--     from the ledger-only "0002_commerce" migration;
--   • the Razorpay-era columns (razorpay_order_id, razorpay_payment_id,
--     razorpay_signature) and its unique index — 0020 later renames the
--     order/payment ids to lemon_squeezy_* and 0022 re-adds fresh
--     razorpay_* columns, which is exactly how the live table looks;
--   • "0005_order_commerce_fields" from the CLI ledger (currency,
--     product_id, quantity, updated_at, set_updated_at + trigger) —
--     applied remotely but never committed as a file;
--   • the leads consent columns from the ledger-only "0003_phase3";
--   • entitlements.download_token and its email/order-product indexes;
--   • the licences legacy columns (license_key, product_id, order_id,
--     seat_limit, version, activated_at, revoked_at) from the pre-0003
--     experiment — 0011 later drops their NOT NULLs, so they are created
--     nullable here and the live shape results either way.
--
-- Everything is additive and guarded: on the live database this file is
-- a no-op (every column already exists); on a fresh database it fills
-- exactly the gaps that 0011+ pre-suppose.
--
-- Constraint and index names mirror the live database verbatim (including
-- pre-rename "licenses_*" names on licences, which 0006's table rename
-- froze in place). The product_id → legacy_products foreign key is added
-- by 0027, after 0015 has quarantined the legacy generation.

-- ---------------------------------------------------------------------------
-- orders — Stripe-era commerce columns
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists order_number        text unique,
  add column if not exists provider            text not null default 'razorpay',
  add column if not exists provider_session_id text unique,
  add column if not exists provider_payment_id text,
  add column if not exists subtotal            integer not null default 0,
  add column if not exists discount            integer not null default 0,
  add column if not exists total               integer not null default 0,
  add column if not exists coupon_code         text,
  add column if not exists paid_at             timestamptz,
  add column if not exists razorpay_order_id   text,
  add column if not exists razorpay_payment_id text,
  add column if not exists razorpay_signature  text;

-- Check constraints (guarded; names match the live database).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_subtotal_check') then
    alter table public.orders add constraint orders_subtotal_check check (subtotal >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_discount_check') then
    alter table public.orders add constraint orders_discount_check check (discount >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_total_check') then
    alter table public.orders add constraint orders_total_check check (total >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_quantity_check') then
    alter table public.orders add constraint orders_quantity_check check (quantity >= 1);
  end if;
end $$;

-- 0020 renames this index together with the razorpay_order_id column
-- (non-partial, as 0011 defines it); 0022 then re-adds a fresh partial
-- unique index on the re-created razorpay_order_id.
create unique index if not exists orders_razorpay_order_id_uidx
  on public.orders (razorpay_order_id);
create index if not exists orders_session_idx on public.orders (provider_session_id);
create index if not exists idx_orders_email   on public.orders (email);

-- ---------------------------------------------------------------------------
-- orders — ledger "0005_order_commerce_fields" (set_updated_at machinery)
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists currency   text not null default 'USD',
  add column if not exists product_id text,
  add column if not exists quantity   integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

comment on column public.orders.currency   is 'ISO currency code for amount fields (smallest unit).';
comment on column public.orders.product_id is 'Purchased product id (mirrors public.products.id). Set for single-product stage-02 orders.';
comment on column public.orders.quantity   is 'Units purchased for the product_id.';

-- ---------------------------------------------------------------------------
-- entitlements — download token + lookup indexes
-- ---------------------------------------------------------------------------

alter table public.entitlements
  add column if not exists download_token text unique;

create index if not exists idx_entitlements_email on public.entitlements (email);
create unique index if not exists entitlements_order_product_idx
  on public.entitlements (order_id, product_slug);

-- ---------------------------------------------------------------------------
-- leads — consent columns (ledger "0003_phase3")
-- ---------------------------------------------------------------------------

alter table public.leads
  add column if not exists marketing_subscribed boolean not null default false,
  add column if not exists consent_at           timestamptz;

-- ---------------------------------------------------------------------------
-- licences — legacy experiment columns (created nullable: 0011 drops the
-- original NOT NULLs; constraint names carry the pre-0006 "licenses_" prefix)
-- ---------------------------------------------------------------------------

alter table public.licences
  add column if not exists license_key  text,
  add column if not exists product_id   text,
  add column if not exists order_id     uuid,
  add column if not exists seat_limit   integer not null default 1,
  add column if not exists version      text,
  add column if not exists created_at   timestamptz not null default now(),
  add column if not exists activated_at timestamptz,
  add column if not exists revoked_at   timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'licenses_license_key_key') then
    alter table public.licences add constraint licenses_license_key_key unique (license_key);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'licenses_seat_limit_check') then
    alter table public.licences add constraint licenses_seat_limit_check check (seat_limit >= 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'licenses_order_id_fkey') then
    alter table public.licences
      add constraint licenses_order_id_fkey
      foreign key (order_id) references public.orders (id) on delete cascade;
  end if;
end $$;

create index if not exists idx_licenses_license_key on public.licences (license_key);
create index if not exists idx_licenses_product_id  on public.licences (product_id);

-- Verification:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name in ('orders','entitlements','leads','licences')
--    order by table_name, ordinal_position;
--   select pg_get_triggerdef(oid) from pg_trigger
--    where tgrelid='public.orders'::regclass and tgname='orders_set_updated_at';
