-- Veyra — Stage 04 reconciliation.
--
-- Ground truth probed via the live REST API (2026-09-14, anon key):
--   * orders                → present, but MISSING user_id, product_slug,
--                             amount (has id, email, status, currency,
--                             razorpay_order_id, razorpay_payment_id,
--                             quantity, created_at, updated_at)
--   * entitlements          → present, but MISSING user_id, status
--                             (has id, order_id, email, product_slug,
--                             granted_at)
--   * licenses              → pre-existing table from an earlier
--                             licensing experiment; only id/status/
--                             order_id overlap — MISSING entitlement_id,
--                             user_id, email, product_slug,
--                             licence_reference, issued_at
--   * profiles              → MISSING
--   * redelivery_requests   → MISSING
--
-- Decision (per "extend, don't duplicate"): the account system uses the
-- EXISTING public.licenses table instead of creating a duplicate
-- licences table. This file finishes 0003 defensively — every statement
-- is idempotent and safe to re-run.
--
-- Run in the Supabase dashboard SQL editor (after 0001 → 0002 → 0003;
-- safe even if 0003 never applied). Then reload /account.

-- ---------------------------------------------------------------------------
-- 1. Orders — add the columns 0002/0003 expect that the live table lacks
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists product_slug text,
  add column if not exists amount integer;

create index if not exists orders_user_id_idx on public.orders (user_id);

-- Backfill so existing rows satisfy NOT NULL / CHECK before tightening.
update public.orders set amount = 1 where amount is null;

do $$
begin
  alter table public.orders
    alter column amount set not null;
  -- Check constraint from 0002; skip (with a warning) if legacy rows
  -- would violate it.
  begin
    alter table public.orders
      add constraint orders_amount_check check (amount > 0);
  exception
    when check_violation then
      raise warning 'orders_amount_check not added: legacy rows violate it';
  end;
exception
  when others then
    raise warning 'orders amount tightening skipped: %', sqlerrm;
end $$;

do $$
begin
  begin
    alter table public.orders
      add constraint orders_status_check
      check (status in ('pending','paid','failed','cancelled','refunded'));
  exception
    when duplicate_object then null;   -- already exists from 0002
    when check_violation then
      raise warning 'orders_status_check not added: legacy rows violate it';
  end;
exception
  when others then
    raise warning 'orders status check skipped: %', sqlerrm;
end $$;

-- The account area reads orders through the user's own session (anon key,
-- RLS enforced). A customer may only see orders linked to their identity.
alter table public.orders enable row level security;

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select to authenticated
  using (user_id is not null and user_id = (select auth.uid()));
-- No insert/update/delete policies: only the server (service role) writes
-- orders, entitlements, and licenses.

-- ---------------------------------------------------------------------------
-- 2. Profiles — display info only, never an authorization source
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  business_name text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Backfill profiles for any users created before the trigger existed.
insert into public.profiles (id, full_name)
select u.id, u.raw_user_meta_data ->> 'full_name'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Auto-create a profile on signup; copies the display name passed to
-- supabase.auth.signUp (raw_user_meta_data is display-only —
-- authorization never reads it).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Entitlements — "this customer owns this product", one per paid order
-- ---------------------------------------------------------------------------

alter table public.entitlements
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists status text not null default 'active';

create index if not exists entitlements_user_id_idx on public.entitlements (user_id);
create index if not exists entitlements_email_idx  on public.entitlements (email);

do $$
begin
  begin
    alter table public.entitlements
      add constraint entitlements_status_check
      check (status in ('active','revoked'));
  exception
    when duplicate_object then null;
    when check_violation then
      raise warning 'entitlements_status_check not added: legacy rows violate it';
  end;
exception
  when others then
    raise warning 'entitlements status check skipped: %', sqlerrm;
end $$;

alter table public.entitlements enable row level security;

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own"
  on public.entitlements for select to authenticated
  using (user_id is not null and user_id = (select auth.uid()));

-- Idempotency keys the fulfillment code relies on.
create unique index if not exists entitlements_order_id_uidx
  on public.entitlements (order_id);

-- ---------------------------------------------------------------------------
-- 4. Licenses — adopt the pre-existing table as the licence store
-- ---------------------------------------------------------------------------

alter table public.licenses
  add column if not exists entitlement_id uuid references public.entitlements (id) on delete cascade,
  add column if not exists user_id        uuid references auth.users (id) on delete cascade,
  add column if not exists email          text,
  add column if not exists product_slug   text,
  add column if not exists licence_reference text,
  add column if not exists issued_at      timestamptz not null default now();

create index if not exists licenses_user_id_idx on public.licenses (user_id);
create index if not exists licenses_email_idx   on public.licenses (email);

alter table public.licenses enable row level security;

drop policy if exists "licenses_select_own" on public.licenses;
create policy "licenses_select_own"
  on public.licenses for select to authenticated
  using (user_id is not null and user_id = (select auth.uid()));
-- If an earlier experiment left a broad "authenticated can do anything"
-- policy on this table, review and remove it manually:
--   select policyname, cmd, qual, with_check from pg_policies
--    where schemaname = 'public' and tablename = 'licenses';

-- Unique per entitlement and per reference — fulfillment's idempotency
-- keys. Skipped (with a warning) if legacy duplicate rows exist.
do $$
begin
  begin
    create unique index if not exists licenses_entitlement_id_uidx
      on public.licenses (entitlement_id);
  exception
    when others then
      raise warning 'licenses_entitlement_id_uidx not created: %', sqlerrm;
  end;
  begin
    create unique index if not exists licenses_licence_reference_uidx
      on public.licenses (licence_reference);
  exception
    when others then
      raise warning 'licenses_licence_reference_uidx not created: %', sqlerrm;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Re-delivery requests — audit trail for "get the current version"
-- ---------------------------------------------------------------------------

create table if not exists public.redelivery_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  entitlement_id  uuid not null references public.entitlements (id) on delete cascade,
  product_slug    text not null,
  product_version text,
  created_at      timestamptz not null default now()
);

create index if not exists redelivery_requests_user_id_idx
  on public.redelivery_requests (user_id);

alter table public.redelivery_requests enable row level security;

drop policy if exists "redelivery_select_own" on public.redelivery_requests;
create policy "redelivery_select_own"
  on public.redelivery_requests for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "redelivery_insert_own" on public.redelivery_requests;
create policy "redelivery_insert_own"
  on public.redelivery_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
    )
  );
-- A request can only ever reference an entitlement the caller actually
-- owns — the EXISTS clause is enforced by the database, not the client.

-- ---------------------------------------------------------------------------
-- 6. Verification queries (run after applying):
--   select tablename, policyname, cmd from pg_policies
--     where schemaname = 'public' order by tablename, policyname;
--   -- as an authenticated user other than the owner:
--   select id from public.orders;            -- → only own rows
--   select id from public.entitlements;      -- → only own rows
--   insert into public.entitlements(...) values (...);  -- → denied
-- ---------------------------------------------------------------------------
