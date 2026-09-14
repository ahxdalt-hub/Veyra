-- Veyra — Stage 05: usernames.
-- Users may choose a username at signup and sign in with either their
-- email or that username. The username lives on profiles (display +
-- identity alias); auth.users is never modified.
--
-- Ground rules:
--   * Format: 3–20 chars, a-z / 0-9 / underscore, stored lowercase.
--   * Unique via a partial-friendly unique index (nulls allowed —
--     accounts created before this column exist keep username null).
--   * Availability is checked through username_available(), a security
--     definer RPC so the anon signup form can ask without being able to
--     read the profiles table (RLS still scopes direct reads to the
--     owner). It returns only a boolean — no enumeration beyond
--     "this username is taken", which the unique index would leak anyway.
--   * Sign-in by username resolves username → email server-side with the
--     service-role key, then verifies the password through Supabase Auth.
--     No client ever reads another user's email.
--
-- Idempotent; safe to re-run. Run in the SQL editor or via the
-- management API after 0001 → 0004.

-- ---------------------------------------------------------------------------
-- 1. Column + constraints
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists username text;

do $$
begin
  begin
    alter table public.profiles
      add constraint profiles_username_format
      check (username ~ '^[a-z0-9_]{3,20}$');
  exception
    when duplicate_object then null;
    when others then raise warning 'profiles_username_format skipped: %', sqlerrm;
  end;
end $$;

create unique index if not exists profiles_username_uidx
  on public.profiles (username);

-- ---------------------------------------------------------------------------
-- 2. Availability RPC — the only profiles access the anon key gets
-- ---------------------------------------------------------------------------

create or replace function public.username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Same format the application enforces; anything malformed is simply
  -- "not available" so the form shows one consistent message.
  if p_username is null or p_username !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;
  return not exists (
    select 1 from public.profiles where username = lower(p_username)
  );
end;
$$;

grant execute on function public.username_available(text) to anon, authenticated;
revoke all on function public.username_available(text) from public;

-- ---------------------------------------------------------------------------
-- 3. Signup trigger — copy the chosen username from signup metadata
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(new.raw_user_meta_data ->> 'username');
  -- Defensive: never let a bad metadata value fail account creation —
  -- the user can set a username later; the format check would reject it.
  if v_username is not null and v_username !~ '^[a-z0-9_]{3,20}$' then
    v_username := null;
  end if;

  insert into public.profiles (id, full_name, username)
  values (new.id, new.raw_user_meta_data ->> 'full_name', v_username)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Verification (run after applying):
--   select username_available('veyra_user');   -- → t (if unused)
--   select username_available('no');           -- → f (too short)
--   select username from public.profiles;      -- → nulls for legacy users
-- ---------------------------------------------------------------------------
