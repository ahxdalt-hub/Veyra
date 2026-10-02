-- Veyra — licensing hardening: device ownership, seat reassignment
-- reconciliation, and revalidation seat re-checks.
--
-- Run AFTER 0008 (replaces three pieces of it). What changes, and why:
--
--   1. licence_deactivate — OWNERSHIP SCOPING. The 0008 version let ANY
--      seat holder deactivate ANY device on the shared licence (the only
--      check was "owner or holds a seat"). Now:
--        licence owner        → may release every device on the licence
--        seat holder          → may release ONLY devices activated with
--                               their own email
--      "allowed even on a revoked licence" is preserved — a legitimate
--      holder must always be able to release their record.
--
--   2. licence_revalidate — SEAT MEMBERSHIP RE-CHECK. The 0008 version
--      checked activation + licence + entitlement + order but never
--      re-verified that the activating email still holds a seat (or is
--      the owner). An email whose seat was reassigned away could keep
--      passing revalidation forever. Now the revalidation re-derives the
--      same owner-or-seat rule activation applies; a failure releases the
--      stale activation (reason 'seat') and answers activation_revoked —
--      an existing code in the desktop app's vocabulary, whose copy
--      ("re-enter your licence key") is exactly the right recovery.
--
--   3. seat_assignments UPDATE trigger — REASSIGNMENT CASCADE. 0008 only
--      released activations on DELETE of a seat assignment, but the
--      account area's reassign flow UPDATEs the row's email in place —
--      so the old holder's devices stayed active ("undead" devices).
--      Now changing a seat's email releases the OLD email's active
--      activations (reason 'seat'), mirroring the DELETE cascade.
--
--   4. licence_activations RLS — DEVICE-VISIBILITY SCOPING. Seat holders
--      previously could SELECT every activation on the entitlement
--      (other people's devices: emails, labels, activation ids). Now the
--      owner sees all devices; a seat holder sees only their own.

-- ---------------------------------------------------------------------------
-- 1. licence_deactivate — owner releases anything, seat holder only their own
-- ---------------------------------------------------------------------------

create or replace function public.licence_deactivate(
  p_licence_reference text,
  p_email             text,
  p_device_id         text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref   text;
  v_email text;
  v_lic   public.licences%rowtype;
  v_ent   public.entitlements%rowtype;
  v_act   public.licence_activations%rowtype;
  v_owner boolean;
begin
  v_ref   := upper(btrim(coalesce(p_licence_reference, '')));
  v_email := lower(btrim(coalesce(p_email, '')));

  if v_ref !~ '^VY-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or p_device_id !~ '^[A-Za-z0-9_-]{16,64}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_ref));

  select * into v_lic from public.licences where licence_reference = v_ref;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  -- Deactivation must always be possible for a legitimate holder — even on
  -- a revoked licence (it releases the record and stops stray tokens).
  select * into v_ent from public.entitlements where id = v_lic.entitlement_id;
  v_owner := lower(v_lic.email) = v_email;
  if not v_owner then
    if not exists (
      select 1 from public.seat_assignments
       where entitlement_id = v_ent.id and lower(email) = v_email
    ) then
      return jsonb_build_object('ok', false, 'code', 'not_seat');
    end if;
  end if;

  select * into v_act
    from public.licence_activations
   where licence_id = v_lic.id and device_id = p_device_id and status = 'active';
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_activated');
  end if;

  -- Ownership scoping: a seat holder may only release the devices THEY
  -- activated. The owner (and the service role / admin paths, which call
  -- with the owner email or bypass via direct updates) may release any.
  if not v_owner and lower(v_act.activated_email) <> v_email then
    return jsonb_build_object('ok', false, 'code', 'not_seat');
  end if;

  update public.licence_activations
     set status = 'deactivated', deactivated_at = now(),
         deactivated_reason = 'device', updated_at = now()
   where id = v_act.id;

  return jsonb_build_object('ok', true, 'activation_id', v_act.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. licence_revalidate — re-derive owner-or-seat before answering
-- ---------------------------------------------------------------------------

create or replace function public.licence_revalidate(
  p_activation_id uuid,
  p_device_id     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_act  public.licence_activations%rowtype;
  v_lic  public.licences%rowtype;
  v_ent  public.entitlements%rowtype;
  v_order public.orders%rowtype;
  v_seat_held boolean;
begin
  if p_device_id !~ '^[A-Za-z0-9_-]{16,64}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  select * into v_act from public.licence_activations where id = p_activation_id;
  if not found or v_act.device_id <> p_device_id then
    return jsonb_build_object('ok', false, 'code', 'not_activated');
  end if;

  select * into v_lic from public.licences where id = v_act.licence_id;
  if not found or v_lic.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'licence_revoked');
  end if;
  select * into v_ent from public.entitlements where id = v_lic.entitlement_id;
  if not found or v_ent.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'licence_revoked');
  end if;
  select * into v_order from public.orders where id = v_ent.order_id;
  if not found or v_order.status <> 'paid' then
    return jsonb_build_object('ok', false, 'code', 'purchase_invalid');
  end if;

  -- Seat membership re-check — the same owner-or-seat rule activation
  -- applies, re-derived from current state. If the activating email has
  -- since lost its seat (seat released or reassigned to someone else),
  -- the stale activation is released here rather than kept alive.
  select
    lower(v_lic.email) = lower(v_act.activated_email)
    or exists (
      select 1 from public.seat_assignments
       where entitlement_id = v_ent.id
         and lower(email) = lower(v_act.activated_email)
    )
  into v_seat_held;
  if not v_seat_held then
    update public.licence_activations
       set status = 'deactivated', deactivated_at = now(),
           deactivated_reason = 'seat', updated_at = now()
     where id = v_act.id and status = 'active';
    return jsonb_build_object('ok', false, 'code', 'activation_revoked');
  end if;

  if v_act.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'activation_revoked');
  end if;

  update public.licence_activations
     set last_seen_at = now(), updated_at = now()
   where id = v_act.id;

  return jsonb_build_object(
    'ok', true, 'seats', v_ent.seats,
    'seats_used', (select count(*) from public.licence_activations
                    where licence_id = v_act.licence_id and status = 'active')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Seat reassignment cascade — changing a seat's email releases the OLD
--    holder's devices, exactly like deleting the assignment does.
-- ---------------------------------------------------------------------------

create or replace function public.seat_reassigned_release_old_activations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(old.email) is distinct from lower(new.email) then
    update public.licence_activations
       set status = 'deactivated', deactivated_at = now(),
           deactivated_reason = 'seat', updated_at = now()
     where entitlement_id = old.entitlement_id
       and lower(activated_email) = lower(old.email)
       and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists seat_reassign_release_activations on public.seat_assignments;
create trigger seat_reassign_release_activations
  after update of email on public.seat_assignments
  for each row
  execute function public.seat_reassigned_release_old_activations();

-- ---------------------------------------------------------------------------
-- 4. Activation visibility — the owner sees every device; a seat holder
--    sees only the devices activated with their own email.
-- ---------------------------------------------------------------------------

drop policy if exists "activations_select_own" on public.licence_activations;
create policy "activations_select_own"
  on public.licence_activations for select to authenticated
  using (
    exists (
      select 1 from public.licences l
      where l.id = licence_activations.licence_id
        and l.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.seat_assignments sa
      where sa.entitlement_id = licence_activations.entitlement_id
        and sa.user_id = (select auth.uid())
        and lower(sa.email) = lower(licence_activations.activated_email)
    )
  );
-- Still deliberately NO client write policies: the SECURITY DEFINER
-- functions remain the only writers.

-- ---------------------------------------------------------------------------
-- Execution grants (unchanged signatures; re-asserted for clarity).
-- ---------------------------------------------------------------------------

revoke all on function public.licence_deactivate(text, text, text) from public, anon, authenticated;
revoke all on function public.licence_revalidate(uuid, text) from public, anon, authenticated;
grant execute on function public.licence_deactivate(text, text, text) to service_role;
grant execute on function public.licence_revalidate(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Verification (run after applying, in the SQL editor):
--   select policyname, cmd from pg_policies where tablename = 'licence_activations';
--     -- → activations_select_own / select only (owner-all, seat-own).
--   select tgname from pg_trigger
--    where tgrelid = 'public.seat_assignments'::regclass and not tgisinternal;
--     -- → seat_release_activations (DELETE) + seat_reassign_release_activations (UPDATE).
--   select p.proname from pg_proc p
--    where p.proname in ('licence_deactivate','licence_revalidate');
--     -- → both recreated from this file.
-- ---------------------------------------------------------------------------
