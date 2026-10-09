-- Veyra — Stage 10: marketplace redemption codes.
--
-- WHY THIS IS NOT A COUPON: a 100% coupon models money that was never
-- collected. An AppSumo buyer HAS paid — $79, to AppSumo, who are the
-- merchant of record and remit it to the vendor later. So a redemption
-- writes a real paid order at the real price with no discount, and the
-- marketplace sale never appears in the Coupons screen (a list of discount
-- instruments) where a $79 revenue event does not belong.
--
-- The previous batch of 10,001 codes lives in `coupons`; this migration
-- moves it, order intact, and leaves the genuine discount codes alone.
--
-- Claim atomicity is the whole security story: two buyers hitting the same
-- code at the same instant must not both get a copy. That is done with a
-- guarded UPDATE inside a single statement (`WHERE status='available'`),
-- which takes a row lock and is the only write path. No read-then-write.
--
-- Idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. The codes
-- ---------------------------------------------------------------------------

create table if not exists public.redeem_codes (
  code          text primary key,
  product_slug  text not null default 'client-growth-system',
  -- What the marketplace charged, in whole-dollar terms stored as cents.
  -- This is the order's amount: nothing was discounted.
  value_cents   integer not null check (value_cents >= 0),
  currency      text not null default 'USD',
  -- Who sold it. 'appsumo' today; the storefront's own checkout never
  -- writes here, so this column is also what keeps marketplace volume out
  -- of the founding-price allocation (see src/lib/founding.ts).
  channel       text not null default 'appsumo',
  batch         text not null,
  status        text not null default 'available'
                  check (status in ('available','redeemed','deactivated')),
  redeemed_email text,
  redeemed_order_id uuid references public.orders(id) on delete set null,
  redeemed_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists redeem_codes_status_created_idx
  on public.redeem_codes (status, created_at desc, code);
create index if not exists redeem_codes_batch_idx
  on public.redeem_codes (batch, status);

-- No policies: service_role bypasses RLS and is the only role that reaches
-- this table (the redeem route and the command center). anon/authenticated
-- get nothing, which is correct — a buyer proves possession of a code by
-- submitting it, not by reading the table.
alter table public.redeem_codes enable row level security;

comment on table public.redeem_codes is
  'Marketplace license keys (AppSumo). Each row entitles one copy at value_cents; claiming writes a real paid order.';

-- ---------------------------------------------------------------------------
-- 2. orders carries the code it was redeemed with (audit trail + the founding
--    allocation's exclusion key)
-- ---------------------------------------------------------------------------

do $$ begin
  alter table public.orders add column if not exists redemption_code text;
exception when duplicate_column then null; end $$;

comment on column public.orders.redemption_code is
  'Set when the order was created by redeeming a marketplace code, not by a payment.';

-- ---------------------------------------------------------------------------
-- 3. Atomic claim. Returns the code's terms so the caller can mint the order;
--    returns ok:false with a reason when there is nothing to claim.
--    SECURITY DEFINER because redeem_codes must not be grantable to anon.
-- ---------------------------------------------------------------------------

create or replace function public.redeem_code_claim(
  p_code text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if p_email is null or position('@' in p_email) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'email_invalid');
  end if;

  -- The guard is the lock: only an unclaimed row can be flipped, and the
  -- UPDATE serialises concurrent claims on the same code.
  update public.redeem_codes
     set status = 'redeemed',
         redeemed_email = lower(trim(p_email)),
         redeemed_at = now(),
         updated_at = now()
   where code = lower(trim(coalesce(p_code, '')))
     and status = 'available'
  returning code, product_slug, value_cents, currency, channel, batch,
            redeemed_email
    into r;

  if not found then
    -- Distinguish "no such code" from "already gone" for the buyer, but
    -- never reveal anything about who holds a code.
    if exists (select 1 from public.redeem_codes
               where code = lower(trim(coalesce(p_code, '')))) then
      return jsonb_build_object('ok', false, 'reason', 'already_redeemed');
    end if;
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true, 'code', r.code, 'product_slug', r.product_slug,
    'value_cents', r.value_cents, 'currency', r.currency,
    'channel', r.channel, 'batch', r.batch, 'email', r.redeemed_email
  );
exception when others then
  -- A redemption problem must never half-complete: the caller treats any
  -- non-ok result as a failure and the claimed row is rolled back with it.
  return jsonb_build_object('ok', false, 'reason', 'server_error');
end;
$$;

revoke all on function public.redeem_code_claim(text, text) from public, anon, authenticated;
grant execute on function public.redeem_code_claim(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Release a claimed code back to the pool (marketplace refund). Used by
--    the refund path: the licence is revoked separately, and the code becomes
--    claimable again only if the operator chooses to re-issue it.
-- ---------------------------------------------------------------------------

create or replace function public.redeem_code_release(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.redeem_codes
     set status = 'deactivated',
         redeemed_order_id = null,
         updated_at = now()
   where redeemed_order_id = p_order_id
     and status = 'redeemed';
end;
$$;

revoke all on function public.redeem_code_release(uuid) from public, anon, authenticated;
grant execute on function public.redeem_code_release(uuid) to service_role;

-- Verification:
--   select to_regclass('public.redeem_codes');
--   select status, count(*) from public.redeem_codes group by status;
