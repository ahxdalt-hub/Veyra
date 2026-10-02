-- Veyra — Fix: every seat invite failed (infinite recursion in the
-- seat_assignments INSERT policy).
--
-- Symptom: the account area's "Invite" button always answered
--   "We couldn't assign that seat. Please try again."
-- for every user, on every licence, ever since the team-seat UI shipped.
--
-- Cause: seat_assignments_insert_owner (0007_seats.sql, re-created in
-- 0011_command_center.sql) enforced the purchased-seat ceiling with a
-- subquery that counts rows from public.seat_assignments — the very table
-- the policy is defined on:
--
--     and (select count(*) from public.seat_assignments sa
--          where sa.entitlement_id = e.id) < e.seats
--
-- A policy that reads its own table is self-referential. PostgreSQL
-- detects the loop while planning the INSERT and refuses the write with
--   42P17: infinite recursion detected in policy for relation "seat_assignments"
-- (reproduced against the live database as the authenticated owner).
-- Because the failure happens inside RLS, the row never reaches the table,
-- so no invite has ever succeeded through the account UI.
--
-- Why nothing else looked broken:
--   * seat 1 always exists — fulfillment inserts it with the service-role
--     client, which bypasses RLS entirely (src/lib/fulfillment.ts).
--   * reading seats always worked — the SELECT policy only references
--     entitlements, never seat_assignments.
--
-- Fix: express the same ceiling without the self-join, by counting through
-- a SECURITY DEFINER function. Running as the function owner, the count
-- bypasses RLS on seat_assignments, so there is no recursion — while the
-- policy still sees the true row count. The unique
-- (entitlement_id, seat_number) constraint continues to guard concurrent
-- invites.
--
-- Idempotent; safe to re-run. Apply after 0007 / 0011.

-- ---------------------------------------------------------------------------
-- 1. RLS-bypassing seat count (breaks the self-reference)
-- ---------------------------------------------------------------------------

create or replace function public.seat_assignment_count(p_entitlement_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.seat_assignments
  where entitlement_id = p_entitlement_id;
$$;

-- Only the policies need to call this; nothing else gains access. The count
-- is not sensitive (it is already implied by the seats the caller owns),
-- but keep the surface minimal: executable by authenticated only.
revoke all on function public.seat_assignment_count(uuid) from public;
grant execute on function public.seat_assignment_count(uuid) to authenticated;

comment on function public.seat_assignment_count(uuid) is
  '0023 — RLS-bypassing count of seat_assignments for one entitlement. Exists so seat_assignments_insert_owner can enforce the purchased-seat ceiling without a self-referential (42P17) policy.';

-- ---------------------------------------------------------------------------
-- 2. Re-create the INSERT policy without the self-reference
-- ---------------------------------------------------------------------------

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
        and public.seat_assignment_count(e.id) < e.seats
    )
  );

-- ---------------------------------------------------------------------------
-- Verification (run after applying):
--   -- the insert policy must no longer mention seat_assignments itself:
--   select with_check from pg_policies
--    where tablename = 'seat_assignments'
--      and policyname = 'seat_assignments_insert_owner';
--   -- as the owner: inviting into a free seat succeeds; inviting past the
--   -- purchased count is still refused (seat_number range + count ceiling).
-- ---------------------------------------------------------------------------
