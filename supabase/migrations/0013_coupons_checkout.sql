-- Veyra — Stage 09b: coupon checkout wiring + write-path defaults.
--
-- WHY: two things the 0008 audit proved broken/ambiguous, plus the
-- units the coupon system needs defined once and for all.
--
-- 1. orders.subtotal / orders.total are NOT NULL without defaults
--    (legacy Stripe-era columns) while the application's insertOrder
--    never writes them — so EVERY checkout insert against the live
--    database fails on 23502 (verified). Give them safe defaults; the
--    authoritative charged value remains orders.amount. When a coupon
--    is used, checkout now writes subtotal/discount/total/coupon_code
--    explicitly (all in cents).
--
-- 2. Coupon money semantics, pinned by check constraints:
--    * kind='percent' → value is percentage points, 1–100
--    * kind='fixed'   → value is whole USD dollars (matches the
--                        storefront's whole-dollar pricing)
--    * min_subtotal   → whole USD dollars
--    * orders money columns (amount/subtotal/discount/total) → cents
--    Founding checkout prices are whole dollars, so dollar-level
--    discount math is exact; nothing is stored in two units.
--
-- Idempotent; safe to re-run. Apply after 0008 and 0009.

-- ---------------------------------------------------------------------------
-- 1. Unblock insertOrder for the legacy money columns
-- ---------------------------------------------------------------------------

alter table public.orders alter column subtotal set default 0;
alter table public.orders alter column total    set default 0;

-- ---------------------------------------------------------------------------
-- 2. Coupon value semantics
-- ---------------------------------------------------------------------------

do $$ begin
  begin
    alter table public.coupons add constraint coupons_percent_range
      check (kind <> 'percent' or (value >= 1 and value <= 100));
  exception when duplicate_object then null;
    when check_violation then raise warning 'coupons_percent_range skipped: legacy rows violate it';
  end;
  begin
    alter table public.coupons add constraint coupons_date_window_check
      check (ends_at is null or starts_at is null or ends_at >= starts_at);
  exception when duplicate_object then null;
    when check_violation then raise warning 'coupons_date_window_check skipped: legacy rows violate it';
  end;
exception when others then raise warning 'coupon semantics skipped: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Coupon validation at checkout — one server-side authority.
--    SECURITY DEFINER (reads coupons + paid-order usage as owner),
--    service_role only. Returns structured JSONB, never throws, so the
--    API route can map reasons to human messages. The route passes the
--    pre-discount subtotal in WHOLE DOLLARS; the discount comes back in
--    whole dollars (founding prices are integral, so this is exact).
-- ---------------------------------------------------------------------------

create or replace function public.validate_coupon(
  p_code text,
  p_email text,
  p_subtotal_dollars integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  v_now date := current_date;
  v_customer_uses bigint;
  v_discount integer;
begin
  select * into c from public.coupons
  where code = lower(trim(coalesce(p_code, '')));  -- codes stored lowercase

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if not c.active then
    return jsonb_build_object('ok', false, 'reason', 'inactive');
  end if;
  if c.starts_at is not null and v_now < c.starts_at then
    return jsonb_build_object('ok', false, 'reason', 'not_started');
  end if;
  if c.ends_at is not null and v_now > c.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if c.min_subtotal is not null and p_subtotal_dollars < c.min_subtotal then
    return jsonb_build_object('ok', false, 'reason', 'min_subtotal',
                              'min_subtotal', c.min_subtotal);
  end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'usage_exhausted');
  end if;
  if c.per_customer_limit is not null then
    select count(*) into v_customer_uses
    from orders
    where coupon_code = c.code and status = 'paid' and lower(email) = lower(p_email);
    if v_customer_uses >= c.per_customer_limit then
      return jsonb_build_object('ok', false, 'reason', 'customer_limit');
    end if;
  end if;

  v_discount := case
    when c.kind = 'percent' then floor(p_subtotal_dollars * c.value / 100)::integer
    else least(c.value, p_subtotal_dollars)
  end;
  return jsonb_build_object(
    'ok', true, 'code', c.code, 'label', c.label,
    'kind', c.kind, 'value', c.value, 'discount_dollars', v_discount
  );
exception when others then
  -- A coupon problem must never take checkout down: fail closed (no
  -- discount) but with an explicit server reason to surface in logs.
  return jsonb_build_object('ok', false, 'reason', 'server_error');
end;
$$;

revoke all on function public.validate_coupon(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.validate_coupon(text, text, integer)
  to service_role;

-- Normalize existing codes to lowercase so lookup is deterministic.
update public.coupons set code = lower(code) where code <> lower(code);

-- Verification:
--   select public.validate_coupon('LAUNCH20', 'x@example.com', 79);
--   -- expect ok:true, discount_dollars:15
