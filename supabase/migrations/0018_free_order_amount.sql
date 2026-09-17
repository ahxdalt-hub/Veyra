-- Veyra — free checkout (100% coupons): allow orders.amount = 0.
--
-- WHY: orders.amount was the legacy "charged amount" (CHECK amount > 0)
-- from the Stripe era, when every order had a payment instrument. With
-- free checkout, a 100% coupon completes an order without any gateway —
-- nothing is charged, so the honest value for amount is 0. All other
-- money columns already allow zero (subtotal/discount/total >= 0).
--
-- Idempotent; safe to re-run. Only relaxes, never tightens.

do $$ begin
  begin
    alter table public.orders drop constraint orders_amount_check;
  exception when undefined_object then null;
  end;
  begin
    alter table public.orders add constraint orders_amount_check
      check (amount >= 0);
  exception when duplicate_object then null;
  end;
exception when others then raise warning 'orders_amount_check relaxed skipped: %', sqlerrm;
end $$;

-- Verification:
--   select pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'public.orders'::regclass and conname = 'orders_amount_check';
--   -- expect: CHECK (amount >= 0)