-- Veyra — Stage 04 schema: customer accounts, entitlements, licences.
-- Extends 0002_orders.sql (run 0001 → 0002 → 0003, in order, in the SQL
-- editor). Nothing here duplicates an existing table: orders gains a
-- user_id; profiles/entitlements/licences/redelivery_requests are new.
--
-- Ownership model:
--   auth user → orders.user_id → entitlements (one per paid order, unique)
--   → licences (one per entitlement, unique) → product access.
-- Guest orders keep user_id null until the customer signs up with the
-- SAME email they purchased with. Supabase Auth has verified that email
-- (confirmation flow), which is the verification this linking relies on —
-- linking never happens on a merely client-supplied address. Until then
-- the rows stay unlinked and invisible to every other account.
--
-- RLS: every customer-data table restricts SELECT to the owning user via
-- auth.uid(). There are deliberately NO insert/update/delete policies on
-- orders/entitlements/licences — clients can never create an entitlement
-- or licence; only the server (service role, used by the checkout verify
-- route, the Razorpay webhook, and the claim routine) writes them.

-- ---------------------------------------------------------------------------
-- Orders ↔ account link
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists orders_user_id_idx on public.orders (user_id);

-- The account area reads orders through the user's own session (anon key,
-- RLS enforced). A customer may only see orders linked to their identity.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
  on public.orders for select to authenticated
  using (user_id is not null and user_id = (select auth.uid()));
-- No insert/update/delete policies: the service-role API routes remain the
-- only writers, so customers cannot create, alter, or reassign orders.

-- ---------------------------------------------------------------------------
-- Profiles — display info only, never an authorization source
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  business_name text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- USING + WITH CHECK both present: a user cannot move their row to
-- another identity, only edit their own display fields.

-- Auto-create a profile on signup; copies the display name the client
-- passed to supabase.auth.signUp (raw_user_meta_data is display-only —
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
-- Entitlements — "this customer owns this product", one per paid order
-- ---------------------------------------------------------------------------

create table if not exists public.entitlements (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null unique references public.orders (id) on delete cascade,
  user_id      uuid references auth.users (id) on delete cascade,
  email        text not null,             -- purchase email (claim key)
  product_slug text not null,
  status       text not null default 'active' check (status in ('active','revoked')),
  granted_at   timestamptz not null default now()
);

create index if not exists entitlements_user_id_idx on public.entitlements (user_id);
create index if not exists entitlements_email_idx  on public.entitlements (email);

alter table public.entitlements enable row level security;

create policy "entitlements_select_own"
  on public.entitlements for select to authenticated
  using (user_id is not null and user_id = (select auth.uid()));
-- No client writes, ever: entitlements are granted server-side only,
-- strictly after the order reaches status 'paid'.

-- ---------------------------------------------------------------------------
-- Licences — one per entitlement; reference generated by the server
-- ---------------------------------------------------------------------------

create table if not exists public.licences (
  id               uuid primary key default gen_random_uuid(),
  entitlement_id   uuid not null unique references public.entitlements (id) on delete cascade,
  user_id          uuid references auth.users (id) on delete cascade,
  email            text not null,
  product_slug     text not null,
  licence_reference text not null unique,
  status           text not null default 'active' check (status in ('active','revoked')),
  issued_at        timestamptz not null default now()
);

create index if not exists licences_user_id_idx on public.licences (user_id);
create index if not exists licences_email_idx   on public.licences (email);

alter table public.licences enable row level security;

create policy "licences_select_own"
  on public.licences for select to authenticated
  using (user_id is not null and user_id = (select auth.uid()));
-- No client writes: licences are created server-side, tied to a real
-- entitlement. Veyra's products are one-time purchases — there is no
-- expiry/renewal column by design.

-- ---------------------------------------------------------------------------
-- Re-delivery requests — the customer asks for the current version; the
-- team fulfils against the authoritative catalog version. Records give
-- the request an audit trail; no product files are stored or exposed.
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

create policy "redelivery_select_own"
  on public.redelivery_requests for select to authenticated
  using (user_id = (select auth.uid()));

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
-- Verification queries (run after applying):
--   select tablename, policyname, cmd from pg_policies
--     where schemaname = 'public' order by tablename;
--   select relname, relrowsecurity from pg_class
--     where relnamespace = 'public'::regnamespace;
--   -- as an authenticated user other than the owner:
--   select id from public.orders;            -- → only own rows
--   select id from public.entitlements;      -- → only own rows
--   insert into public.entitlements(...) values (...);  -- → denied
-- ---------------------------------------------------------------------------
