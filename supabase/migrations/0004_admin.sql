-- Veyra — Stage 05 schema: the Admin Command Center.
-- Extends 0001→0003 (run in order). Two new tables only — admin
-- notifications and the internal audit trail. No duplication of orders,
-- customers, products, entitlements, or licences: the admin reads those
-- through the same server-side data layer with the service-role key.
--
-- Access model: RLS is ENABLED with deliberately ZERO policies on both
-- tables. No anon, no authenticated, no Supabase-auth user can ever
-- SELECT/INSERT/UPDATE/DELETE them — not even the admin UI itself. All
-- reads/writes go through Veyra's server code (service role), which is
-- the only client these tables answer to. A customer session therefore
-- cannot list admin notifications or audit entries even if it hits the
-- REST endpoint directly.

-- ---------------------------------------------------------------------------
-- Admin notifications — persistent, acknowledged by a human, never
-- auto-dismissed. Dismissing a notification marks it read; it never
-- deletes the underlying business data it refers to.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_notifications (
  id             uuid primary key default gen_random_uuid(),
  -- 'sale' | 'customer' | 'payment_failed' | 'delivery' | 'system'
  kind           text not null check (kind in ('sale','customer','payment_failed','delivery','system')),
  severity       text not null default 'info' check (severity in ('info','success','warning','error')),
  title          text not null,
  message        text not null,
  -- optional pointer to the business entity (order id, licence id, …)
  related_entity text,
  related_slug   text,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists admin_notifications_read_idx
  on public.admin_notifications (read_at, created_at desc);
create index if not exists admin_notifications_created_idx
  on public.admin_notifications (created_at desc);

alter table public.admin_notifications enable row level security;
-- No policies: service-role server code only.

-- ---------------------------------------------------------------------------
-- Audit log — what the admin did, when. Records actions, never secrets:
-- no passwords, no keys, no signature material.
-- ---------------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id         uuid primary key default gen_random_uuid(),
  -- e.g. 'admin.login', 'admin.logout', 'notification.read', 'order.view'
  action     text not null,
  entity     text,
  entity_id  text,
  detail     text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
-- No policies: service-role server code only.

-- ---------------------------------------------------------------------------
-- Notification creation stays in server code (fulfillment / webhook /
-- verify paths) — NOT a database trigger — because notifications carry
-- product names and amounts resolved from the catalog, and because the
-- payment paths must never fail on a notification hiccup. See
-- src/lib/admin/notifications.ts.
-- ---------------------------------------------------------------------------

-- Verification (after applying):
--   select relname, relrowsecurity from pg_class
--     where relnamespace = 'public'::regnamespace
--       and relname in ('admin_notifications','admin_audit_log');
--   -- as any authenticated customer: both selects return zero rows.
