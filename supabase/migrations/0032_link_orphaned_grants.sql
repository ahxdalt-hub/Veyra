-- Veyra — Stage 32: link orphaned (email-only) grants to their auth account.
--
-- A grant created by the admin Terminal before the owner-link fix shipped, or
-- any guest order whose account was never auto-claimed, carries the
-- purchaser's email with user_id = null. Such a row is still VISIBLE through
-- the legacy email read policy (so the product shows in the library), but every
-- seat policy keys on entitlements.user_id = auth.uid() — so the owner sees the
-- product yet cannot manage seats (every invite/assign fails).
--
-- This backfill attaches every such row to the auth account holding the same
-- verified email — exactly what claimPurchasesForUser does on sign-in, but as
-- one set-based pass over existing data. Safe and idempotent: only rows whose
-- user_id IS NULL and whose email matches a real auth user are touched; guest
-- rows with no account are left for their own future sign-in claim.

begin;

update public.orders o
   set user_id = u.id
  from auth.users u
 where lower(o.email) = lower(u.email)
   and o.user_id is null;

update public.entitlements e
   set user_id = u.id
  from auth.users u
 where lower(e.email) = lower(u.email)
   and e.user_id is null;

update public.licences l
   set user_id = u.id
  from auth.users u
 where lower(l.email) = lower(u.email)
   and l.user_id is null;

update public.seat_assignments sa
   set user_id = u.id
  from auth.users u
 where lower(sa.email) = lower(u.email)
   and sa.user_id is null;

commit;
