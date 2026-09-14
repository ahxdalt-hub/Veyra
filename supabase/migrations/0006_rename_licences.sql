-- Veyra — Stage 05: adopt the "licences" spelling as canonical.
--
-- The application code consistently names the licence table
-- `public.licences`; the database table originated from an earlier
-- experiment as `public.licenses`. This rename makes the database match
-- the code. Index and RLS policy attachments follow the table.
--
-- Idempotent: only renames when `licenses` exists and `licences` does
-- not. Run after 0001 → 0005.

do $$
begin
  if to_regclass('public.licenses') is not null
     and to_regclass('public.licences') is null then
    alter table public.licenses rename to licences;
    raise notice 'renamed public.licenses to public.licences';
  else
    raise notice 'no rename needed (licences already canonical)';
  end if;
end $$;

-- Verification:
--   select to_regclass('public.licences');   -- → public.licences
--   select to_regclass('public.licenses');   -- → null
--   select policyname from pg_policies where tablename = 'licences';
