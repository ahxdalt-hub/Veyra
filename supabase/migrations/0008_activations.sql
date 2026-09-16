-- Veyra — Stage 07: commercial licensing (activations, product registry).
-- Run AFTER 0001 → 0007 (needs entitlements.seats and seat_assignments).
--
-- What this adds, and what it deliberately reuses:
--   * licences — UNCHANGED structure. A licence (0003) already carries the
--     unique reference, product, customer, order lineage (via entitlement),
--     status, and timestamps. Seats are already modelled two ways:
--     entitlement.seats (purchased capacity, 0007) and seat_assignments
--     (which people hold seats, 0007). No duplicates created here.
--   * public.licence_activations — NEW: device-level activation records.
--     Seats answer "who may use the product"; activations answer "which
--     machines are signed in". A seat must be held before a device can
--     activate, and active activations are capped by entitlement.seats.
--   * public.products / public.product_versions — NEW: the server-side
--     product registry. The web catalog (src/lib/products.ts) remains the
--     display source of truth; these tables are the authorization source
--     used by the activation RPC (product exists, is active, has a current
--     version). Seeded to match the catalog.
--   * Download authorization already exists (GET /api/download/[slug] in
--     the app + signed storage URLs) — not duplicated here.
--
-- Security model:
--   * licence_activations has RLS enabled with SELECT for the licence
--     owner / seat holders, and ZERO client write policies. Activation and
--     deactivation happen only through the SECURITY DEFINER functions
--     below (called by the API routes with the service-role key) — the
--     desktop app never writes the table directly.
--   * The functions enforce everything the spec requires server-side:
--     licence exists → licence active → entitlement active → purchase
--     (order) paid → product matches the registry → email owns the licence
--     or holds an assigned seat → seat limit allows activation. An advisory
--     transaction lock per licence makes the seat check + insert atomic,
--     so concurrent activations can never oversell a seat, and a repeated
--     request from the same device is idempotent, never a double-count.
--   * Device identity is a random per-install id the desktop app generates
--     itself (no hardware fingerprinting, no personal information); the
--     optional label is just a human hint like "Windows".

-- ---------------------------------------------------------------------------
-- Product registry — the server-side authorization source for products
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  slug         text primary key,
  name         text not null,
  status       text not null default 'active'
                 check (status in ('active','retired')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.product_versions (
  id           uuid primary key default gen_random_uuid(),
  product_slug text not null references public.products (slug) on delete cascade,
  version      text not null,
  notes        text,
  current      boolean not null default false,
  published_at timestamptz not null default now(),
  unique (product_slug, version)
);

-- At most one "current" version per product.
create unique index if not exists product_versions_current_idx
  on public.product_versions (product_slug) where current;

create index if not exists product_versions_slug_idx
  on public.product_versions (product_slug, published_at desc);

alter table public.products enable row level security;
alter table public.product_versions enable row level security;

-- Read-only to signed-in customers (the account area shows versions);
-- writes only ever happen via the service role (deployment scripts).
drop policy if exists "products_select_authenticated" on public.products;
create policy "products_select_authenticated"
  on public.products for select to authenticated
  using (true);

drop policy if exists "product_versions_select_authenticated" on public.product_versions;
create policy "product_versions_select_authenticated"
  on public.product_versions for select to authenticated
  using (true);

-- Seed to match src/lib/products.ts (the only available product today).
insert into public.products (slug, name, status)
values ('client-growth-system', 'Client Growth System', 'active')
on conflict (slug) do update
  set name = excluded.name, updated_at = now();

insert into public.product_versions (product_slug, version, notes, current)
values ('client-growth-system', '1.0', 'Initial commercial release', true)
on conflict (product_slug, version) do update
  set current = true, notes = excluded.notes;

-- ---------------------------------------------------------------------------
-- Licence activations — one row per (licence, device); active or released
-- ---------------------------------------------------------------------------

create table if not exists public.licence_activations (
  id               uuid primary key default gen_random_uuid(),
  licence_id       uuid not null references public.licences (id) on delete cascade,
  entitlement_id   uuid not null references public.entitlements (id) on delete cascade,
  -- Random per-install identifier held by the desktop app — no hardware
  -- data, no personal information, never reused across licences.
  device_id        text not null check (device_id ~ '^[A-Za-z0-9_-]{16,64}$'),
  -- Human hint only ("Windows", "macOS") — shown in the account area so
  -- the owner can tell machines apart; carries no technical detail.
  device_label     text,
  -- The seat (email) that activated, so deactivation records stay legible.
  activated_email  text not null,
  status           text not null default 'active'
                     check (status in ('active','deactivated')),
  -- 'device'   — the user deactivated this machine themselves
  -- 'seat'     — the owner released the seat holding this device
  -- 'revoked'  — the licence/entitlement was revoked
  deactivated_reason text check (deactivated_reason in ('device','seat','revoked')),
  activated_at     timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  deactivated_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Seat accounting reads: "how many active activations on this licence".
create index if not exists licence_activations_active_idx
  on public.licence_activations (licence_id, status);

-- One ACTIVE activation per device per licence — the database itself makes
-- a duplicate activation request idempotent and impossible to double-count.
create unique index if not exists licence_activations_active_device_idx
  on public.licence_activations (licence_id, device_id) where status = 'active';

create index if not exists licence_activations_email_idx
  on public.licence_activations (activated_email);

alter table public.licence_activations enable row level security;

-- The licence owner (or a user linked through a seat they hold) may SEE
-- the activations on their licence — the account area lists devices.
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
    )
  );
-- Deliberately NO insert/update/delete policies: the SECURITY DEFINER
-- functions below (executed with the service role by the API routes) are
-- the only writers. A customer can never fabricate or edit an activation.

-- ---------------------------------------------------------------------------
-- licence_activate — the atomic activation decision
-- ---------------------------------------------------------------------------
-- Returns jsonb:
--   { ok: true,  action: 'activated'|'reactivated'|'already_active',
--     licence_id, activation_id, seats, seats_used }
--   { ok: false, code: not_found | licence_revoked | entitlement_revoked
--     | purchase_invalid | product_mismatch | product_inactive | not_seat
--     | seat_limit | invalid_input }
--
-- SECURITY DEFINER + service-role call sites only; input is normalized the
-- same way the API route normalizes it. The advisory xact lock serialises
-- activation decisions per licence for the transaction's lifetime, making
-- the seat-limit check race-free.

create or replace function public.licence_activate(
  p_licence_reference text,
  p_email             text,
  p_product_slug      text,
  p_device_id         text,
  p_device_label      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref    text;
  v_email  text;
  v_lic    public.licences%rowtype;
  v_ent    public.entitlements%rowtype;
  v_order  public.orders%rowtype;
  v_prod   public.products%rowtype;
  v_seat   public.seat_assignments%rowtype;
  v_act    public.licence_activations%rowtype;
  v_used   integer;
begin
  -- ---- normalize + validate shape (mirrors the route's checks) ----------
  v_ref   := upper(btrim(coalesce(p_licence_reference, '')));
  v_email := lower(btrim(coalesce(p_email, '')));

  if v_ref !~ '^VY-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or p_product_slug is null or length(btrim(p_product_slug)) = 0
     or p_device_id !~ '^[A-Za-z0-9_-]{16,64}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input');
  end if;

  -- ---- serialise decisions for this licence ------------------------------
  perform pg_advisory_xact_lock(hashtext(v_ref));

  -- ---- the verification chain, in order ----------------------------------
  select * into v_lic from public.licences where licence_reference = v_ref;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_lic.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'licence_revoked');
  end if;

  select * into v_ent from public.entitlements where id = v_lic.entitlement_id;
  if not found or v_ent.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'entitlement_revoked');
  end if;

  select * into v_order from public.orders where id = v_ent.order_id;
  if not found or v_order.status <> 'paid' then
    return jsonb_build_object('ok', false, 'code', 'purchase_invalid');
  end if;

  -- The presented product must be the product the licence was issued for,
  -- and it must exist and be active in the server-side registry.
  if p_product_slug <> v_lic.product_slug then
    return jsonb_build_object('ok', false, 'code', 'product_mismatch');
  end if;
  select * into v_prod from public.products where slug = p_product_slug;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'product_mismatch');
  end if;
  if v_prod.status <> 'active' then
    return jsonb_build_object('ok', false, 'code', 'product_inactive');
  end if;

  -- The presenting email must own the licence or hold a seat on it —
  -- same rule the existing verify endpoint applies.
  if lower(v_lic.email) <> v_email then
    select * into v_seat
      from public.seat_assignments
     where entitlement_id = v_ent.id and lower(email) = v_email;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'not_seat');
    end if;
  end if;

  -- ---- idempotent replay: this device already active on this licence ----
  select * into v_act
    from public.licence_activations
   where licence_id = v_lic.id and device_id = p_device_id and status = 'active';
  if found then
    update public.licence_activations
       set last_seen_at = now(), updated_at = now(),
           device_label = coalesce(p_device_label, device_label)
     where id = v_act.id;
    return jsonb_build_object(
      'ok', true, 'action', 'already_active',
      'licence_id', v_lic.id, 'activation_id', v_act.id,
      'seats', v_ent.seats,
      'seats_used', (select count(*) from public.licence_activations
                      where licence_id = v_lic.id and status = 'active')
    );
  end if;

  -- ---- seat capacity: active activations vs purchased seats --------------
  select count(*) into v_used
    from public.licence_activations
   where licence_id = v_lic.id and status = 'active';
  if v_used >= v_ent.seats then
    return jsonb_build_object('ok', false, 'code', 'seat_limit');
  end if;

  -- ---- reactivate a previously released device, else insert fresh --------
  select * into v_act
    from public.licence_activations
   where licence_id = v_lic.id and device_id = p_device_id
     and status = 'deactivated'
   order by deactivated_at desc nulls last
   limit 1;
  if found then
    update public.licence_activations
       set status = 'active', activated_at = now(), last_seen_at = now(),
           deactivated_at = null, deactivated_reason = null,
           activated_email = v_email, updated_at = now(),
           device_label = coalesce(p_device_label, device_label)
     where id = v_act.id
     returning * into v_act;
    return jsonb_build_object(
      'ok', true, 'action', 'reactivated',
      'licence_id', v_lic.id, 'activation_id', v_act.id,
      'seats', v_ent.seats, 'seats_used', v_used + 1
    );
  end if;

  insert into public.licence_activations
    (licence_id, entitlement_id, device_id, device_label, activated_email)
  values
    (v_lic.id, v_ent.id, p_device_id,
     nullif(btrim(coalesce(p_device_label, '')), ''), v_email)
  returning * into v_act;

  return jsonb_build_object(
    'ok', true, 'action', 'activated',
    'licence_id', v_lic.id, 'activation_id', v_act.id,
    'seats', v_ent.seats, 'seats_used', v_used + 1
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- licence_deactivate — release this device's seat usage
-- ---------------------------------------------------------------------------
-- Same auth chain as activation; marks the row deactivated instead of
-- deleting it (audit trail). After a seat release, reassigning the seat to
-- someone else cascades their devices off (see licence_release_seat).

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
  if lower(v_lic.email) <> v_email then
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

  update public.licence_activations
     set status = 'deactivated', deactivated_at = now(),
         deactivated_reason = 'device', updated_at = now()
   where id = v_act.id;

  return jsonb_build_object('ok', true, 'activation_id', v_act.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- licence_revalidate — online check behind an offline-signed token
-- ---------------------------------------------------------------------------
-- The desktop app sends its stored token when it happens to be online. The
-- server re-derives the decision from authoritative state: licence active,
-- entitlement active, purchase paid, device still active. Success refreshes
-- last_seen_at (and returns seats) so the app can show accurate usage;
-- failure returns the same code vocabulary the activation screen uses.

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
-- Seat release cascade — when an owner removes a seat assignment from the
-- account area, that person's devices release their activation too, so a
-- seat that becomes available is immediately activatable elsewhere.
-- ---------------------------------------------------------------------------

create or replace function public.seat_released_release_activations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.licence_activations
     set status = 'deactivated', deactivated_at = now(),
         deactivated_reason = 'seat', updated_at = now()
   where entitlement_id = old.entitlement_id
     and lower(activated_email) = lower(old.email)
     and status = 'active';
  return old;
end;
$$;

drop trigger if exists seat_release_activations on public.seat_assignments;
create trigger seat_release_activations
  before delete on public.seat_assignments
  for each row execute function public.seat_released_release_activations();

-- ---------------------------------------------------------------------------
-- Revocation cascade — revoking a licence or entitlement releases devices.
-- ---------------------------------------------------------------------------

create or replace function public.licence_revoked_release_activations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'active' then
    update public.licence_activations
       set status = 'deactivated', deactivated_at = now(),
           deactivated_reason = 'revoked', updated_at = now()
     where licence_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists licence_revoke_activations on public.licences;
create trigger licence_revoke_activations
  after update of status on public.licences
  for each row
  when (old.status is distinct from new.status)
  execute function public.licence_revoked_release_activations();

-- ---------------------------------------------------------------------------
-- Execution: only the service role (API routes) calls the functions.
-- ---------------------------------------------------------------------------

revoke all on function public.licence_activate(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.licence_deactivate(text, text, text) from public, anon, authenticated;
revoke all on function public.licence_revalidate(uuid, text) from public, anon, authenticated;
-- service_role bypasses ACL implicitly in Supabase's grants, but be explicit:
grant execute on function public.licence_activate(text, text, text, text, text) to service_role;
grant execute on function public.licence_deactivate(text, text, text) to service_role;
grant execute on function public.licence_revalidate(uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- Verification (run after applying, in the SQL editor):
--   select policyname, cmd from pg_policies where tablename = 'licence_activations';
--     -- → activations_select_own / select only. No client writes.
--   select p.proname from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('licence_activate','licence_deactivate','licence_revalidate');
--   -- as an authenticated customer with the anon key:
--   select * from public.licence_activations;         -- only own licences' rows
--   insert into public.licence_activations(...) ...;  -- → denied
--   select licence_activate('VY-TEST','a@b.co','client-growth-system','x');  -- → 42501
-- ---------------------------------------------------------------------------
