-- Veyra — Stage 11: customers = every account, buyers ranked first.
--
-- WHY: admin_customer_rollups (0012) keyed the customer list off PAID
-- ORDERS only — so the "Customers" area of the command center couldn't
-- see registered Veyra accounts that haven't purchased yet. The business
-- truth is that every auth account IS a customer record; buyers simply
-- lead the list. This rebuild keeps every aggregate real:
--   * accounts (profiles + auth.users) appear with their true email,
--     zero orders, zero revenue;
--   * guest purchases (orders with no linked account) keep rolling up
--     under their purchase email with full stats;
--   * buyers sort above non-buyers (revenue desc, then orders, then
--     newest account).
-- Nothing is fabricated — non-buyers show honest zeros, not estimates.
--
-- Idempotent; service_role execution only. Apply after 0012.

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
  with paid_by_user as (
    select o.user_id,
           count(*)          as orders,
           sum(o.amount)     as revenue,
           min(o.created_at) as first_purchase,
           max(o.created_at) as latest_purchase
    from orders o
    where o.status = 'paid' and o.user_id is not null
    group by o.user_id
  ),
  paid_by_guest as (
    -- Purchases that were never linked to an account roll up by email.
    select lower(o.email) as email_key,
           count(*)          as orders,
           sum(o.amount)     as revenue,
           min(o.created_at) as first_purchase,
           max(o.created_at) as latest_purchase
    from orders o
    where o.status = 'paid' and o.user_id is null
    group by lower(o.email)
  )
  -- 1. Registered accounts (buyers and non-buyers alike).
  -- The union is wrapped so the p_search filter applies to every row.
  select r.*
  from (
    select
      u.id                                                    as user_id,
      u.email                                                 as email,
      pr.full_name,
      pr.username,
      pr.created_at                                           as account_created,
      coalesce(pu.orders, 0)::bigint                          as orders,
      coalesce(pu.revenue, 0)::bigint                         as revenue,
      pu.first_purchase,
      pu.latest_purchase,
      coalesce((
        select count(*) from licences lc
        where lc.status = 'active' and lc.user_id = u.id
      ), 0)::bigint                                           as active_licences
    from auth.users u
    left join profiles pr on pr.id = u.id
    left join paid_by_user pu on pu.user_id = u.id
    where u.email is not null

    union all

    -- 2. Guest purchasers with no linked account.
    select
      null,
      pg.email_key,
      null,
      null,
      null,
      pg.orders,
      pg.revenue,
      pg.first_purchase,
      pg.latest_purchase,
      coalesce((
        select count(*) from licences lc
        where lc.status = 'active' and lc.user_id is null
          and lower(lc.email) = pg.email_key
      ), 0)::bigint
    from paid_by_guest pg
  ) r
  where p_search is null
     or r.email ilike '%' || p_search || '%'
     or coalesce(r.full_name, '') ilike '%' || p_search || '%'
     or coalesce(r.username, '') ilike '%' || p_search || '%'
  order by
    revenue desc nulls last,
    orders  desc nulls last,
    account_created desc nulls last
  limit p_limit offset p_offset;
$$;

revoke all on function public.admin_customer_rollups(text, int, int)
  from public, anon, authenticated;
grant execute on function public.admin_customer_rollups(text, int, int)
  to service_role;

-- Verification:
--   select email, orders, revenue from public.admin_customer_rollups(null, 10, 0);
--   -- expect every auth account; buyers first with real revenue.
