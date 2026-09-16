-- Veyra — Stage 09c: confirm-time stamping.
--
-- WHY: orders.paid_at (legacy column, nullable) records when a payment
-- was confirmed. The application's status transitions are the only paths
-- that can confirm a payment (verify route + webhook, both conditional
-- on pending→paid), so a trigger keeps the stamp exact-once without any
-- client or route having to remember it.
--
-- Idempotent; safe to re-run. Apply after 0013.

create or replace function public.stamp_paid_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid'
     and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_stamp_paid_at on public.orders;
create trigger orders_stamp_paid_at
  before update of status on public.orders
  for each row execute function public.stamp_paid_at();

-- Verification:
--   begin; update public.orders set status='paid'
--          where id=(select id from public.orders limit 0)
--          returning paid_at; rollback;  -- no rows, no error
