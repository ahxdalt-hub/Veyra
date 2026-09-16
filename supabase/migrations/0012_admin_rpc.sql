-- Veyra — Stage 09: admin command-center aggregation RPCs.
--
-- WHY: the admin panel's metrics/analytics must be computed FROM the
-- database, not by pulling tables into the browser. These SECURITY
-- DEFINER functions run as owner (postgres), read real rows, and return
-- only aggregates. Granted to service_role ONLY — a customer's JWT can
-- never call them; the admin pages invoke them through server-side code
-- holding the service-role key.
--
-- Money: orders.amount is cents (smallest unit). Revenue aggregates the
-- 'paid' status rows; refunded is excluded from revenue by design and
-- surfaced separately.
--
-- Idempotent; safe to re-run. Apply after 0008.

-- ---------------------------------------------------------------------------
-- 1. Core metrics for a time window (inclusive lower, exclusive upper)
-- ---------------------------------------------------------------------------

create or replace function public.admin_metrics(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'revenue',        coalesce((select sum(amount)  from orders  where status = 'paid'
                                  and created_at >= p_from and created_at < p_to), 0),
    'orders',         (select count(*) from orders  where created_at >= p_from and created_at < p_to),
    'paid_orders',    (select count(*) from orders  where status = 'paid'
                                  and created_at >= p_from and created_at < p_to),
    'failed_orders',  (select count(*) from orders  where status = 'failed'
                                  and created_at >= p_from and created_at < p_to),
    'pending_orders', (select count(*) from orders  where status = 'pending'
                                  and created_at >= p_from and created_at < p_to),
    'new_customers',  (select count(*) from profiles where created_at >= p_from and created_at < p_to),
    'licences_issued',(select count(*) from licences where issued_at >= p_from and issued_at < p_to),
    'downloads',      (select count(*) from download_events where created_at >= p_from and created_at < p_to)
  );
$$;

-- All-time scalars (no window) — active bases for licence/customer counts.
create or replace function public.admin_totals()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'revenue_all',      coalesce((select sum(amount) from orders where status = 'paid'), 0),
    'orders_all',       (select count(*) from orders),
    'customers_all',    (select count(*) from profiles),
    'licences_active',  (select count(*) from licences where status = 'active'),
    'licences_revoked', (select count(*) from licences where status = 'revoked'),
    'seats_active',     coalesce((select sum(seats) from entitlements where status = 'active'), 0),
    'leads_all',        (select count(*) from leads)
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Revenue over time — bucketed hourly or daily depending on the span
-- ---------------------------------------------------------------------------

create or replace function public.admin_revenue_series(
  p_from timestamptz, p_to timestamptz, p_bucket text default 'day'
)
returns table (bucket timestamptz, revenue bigint, orders bigint, paid bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    date_trunc(case when p_bucket = 'hour' then 'hour' else 'day' end, created_at)
      as bucket,
    coalesce(sum(case when status = 'paid' then amount else 0 end), 0) as revenue,
    count(*)::bigint as orders,
    count(*) filter (where status = 'paid')::bigint as paid
  from orders
  where created_at >= p_from and created_at < p_to
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- 3. Per-product breakdown (revenue, units, share) for a window
-- ---------------------------------------------------------------------------

create or replace function public.admin_product_breakdown(p_from timestamptz, p_to timestamptz)
returns table (
  product_slug text,
  revenue bigint,
  units bigint,
  paid_orders bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.product_slug,
    sum(o.amount)   as revenue,
    sum(o.quantity) as units,
    count(*)        as paid_orders
  from orders o
  where o.status = 'paid'
    and o.created_at >= p_from and o.created_at < p_to
  group by o.product_slug
  order by revenue desc;
$$;

-- ---------------------------------------------------------------------------
-- 4. Customer rollups + leaderboard
-- ---------------------------------------------------------------------------

create or replace function public.admin_customer_rollups(
  p_search text default null, p_limit int default 50, p_offset int default 0
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  username text,
  account_created timestamptz,
  orders bigint,
  revenue bigint,
  first_purchase timestamptz,
  latest_purchase timestamptz,
  active_licences bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with paid as (
    select o.user_id, o.email,
           count(*)                          as orders,
           sum(o.amount)                     as revenue,
           min(o.created_at)                 as first_purchase,
           max(o.created_at)                 as latest_purchase
    from orders o
    where o.status = 'paid'
    group by 1, 2
  )
  select
    k.user_id,
    coalesce(pu.email, k.email_key)                          as email,
    pr.full_name,
    pr.username,
    pr.created_at                                            as account_created,
    k.orders,
    k.revenue,
    k.first_purchase,
    k.latest_purchase,
    coalesce(l.active_licences, 0)
  from (
    select user_id, lower(email) as email_key,
           sum(orders)::bigint as orders, sum(revenue)::bigint as revenue,
           min(first_purchase) as first_purchase, max(latest_purchase) as latest_purchase
    from paid group by 1, 2
  ) k
  left join lateral (
    select count(*)::bigint as active_licences
    from licences lc
    where lc.status = 'active'
      and (k.user_id is not null and lc.user_id = k.user_id
           or k.user_id is null and lower(lc.email) = k.email_key)
  ) l on true
  left join profiles pr on pr.id = k.user_id
  left join auth.users pu on pu.id = k.user_id
  where p_search is null
     or coalesce(pu.email, k.email_key) ilike '%' || p_search || '%'
     or coalesce(pr.full_name, '') ilike '%' || p_search || '%'
     or coalesce(pr.username, '') ilike '%' || p_search || '%'
  order by k.revenue desc, k.orders desc, account_created asc
  limit p_limit offset p_offset;
$$;

-- ---------------------------------------------------------------------------
-- 5. Status distributions for the analytics workspace
-- ---------------------------------------------------------------------------

create or replace function public.admin_order_status_counts(p_from timestamptz, p_to timestamptz)
returns table (status text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select o.status, count(*)::bigint
  from orders o
  where o.created_at >= p_from and o.created_at < p_to
  group by o.status order by count desc;
$$;

create or replace function public.admin_licence_status_counts()
returns table (status text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select l.status, count(*)::bigint from licences l group by l.status;
$$;

-- Repeat vs single-purchase customer distribution over all time.
create or replace function public.admin_purchase_frequency()
returns table (bucket text, customers bigint)
language sql
stable
security definer
set search_path = public
as $$
  with per_customer as (
    select coalesce(o.user_id::text, lower(o.email)) as key, count(*) as n
    from orders o where o.status = 'paid'
    group by 1
  )
  select case when n = 1 then 'once' when n = 2 then 'twice' else 'three_plus' end,
         count(*)::bigint
  from per_customer group by 1;
$$;

-- ---------------------------------------------------------------------------
-- 6. Activity feed — real operational events, merged from sources.
--    Returns newest-first; limit guards payload size.
-- ---------------------------------------------------------------------------

create or replace function public.admin_recent_activity(p_limit int default 50)
returns table (
  id uuid,
  kind text,
  severity text,
  title text,
  message text,
  related_entity text,
  related_id text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select n.id, n.kind, n.severity, n.title, n.message,
         n.related_entity, n.related_id, n.created_at
  from admin_notifications n
  order by n.created_at desc
  limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- 7. Coupon usage per customer (enforcement reads, server-side)
-- ---------------------------------------------------------------------------

create or replace function public.admin_coupon_usage(p_code text, p_email text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from orders
  where coupon_code = p_code
    and status = 'paid'
    and lower(email) = lower(p_email);
$$;

-- ---------------------------------------------------------------------------
-- Grants: service_role only. (Owner postgres executes implicitly; auth
-- roles are revoked for hygiene.)
-- ---------------------------------------------------------------------------

revoke all on function public.admin_metrics(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_totals() from public, anon, authenticated;
revoke all on function public.admin_revenue_series(timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.admin_product_breakdown(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_customer_rollups(text, int, int) from public, anon, authenticated;
revoke all on function public.admin_order_status_counts(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_licence_status_counts() from public, anon, authenticated;
revoke all on function public.admin_purchase_frequency() from public, anon, authenticated;
revoke all on function public.admin_recent_activity(int) from public, anon, authenticated;
revoke all on function public.admin_coupon_usage(text, text) from public, anon, authenticated;

grant execute on function public.admin_metrics(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_totals() to service_role;
grant execute on function public.admin_revenue_series(timestamptz, timestamptz, text) to service_role;
grant execute on function public.admin_product_breakdown(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_customer_rollups(text, int, int) to service_role;
grant execute on function public.admin_order_status_counts(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_licence_status_counts() to service_role;
grant execute on function public.admin_purchase_frequency() to service_role;
grant execute on function public.admin_recent_activity(int) to service_role;
grant execute on function public.admin_coupon_usage(text, text) to service_role;

-- Verification:
--   select public.admin_totals();
--   select * from public.admin_revenue_series(now() - interval '30 days', now(), 'day');
-- (run in the SQL editor as postgres — service-role-only otherwise)
