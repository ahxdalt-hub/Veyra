-- Veyra — Stage 10: quarantine dead legacy-experiment tables.
--
-- WHY: the live database carries a second, incompatible generation of
-- tables from an earlier commerce experiment (Stripe-era columns on
-- orders, plus these whole-table vestiges). 0008_activations.sql creates
-- a NEW registry table named public.products (slug/name/status), which
-- collides with the legacy products table (id/title/category/price…) —
-- the activation migration fails outright until this is cleared.
--
-- Data safety: nothing is dropped. Every quarantined table is renamed to
-- legacy_* so it can be inspected or restored, and none is referenced by
-- application code (verified by grep across src/). Row counts at audit
-- time: products 7, all others 0, coupons excluded (coupons is LIVE —
-- reused by the command center, not quarantined).
--
-- Idempotent; safe to re-run. Apply after 0014.

do $$
declare
  t text;
begin
  foreach t in array array[
    'products',            -- legacy catalog (app uses src/lib/products.ts)
    'customers',           -- superseded by profiles + orders.email
    'order_items',         -- orders are single-line by design (0002)
    'license_seats',       -- superseded by seat_assignments (0007)
    'reviews',             -- never wired into the app
    'webhook_events',      -- never wired (webhook route is stateless)
    'abandoned_checkouts'  -- never wired into the app
  ] loop
    if to_regclass('public.' || t) is not null
       and to_regclass('public.legacy_' || t) is null then
      execute format('alter table public.%I rename to %I', t, 'legacy_' || t);
      raise notice 'quarantined public.% → public.legacy_%', t, t;
    end if;
  end loop;
end $$;

-- Verification:
--   select to_regclass('public.legacy_products'),  -- set (kept)
--          to_regclass('public.products');          -- null (free for 0008)
