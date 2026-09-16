-- Veyra — Stage 08: the Admin Command Center (rebuild).
--
-- Prerequisite: 0007_seats.sql (it was never applied to the live
-- database; the apply script runs it first — this file also re-runs its
-- essential parts defensively via the seats block below).
--
-- What this migration does, and WHY each piece is necessary:
--
-- 1. UNBLOCK THE APP WRITE PATHS (bug fix).
--    The live orders/licences tables carry dead NOT NULL columns from an
--    earlier (empty) commerce experiment — orders.order_number,
--    licences.license_key/product_id/order_id. The current application
--    never writes them, so checkout inserts fail against the live DB
--    (verified by a rolled-back probe: 23502 on order_number). The rows
--    are all null and the tables have zero legacy rows using them, so
--    dropping NOT NULL is safe and unblocks real data flow. No columns
--    are dropped — nothing is destroyed.
--
-- 2. SEATS (0007 content, re-run idempotently).
--    The account area's team-seat UI already depends on
--    entitlements.seats + public.seat_assignments, but the live database
--    never received 0007. Re-run here so the licence/seat admin views
--    reflect a schema the customer code is already written against.
--
-- 3. COUPONS — extend, don't duplicate.
--    public.coupons already exists (code/kind/value/active/window/
--    min_subtotal) but is missing usage limits and counters. Add them.
--    The legacy subtotal/discount/total/coupon_code columns already on
--    orders are adopted as the discount trail — no new order columns.
--    Also LOCK IT DOWN: it currently has a public-read policy used by
--    nothing; replace with admin-only read (customers receive discount
--    through checkout validation, never by reading the table).
--
-- 4. DOWNLOAD EVENTS — smallest honest addition for download analytics.
--    Today downloads leave no trace, so "download count" is not
--    computable. One append-only table written by the delivery route
--    makes it real. It stores only slug/version/email/time — no IPs,
--    no tokens, no file paths.
--
-- 5. ADMIN NOTIFICATIONS + AUDIT LOG — recreated (dropped from repo in
--    the rebuild prep; never existed live). Zero client policies except
--    a dedicated admin-read policy on notifications (needed for Supabase
--    Realtime delivery to the admin's session). All writes stay
--    service-role server code.
--
-- 6. is_admin() — the single authorization predicate.
--    SECURITY DEFINER reading auth.users app_metadata, which only
--    service-role code can set (sign-up metadata is user_metadata by
--    design). Policies and future admin paths check this; the browser
--    can never grant itself admin by writing a column.
--
-- 7. REALTIME — only admin_notifications is published. New-sale /
--    payment-failed / new-customer notifications are INSERTed by the
--    fulfillment and webhook paths (which carry product names and
--    amounts resolved server-side); the admin UI subscribes to that one
--    stream instead of watching raw orders. RLS gates delivery to admins.
--
-- 8. NEW-CUSTOMER NOTICE — handle_new_user gains a best-effort
--    notification insert (exception-guarded so signup can never fail
--    because of the admin system).
--
-- Idempotent; safe to re-run. Apply AFTER 0001 → 0007.

-- ---------------------------------------------------------------------------
-- 1. Unblock the application write paths
-- ---------------------------------------------------------------------------

-- Dead legacy NOT NULLs (all rows null; zero legacy rows). Relax, don't drop.
alter table public.orders     alter column order_number drop not null;
alter table public.licences   alter column license_key  drop not null;
alter table public.licences   alter column product_id   drop not null;
alter table public.licences   alter column order_id     drop not null;

-- The 0002 unique constraints are what webhook idempotency relies on.
-- (Non-unique idx_orders_razorpay_order_id may already exist; a unique
-- index subsumes it.)
do $$ begin
  create unique index if not exists orders_razorpay_order_id_uidx
    on public.orders (razorpay_order_id);
exception when others then raise warning 'razorpay_order_id unique skipped: %', sqlerrm;
end $$;

-- orders.provider defaults to a stale 'stripe' literal from the old
-- experiment; the app's column is razorpay. Neutral default; checkout
-- sets 'razorpay' explicitly going forward.
alter table public.orders alter column provider set default 'razorpay';

-- ---------------------------------------------------------------------------
-- 2. Seats (0007 essentials, idempotent)
-- ---------------------------------------------------------------------------

alter table public.entitlements
  add column if not exists seats integer not null default 1
    check (seats between 1 and 5);

create table if not exists public.seat_assignments (
  id             uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.entitlements (id) on delete cascade,
  seat_number    integer not null check (seat_number >= 1),
  email          text not null,
  user_id        uuid references auth.users (id) on delete set null,
  status         text not null default 'invited'
                   check (status in ('invited', 'active')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (entitlement_id, seat_number)
);

create index if not exists seat_assignments_entitlement_idx
  on public.seat_assignments (entitlement_id);
create index if not exists seat_assignments_user_id_idx
  on public.seat_assignments (user_id);

alter table public.seat_assignments enable row level security;

drop policy if exists "seat_assignments_select" on public.seat_assignments;
create policy "seat_assignments_select"
  on public.seat_assignments for select to authenticated
  using (
    exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id and e.user_id = (select auth.uid())
    )
    or user_id = (select auth.uid())
  );

drop policy if exists "seat_assignments_insert_owner" on public.seat_assignments;
create policy "seat_assignments_insert_owner"
  on public.seat_assignments for insert to authenticated
  with check (
    exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and seat_number between 1 and e.seats
        and (select count(*) from public.seat_assignments sa
             where sa.entitlement_id = e.id) < e.seats
    )
  );

drop policy if exists "seat_assignments_update_owner" on public.seat_assignments;
create policy "seat_assignments_update_owner"
  on public.seat_assignments for update to authenticated
  using (
    exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id and e.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
    )
  );

drop policy if exists "seat_assignments_delete_owner" on public.seat_assignments;
create policy "seat_assignments_delete_owner"
  on public.seat_assignments for delete to authenticated
  using (
    exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id and e.user_id = (select auth.uid())
    )
  );

-- Backfill seat 1 for every existing entitlement (purchaser occupies it).
insert into public.seat_assignments (entitlement_id, seat_number, email, user_id, status)
select e.id, 1, e.email, e.user_id, 'active'
from public.entitlements e
on conflict (entitlement_id, seat_number) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Coupons — limits, counters, hygiene
-- ---------------------------------------------------------------------------

alter table public.coupons
  add column if not exists max_uses          integer,
  add column if not exists per_customer_limit integer,
  add column if not exists used_count        integer not null default 0,
  add column if not exists created_at        timestamptz not null default now(),
  add column if not exists updated_at        timestamptz not null default now();

do $$ begin
  begin
    alter table public.coupons add constraint coupons_kind_check
      check (kind in ('percent','fixed'));
  exception when duplicate_object then null;
    when check_violation then raise warning 'coupons_kind_check skipped: legacy rows violate it';
  end;
  begin
    alter table public.coupons add constraint coupons_value_check
      check (value > 0 and value <= 1000000);
  exception when duplicate_object then null;
    when check_violation then raise warning 'coupons_value_check skipped: legacy rows violate it';
  end;
  begin
    alter table public.coupons add constraint coupons_max_uses_check
      check (max_uses is null or max_uses > 0);
  exception when duplicate_object then null;
    when check_violation then raise warning 'coupons_max_uses_check skipped: legacy rows violate it';
  end;
  begin
    alter table public.coupons add constraint coupons_per_customer_check
      check (per_customer_limit is null or per_customer_limit > 0);
  exception when duplicate_object then null;
    when check_violation then raise warning 'coupons_per_customer_check skipped: legacy rows violate it';
  end;
exception when others then raise warning 'coupon checks skipped: %', sqlerrm;
end $$;

-- The table was readable by anyone. Nothing in the app ever read it —
-- lock to admin-only (the checkout path validates server-side with the
-- service role and returns a human-readable discount, never the row).
drop policy if exists "coupons: public read" on public.coupons;
alter table public.coupons enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Download events — makes delivery analytics real, minimally
-- ---------------------------------------------------------------------------

create table if not exists public.download_events (
  id              uuid primary key default gen_random_uuid(),
  product_slug    text not null,
  product_version text,
  -- Purchase/account email of the downloader (never an IP, never a token).
  email           text not null,
  user_id         uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists download_events_slug_idx
  on public.download_events (product_slug, created_at desc);

alter table public.download_events enable row level security;
-- No customer policies: the delivery route writes with the service role;
-- customers never read this table. Admin reads happen server-side.

-- ---------------------------------------------------------------------------
-- 5. Admin notifications + audit log (recreated)
-- ---------------------------------------------------------------------------

create table if not exists public.admin_notifications (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('sale','payment_failed','customer','licence','coupon','delivery','system')),
  severity       text not null default 'info' check (severity in ('info','success','warning','error')),
  title          text not null,
  message        text not null,
  related_entity text,   -- table name, e.g. 'orders'
  related_id     text,   -- row id where meaningful
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists admin_notifications_read_idx
  on public.admin_notifications (read_at, created_at desc);
create index if not exists admin_notifications_created_idx
  on public.admin_notifications (created_at desc);

alter table public.admin_notifications enable row level security;

create table if not exists public.admin_audit_log (
  id         uuid primary key default gen_random_uuid(),
  action     text not null,            -- 'admin.login', 'licence.revoke', 'coupon.create', …
  actor_id   uuid,                     -- auth user id of the admin, when session-based
  actor_email text,                    -- resolved at write time (display, not auth)
  entity     text,
  entity_id  text,
  detail     text,                     -- human summary; NEVER secrets
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
-- audit log: ZERO client policies — service-role writes, service-role
-- reads (the Activity page). Notifications are additionally readable by
-- admins below because Supabase Realtime evaluates RLS for delivery.

-- ---------------------------------------------------------------------------
-- 6. is_admin() — the authorization predicate
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and raw_app_meta_data ->> 'role' = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_admin() from public;

-- Admin read access (customer-facing policies are untouched; this only
-- ADDs admin visibility alongside them).
drop policy if exists "admin reads notifications" on public.admin_notifications;
create policy "admin reads notifications"
  on public.admin_notifications for select to authenticated
  using (public.is_admin());

drop policy if exists "admin reads coupons" on public.coupons;
create policy "admin reads coupons"
  on public.coupons for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Realtime — deliver admin notifications to admin sessions
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'admin_notifications'
  ) then
    alter publication supabase_realtime add table public.admin_notifications;
    raise notice 'admin_notifications added to supabase_realtime';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Signup → new-customer notification (best-effort, never breaks signup)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_email    text;
  v_name     text;
begin
  v_username := lower(new.raw_user_meta_data ->> 'username');
  if v_username is not null and v_username !~ '^[a-z0-9_]{3,20}$' then
    v_username := null;
  end if;
  v_email := new.email;
  v_name  := new.raw_user_meta_data ->> 'full_name';

  insert into public.profiles (id, full_name, username)
  values (new.id, v_name, v_username)
  on conflict (id) do nothing;

  -- Admin command center notice — best-effort by construction.
  begin
    insert into public.admin_notifications
      (kind, severity, title, message, related_entity, related_id)
    values (
      'customer', 'info', 'New customer',
      coalesce(nullif(trim(v_name), ''), 'A new account') || ' created a Veyra account'
        || ' (' || coalesce(v_email, 'no email') || ')',
      'profiles', new.id::text
    );
  exception when others then
    null; -- signup must never depend on the admin system
  end;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Coupon redemption accounting — increment used_count exactly once
--    per paid order. A trigger keyed on the pending→paid transition makes
--    the counter independent of which path (verify route or webhook)
--    confirms the payment, so it can never drift.
-- ---------------------------------------------------------------------------

create or replace function public.record_coupon_use()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid'
     and old.status is distinct from 'paid'
     and new.coupon_code is not null then
    update public.coupons
      set used_count = used_count + 1,
          updated_at = now()
      where code = new.coupon_code;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_coupon_use on public.orders;
create trigger orders_coupon_use
  after update of status on public.orders
  for each row execute function public.record_coupon_use();

-- ---------------------------------------------------------------------------
-- Verification (after applying):
--   select table_name from information_schema.tables
--     where table_schema='public' order by 1;
--   select pubname, tablename from pg_publication_tables;
--   -- as the admin user: select * from public.admin_notifications; → visible
--   -- as any other user:  → zero rows.
-- ---------------------------------------------------------------------------
