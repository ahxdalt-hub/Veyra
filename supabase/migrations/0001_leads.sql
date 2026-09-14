-- Veyra — Phase 1 schema
-- Leads captured by the audit lead magnet (/api/subscribe).
--
-- To use: create a Supabase project, run this in the SQL editor,
-- then set the env vars in .env.local (see .env.example).
-- The subscribe route detects the env vars automatically — zero
-- code changes needed.

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text not null default 'homepage',
  created_at timestamptz not null default now()
);

-- One lead per email per source.
create unique index if not exists leads_email_source_idx
  on public.leads (email, source);

-- The API route uses the service role key (server-side only);
-- no RLS policies needed since clients never touch this table directly.
alter table public.leads enable row level security;
