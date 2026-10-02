-- Veyra — shared, persistent rate limiting.
--
-- Why: every in-process throttle (Map per module) is useless on Cloudflare
-- Workers — each isolate keeps its own Map, counts reset on deploy, and a
-- cold isolate starts from zero. Protection that only exists inside one
-- isolate is not protection.
--
-- What: a fixed-window counter in Postgres, taken atomically through a
-- SECURITY DEFINER function. The ON CONFLICT ... DO UPDATE ... WHERE
-- count < limit pattern is atomic under Postgres row locking: concurrent
-- isolates serialize on the bucket row, so the limit is enforced exactly,
-- shared across every isolate and region, and durable across deploys.
--
-- Buckets are (key, window_start) rows; a call prunes the bucket's older
-- windows, so the table stays tiny. Service role only — clients never
-- touch this table (RLS on, no policies, execute revoked from everyone
-- but service_role).

create table if not exists public.rate_limits (
  bucket       text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  created_at   timestamptz not null default now(),
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies at all: anon/authenticated can neither read nor write.
-- The service role bypasses RLS and is the only intended caller.

create or replace function public.rate_limit_take(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_allowed      boolean := false;
  v_count        integer := 0;
begin
  if p_bucket is null or length(btrim(p_bucket)) = 0
     or p_limit is null or p_limit < 1
     or p_window_seconds is null or p_window_seconds < 1
     or p_window_seconds > 86400 then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  -- Fixed window anchored to the epoch: identical windows on every
  -- isolate without storing a per-bucket anchor.
  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds)
      * p_window_seconds
  );

  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, v_window_start, 1)
  on conflict (bucket, window_start)
  do update set count = public.rate_limits.count + 1
  where public.rate_limits.count < p_limit;

  -- found = true when the insert landed OR the conditional update applied;
  -- false only when the window was already at the limit.
  v_allowed := found;

  -- Accurate remaining allowance: read the window's counter (only needed
  -- when the take succeeded — a blocked caller reports remaining 0).
  if v_allowed then
    select count into v_count
      from public.rate_limits
     where bucket = p_bucket and window_start = v_window_start;
  end if;

  -- Keep the table tiny: drop this bucket's expired windows on every take
  -- (a single indexed delete on at most a handful of rows).
  delete from public.rate_limits
   where bucket = p_bucket and window_start < v_window_start;

  return jsonb_build_object(
    'ok', true,
    'allowed', v_allowed,
    'remaining', greatest(p_limit - v_count, 0)
  );
end;
$$;

revoke all on function public.rate_limit_take(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.rate_limit_take(text, integer, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Verification (run after applying, in the SQL editor):
--   select public.rate_limit_take('test:smoke', 2, 60);
--     -- call three times: ok/allowed true, true, then false.
--   delete from public.rate_limits where bucket = 'test:smoke';
-- ---------------------------------------------------------------------------
