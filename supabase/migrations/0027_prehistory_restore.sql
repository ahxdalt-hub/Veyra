-- Veyra — Stage 12: restore the quarantined prehistory (canonical).
--
-- WHY: the live database still carries the tables of the first commerce
-- experiment, quarantined in place by 0015 (renamed legacy_*, nothing
-- dropped). Those tables were created by migrations that were never
-- committed as files (the CLI-ledger era "0002_commerce"/"0003_phase3"
-- and older editor passes), so a fresh database built from the committed
-- chain would end up WITHOUT them — diverging from production. This file
-- makes the committed chain converge on the live schema exactly.
--
-- DATA: rows are NOT recreated. The live legacy_products holds 7 rows,
-- every other legacy table is empty; the quarantined generation is
-- unreferenced by application code (verified by 0015) and exists for
-- inspection/restore only. A fresh rebuild gets the same shapes, empty.
--
-- ALSO restored here: the email-based read policies of the pre-account
-- era on the live tables ("orders: read own", "entitlements: read own",
-- "leads: no client access", "licenses: read own" on licences). They are
-- NOT duplicates of the auth.uid()-based policies — they are the access
-- path for guests who purchased before signing up — so they are declared
-- canonically rather than cleaned up. Plus the licences.product_id
-- foreign key into legacy_products (0015's rename dragged it along).
--
-- Everything is guarded: on the live database this file is a no-op
-- (tables/constraints/policies all exist); safe to re-run.

-- ---------------------------------------------------------------------------
-- The quarantined tables (shapes and constraint/index names verbatim)
-- ---------------------------------------------------------------------------

create table if not exists public.legacy_customers (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  auth_user_id uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- constraint names follow the pre-rename originals
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'customers_email_key') then
    alter table public.legacy_customers add constraint customers_email_key unique (email);
  end if;
end $$;

create table if not exists public.legacy_products (
  id         text primary key,
  slug       text not null,
  title      text not null,
  category   text not null,
  price      integer not null,
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  status     text not null default 'available'
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_slug_key') then
    alter table public.legacy_products add constraint products_slug_key unique (slug);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_price_check') then
    alter table public.legacy_products add constraint products_price_check check (price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_status_check') then
    alter table public.legacy_products add constraint products_status_check
      check (status in ('available','coming_soon','archived'));
  end if;
end $$;

create table if not exists public.legacy_order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  product_slug text not null,
  title        text not null,
  unit_price   integer not null,
  quantity     integer not null default 1
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_unit_price_check') then
    alter table public.legacy_order_items add constraint order_items_unit_price_check check (unit_price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_quantity_check') then
    alter table public.legacy_order_items add constraint order_items_quantity_check check (quantity = 1);
  end if;
end $$;
create index if not exists order_items_order_idx on public.legacy_order_items (order_id);

create table if not exists public.legacy_license_seats (
  id            uuid primary key default gen_random_uuid(),
  license_id    uuid not null references public.licences (id) on delete cascade,
  customer_email text not null,
  status        text not null default 'active',
  activated_at  timestamptz not null default now(),
  revoked_at    timestamptz,
  last_seen_at  timestamptz
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'license_seats_status_check') then
    alter table public.legacy_license_seats add constraint license_seats_status_check
      check (status in ('active','revoked'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'license_seats_license_id_customer_email_key') then
    alter table public.legacy_license_seats
      add constraint license_seats_license_id_customer_email_key unique (license_id, customer_email);
  end if;
end $$;
create index if not exists idx_license_seats_license_id on public.legacy_license_seats (license_id);

create table if not exists public.legacy_webhook_events (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null,
  event_type   text not null,
  payload      jsonb not null,
  processed_at timestamptz not null default now(),
  result       text not null default 'pending'
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'webhook_events_event_id_key') then
    alter table public.legacy_webhook_events add constraint webhook_events_event_id_key unique (event_id);
  end if;
end $$;

create table if not exists public.legacy_abandoned_checkouts (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  order_number     text not null references public.orders (order_number) on delete cascade,
  cart_slugs       text[] not null default '{}',
  cart_total       integer not null default 0,
  created_at       timestamptz not null default now(),
  recovery_sent_at timestamptz,
  recovered_at     timestamptz,
  opted_out        boolean not null default false
);
create unique index if not exists abandoned_email_order_idx
  on public.legacy_abandoned_checkouts (email, order_number);
create index if not exists abandoned_pending_idx
  on public.legacy_abandoned_checkouts (created_at)
  where recovery_sent_at is null and recovered_at is null;

create table if not exists public.legacy_reviews (
  id           uuid primary key default gen_random_uuid(),
  product_slug text not null,
  email        text not null,
  name         text not null,
  rating       integer not null,
  body         text not null,
  verified     boolean not null default false,
  approved     boolean not null default false,
  created_at   timestamptz not null default now()
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_rating_check') then
    alter table public.legacy_reviews add constraint reviews_rating_check
      check (rating between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reviews_body_check') then
    alter table public.legacy_reviews add constraint reviews_body_check
      check (char_length(body) between 10 and 2000);
  end if;
end $$;
create unique index if not exists reviews_one_per_product_email
  on public.legacy_reviews (email, product_slug);

-- RLS as on the live database, with the quarantined generation's policies.
alter table public.legacy_customers         enable row level security;
alter table public.legacy_products          enable row level security;
alter table public.legacy_order_items       enable row level security;
alter table public.legacy_license_seats     enable row level security;
alter table public.legacy_webhook_events    enable row level security;
alter table public.legacy_abandoned_checkouts enable row level security;
alter table public.legacy_reviews           enable row level security;

drop policy if exists "customers: read own" on public.legacy_customers;
create policy "customers: read own" on public.legacy_customers
  for select to public using (auth.jwt() ->> 'email' = email);

drop policy if exists "products: public read" on public.legacy_products;
create policy "products: public read" on public.legacy_products
  for select to public using (published = true);

drop policy if exists "order_items: read own" on public.legacy_order_items;
create policy "order_items: read own" on public.legacy_order_items
  for select to public using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.email = auth.jwt() ->> 'email'
    )
  );

drop policy if exists "license_seats: read own" on public.legacy_license_seats;
create policy "license_seats: read own" on public.legacy_license_seats
  for select to public using (
    exists (
      select 1 from public.licences l
      join public.orders o on o.id = l.order_id
      where l.id = legacy_license_seats.license_id
        and o.email = auth.jwt() ->> 'email'
    )
  );

drop policy if exists "webhook_events: no client access" on public.legacy_webhook_events;
create policy "webhook_events: no client access" on public.legacy_webhook_events
  for all to public using (false) with check (false);

drop policy if exists "abandoned_checkouts: no client access" on public.legacy_abandoned_checkouts;
create policy "abandoned_checkouts: no client access" on public.legacy_abandoned_checkouts
  for select to public using (false);

drop policy if exists "reviews: public read approved" on public.legacy_reviews;
create policy "reviews: public read approved" on public.legacy_reviews
  for select to public using (approved = true);

-- ---------------------------------------------------------------------------
-- Pre-account email-based read policies on the live tables (declared
-- verbatim from the live database — see file header)
-- ---------------------------------------------------------------------------

drop policy if exists "orders: read own" on public.orders;
create policy "orders: read own" on public.orders
  for select to public using (auth.jwt() ->> 'email' = email);

drop policy if exists "entitlements: read own" on public.entitlements;
create policy "entitlements: read own" on public.entitlements
  for select to public using (auth.jwt() ->> 'email' = email);

drop policy if exists "leads: no client access" on public.leads;
create policy "leads: no client access" on public.leads
  for select to public using (false);

drop policy if exists "licenses: read own" on public.licences;
create policy "licenses: read own" on public.licences
  for select to public using (
    exists (
      select 1 from public.orders o
      where o.id = licences.order_id and o.email = auth.jwt() ->> 'email'
    )
  );

-- ---------------------------------------------------------------------------
-- licences.product_id → legacy_products (the rename dragged the FK along;
-- on a fresh database 0015 never fires, so the FK is added here instead)
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'licenses_product_id_fkey') then
    alter table public.licences
      add constraint licenses_product_id_fkey
      foreign key (product_id) references public.legacy_products (id) on delete cascade;
  end if;
end $$;

-- Verification:
--   select to_regclass('public.legacy_products');     -- set
--   select policyname from pg_policies
--    where schemaname='public' and tablename like 'legacy%' order by 1;
--   select conname from pg_constraint
--    where conrelid = 'public.licences'::regclass and conname = 'licenses_product_id_fkey';
