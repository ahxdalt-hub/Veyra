-- Veyra — tighten the order status machine to the states that exist.
--
-- The app writes exactly three statuses (src/lib/orders.ts):
--   pending → paid → refunded
-- 'failed' and 'cancelled' were never written by application code — they
-- existed only in the schema and in UI branches that could never render.
-- An abandoned hosted checkout simply stays pending: no event fires, and
-- a "failed"/"cancelled" marker derived from silence would be invented.
-- This migration makes the database agree with reality.
--
-- Safe to apply only when no rows carry the removed states — verified
-- against the live project before writing this file (all rows are
-- paid/pending). The update below is a belt-and-braces reconciliation:
-- legacy 'cancelled'/'failed' rows (e.g. restored backups, demo scripts)
-- become 'pending' rather than blocking the constraint change — a row
-- that never completed charging is, truthfully, still pending.

update public.orders
   set status = 'pending', updated_at = now()
 where status in ('failed', 'cancelled');

alter table public.orders
  drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
    check (status in ('pending', 'paid', 'refunded'));

-- ---------------------------------------------------------------------------
-- Verification:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.orders'::regclass and conname = 'orders_status_check';
--     -- → CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text]))
-- ---------------------------------------------------------------------------
