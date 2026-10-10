-- Veyra — Stage 30: optional Team workspaces (live, shared, seat-gated).
--
-- The Client Growth System is local-first: the personal workspace never
-- leaves the machine. Teams who want to work on ONE shared pipeline opt
-- into a Team workspace, which lives here and syncs live between the
-- licensed seats on a single entitlement. Nothing about the personal
-- workspace changes.
--
-- Two tables:
--   * team_workspaces — one shared workspace document per entitlement
--     (the licence), a JSON blob in the same v1 shape as the local one.
--   * team_messages  — lightweight in-app chat for that team.
--
-- Presence ("who's online") and "X is editing Y" pulses are EPHEMERAL and
-- carried over Supabase Realtime broadcast — they are never stored, so
-- there is deliberately no presence table.
--
-- Access model (mirrors 0007_seats.sql exactly): a user may read/write a
-- team workspace iff they own the entitlement OR hold an ACTIVE seat on
-- it. A seat-gate helper (SECURITY DEFINER) centralises the check so the
-- policies stay flat and recursion-free (see 0023).
--
-- Run after 0001 → 0029.

-- ---------------------------------------------------------------------------
-- Access helper — is the caller on this entitlement (owner or active seat)?
-- SECURITY DEFINER so the check itself is not subject to RLS recursion; it
-- only ever returns a boolean derived from entitlements + seat_assignments.
-- ---------------------------------------------------------------------------

create or replace function public.user_has_entitlement_access(ent_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1 from public.entitlements e
      where e.id = ent_id
        and e.user_id = auth.uid()
    )
    or exists (
      select 1 from public.seat_assignments sa
      where sa.entitlement_id = ent_id
        and sa.user_id = auth.uid()
        and sa.status = 'active'
    );
$$;

-- ---------------------------------------------------------------------------
-- team_workspaces — one shared document per entitlement
-- ---------------------------------------------------------------------------

create table if not exists public.team_workspaces (
  id             uuid primary key default gen_random_uuid(),
  -- One team workspace per licence; creating a second is a no-op upsert.
  entitlement_id uuid not null unique references public.entitlements (id) on delete cascade,
  -- The shared workspace document (v1 shape — same as the local document).
  data           jsonb not null default '{}'::jsonb,
  -- Provenance for the "last edited by" affordance; no PII beyond the email
  -- already tied to the seat.
  created_by     uuid references auth.users (id) on delete set null,
  updated_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists team_workspaces_entitlement_idx
  on public.team_workspaces (entitlement_id);

alter table public.team_workspaces enable row level security;

create policy "team_workspaces_select"
  on public.team_workspaces for select to authenticated
  using (public.user_has_entitlement_access(entitlement_id));

-- Any seat-holder may seed the shared workspace (idempotent upsert).
create policy "team_workspaces_insert"
  on public.team_workspaces for insert to authenticated
  with check (public.user_has_entitlement_access(entitlement_id));

-- Any seat-holder may save the shared document.
create policy "team_workspaces_update"
  on public.team_workspaces for update to authenticated
  using (public.user_has_entitlement_access(entitlement_id))
  with check (public.user_has_entitlement_access(entitlement_id));

-- ---------------------------------------------------------------------------
-- team_messages — lightweight chat, newest last
-- ---------------------------------------------------------------------------

create table if not exists public.team_messages (
  id             uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.entitlements (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete set null,
  -- Denormalised so the UI can label a message even if the author later
  -- leaves; taken from the seat, never free-typed.
  author_email   text not null,
  body           text not null check (char_length(body) between 1 and 2000),
  created_at     timestamptz not null default now()
);

create index if not exists team_messages_entitlement_idx
  on public.team_messages (entitlement_id, created_at);

alter table public.team_messages enable row level security;

create policy "team_messages_select"
  on public.team_messages for select to authenticated
  using (public.user_has_entitlement_access(entitlement_id));

create policy "team_messages_insert"
  on public.team_messages for insert to authenticated
  with check (
    public.user_has_entitlement_access(entitlement_id)
    -- A message is always authored by the caller — no spoofing.
    and user_id = auth.uid()
  );

-- Authors may retract their own message only.
create policy "team_messages_delete"
  on public.team_messages for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- updated_at maintenance (self-contained — no dependency on a shared fn)
-- ---------------------------------------------------------------------------

create or replace function public.touch_team_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists team_workspaces_touch on public.team_workspaces;
create trigger team_workspaces_touch
  before update on public.team_workspaces
  for each row execute function public.touch_team_workspace_updated_at();

-- ---------------------------------------------------------------------------
-- Realtime — so the client can subscribe to shared-doc changes and chat.
-- (Presence / editing broadcasts need no table; they ride the same socket.)
-- ---------------------------------------------------------------------------

alter table public.team_workspaces replica identity full;
alter table public.team_messages  replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.team_workspaces;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.team_messages;
  exception when duplicate_object then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- Verification (run after applying):
--   -- as the licence owner or an active seat: the row appears; anyone
--   -- else: zero rows, and inserts/updates are rejected.
--   select * from public.team_workspaces where entitlement_id = '<ent>';
--   -- chat is readable/writable only by the same set of users.
--   select author_email, body, created_at from public.team_messages
--     where entitlement_id = '<ent>' order by created_at;
-- ---------------------------------------------------------------------------

