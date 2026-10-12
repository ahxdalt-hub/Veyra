-- Veyra — live site presence ("how many people are viewing right now").
--
-- Why Postgres and not an in-process counter: Veyra runs on Cloudflare
-- Workers (OpenNext). Every request may land on a different isolate, each
-- isolate keeps its own memory, counts reset on deploy, and a cold isolate
-- starts from zero — the exact reason 0025_rate_limits.sql moved rate
-- limiting into Postgres. A live-visitor count that only exists inside one
-- isolate is not a live-visitor count. So presence lives here, shared and
-- durable across every isolate and region.
--
-- Model: the storefront sends a lightweight anonymous heartbeat every ~20s
-- while a tab is open (see src/components/layout/presence-beacon.tsx). Each
-- heartbeat upserts last_seen for a client-generated random session id.
-- "Viewing now" = distinct sessions whose last_seen is within 60 seconds.
-- Every heartbeat prunes rows idle beyond 5 minutes, so the table only ever
-- holds currently-active visitors and stays tiny.
--
-- Privacy: we store NO IP, NO user agent, NO cookies — only a random
-- session id (client-generated, crypto.randomUUID), the last path viewed,
-- and two timestamps. It is anonymous by construction and cannot be tied
-- back to a person. This is consistent with the site's privacy/cookie
-- policy (no tracking cookies are set).
--
-- Service role only — clients never touch this table (RLS on, no policies;
-- execute revoked from everyone but service_role). The public write path
-- goes through /api/presence, which uses the service-role key server-side.
--
-- Run after 0001 → 0030.

create table if not exists public.site_presence (
  session_id text        not null,
  path       text,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (session_id)
);

-- The read (live count) filters on last_seen; the prune deletes on it too.
create index if not exists site_presence_last_seen_idx
  on public.site_presence (last_seen);

alter table public.site_presence enable row level security;
-- No policies at all: anon/authenticated can neither read nor write.
-- The service role bypasses RLS and is the only intended caller.

-- ---------------------------------------------------------------------------
-- presence_heartbeat — record one visitor's ping and prune the idle tail.
-- Idempotent per session: re-pings only move last_seen forward. Returns a
-- small status object; NEVER returns counts (that would leak live traffic to
-- the unauthenticated public write path).
-- ---------------------------------------------------------------------------
create or replace function public.presence_heartbeat(
  p_session text,
  p_path    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  if p_session is null or length(btrim(p_session)) = 0 or length(p_session) > 64 then
    return jsonb_build_object('ok', false, 'code', 'invalid_session');
  end if;

  insert into public.site_presence (session_id, path, first_seen, last_seen)
  values (left(p_session, 64), left(coalesce(p_path, ''), 300), v_now, v_now)
  on conflict (session_id) do update
    set last_seen = v_now,
        path      = excluded.path;

  -- Keep the table tiny: drop anyone idle beyond 5 minutes (well past the
  -- 60s live window and the 5m secondary figure). Indexed single sweep.
  delete from public.site_presence
   where last_seen < v_now - interval '5 minutes';

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- presence_live_count — the admin dashboard's read.
--   now   : distinct sessions seen within the last 60 seconds (viewing now).
--   last5m: distinct sessions seen within the last 5 minutes (recent reach).
-- Volatile (uses now()); safe as a one-shot read.
-- ---------------------------------------------------------------------------
create or replace function public.presence_live_count()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'now',
    (select count(*) from public.site_presence
      where last_seen >= now() - interval '60 seconds'),
    'last5m',
    (select count(*) from public.site_presence
      where last_seen >= now() - interval '5 minutes')
  );
$$;

revoke all on function public.presence_heartbeat(text, text)
  from public, anon, authenticated;
grant execute on function public.presence_heartbeat(text, text)
  to service_role;

revoke all on function public.presence_live_count()
  from public, anon, authenticated;
grant execute on function public.presence_live_count()
  to service_role;

-- ---------------------------------------------------------------------------
-- Verification (run after applying, in the SQL editor):
--   select public.presence_heartbeat('test-session-1', '/');   -- ok: true
--   select public.presence_live_count();                       -- now: 1, last5m: 1
--   delete from public.site_presence where session_id = 'test-session-1';
-- ---------------------------------------------------------------------------
