-- Veyra — Stage 07: seat-based licensing.
--
-- Purchases are per-seat: an order of N seats creates an entitlement with
-- N licensed seats (1–5). Seat assignments are the pool of users those
-- seats have been given to. The purchaser automatically occupies seat 1;
-- the remaining seats are managed (invite / deactivate / reassign) by the
-- account owner from the account area.
--
-- Nothing here duplicates existing tables: entitlements gain a seats
-- column; seat_assignments is the new (and only) seat registry.
--
-- RLS model:
--   * SELECT — the entitlement owner, or a user assigned to a seat.
--   * INSERT / UPDATE / DELETE — the entitlement owner only, and only
--     within the purchased seat count. The database (not the client)
--     enforces that assignments can never exceed entitlement.seats.
-- Run after 0001 → 0006.

-- ---------------------------------------------------------------------------
-- Entitlements — licensed seat count
-- ---------------------------------------------------------------------------

alter table public.entitlements
  add column if not exists seats integer not null default 1
    check (seats between 1 and 5);

-- Backfill from the orders the entitlements were granted for (legacy
-- entitlements predate the column; new grants set it directly).
update public.entitlements e
set seats = greatest(1, least(5, coalesce(o.quantity, 1)))
from public.orders o
where o.id = e.order_id
  and coalesce(o.quantity, 1) between 2 and 5;

-- ---------------------------------------------------------------------------
-- Seat assignments — who occupies the licensed seats
-- ---------------------------------------------------------------------------

create table if not exists public.seat_assignments (
  id             uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.entitlements (id) on delete cascade,
  seat_number    integer not null check (seat_number >= 1),
  email          text not null,
  -- Filled when an assigned user signs in with this email (claim flow).
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

-- The owner sees every seat on their entitlements; an assigned user sees
-- the seat they occupy.
create policy "seat_assignments_select"
  on public.seat_assignments for select to authenticated
  using (
    exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id
        and e.user_id = (select auth.uid())
    )
    or user_id = (select auth.uid())
  );

-- Only the owner may give a seat to a user — and only while a seat is
-- actually free. The database enforces the purchased-seat ceiling.
create policy "seat_assignments_insert_owner"
  on public.seat_assignments for insert to authenticated
  with check (
    exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and seat_number between 1 and e.seats
        and (
          select count(*) from public.seat_assignments sa
          where sa.entitlement_id = e.id
        ) < e.seats
    )
  );

-- Reassign: the owner may move a seat to a different user. USING guards
-- the row being owned; WITH CHECK re-verifies entitlement ownership.
create policy "seat_assignments_update_owner"
  on public.seat_assignments for update to authenticated
  using (
    exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id
        and e.user_id = (select auth.uid())
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

-- Deactivate: removing the row releases the seat back to the pool.
create policy "seat_assignments_delete_owner"
  on public.seat_assignments for delete to authenticated
  using (
    exists (
      select 1 from public.entitlements e
      where e.id = entitlement_id
        and e.user_id = (select auth.uid())
    )
  );

-- Seat 1 belongs to the purchaser — established at grant time (and by
-- this backfill for entitlements granted before seats existed).
insert into public.seat_assignments
  (entitlement_id, seat_number, email, user_id, status)
select e.id, 1, e.email, e.user_id, 'active'
from public.entitlements e
on conflict (entitlement_id, seat_number) do nothing;

-- ---------------------------------------------------------------------------
-- Verification (run after applying):
--   select policyname, cmd from pg_policies
--     where tablename = 'seat_assignments';
--   -- as the owner: seats appear; as anyone else: none.
--   select seat_number, email, status from public.seat_assignments;
--   -- inviting beyond the purchased seat count must fail, even for the owner.
-- ---------------------------------------------------------------------------
