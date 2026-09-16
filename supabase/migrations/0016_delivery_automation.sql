-- Stage 8 — purchase-to-delivery automation.
--
-- Adds the two pieces the payment→entitlement→licence chain needs to be
-- fully automated without double-firing anything:
--
--   * public.email_events — an at-most-once send ledger for customer
--     emails. A unique (order_id, email_type) claim means the verify
--     route, webhook replays, and the sign-in claim routine can all
--     "send the receipt" and only the first one actually sends. Failed
--     sends flip to 'failed' so a later replay may retry.
--   * public.product_versions gains release metadata: status
--     (draft|published|withdrawn) and the storage artifact_key. The
--     download endpoint authorizes against the CURRENT published row
--     only, so withdrawing a version instantly stops deliveries without
--     touching storage credentials.
--
-- Reuses 0008's registry (products / product_versions) — no parallel
-- version table. Service-role writes only; customers keep the read-only
-- SELECT policy from 0008.

-- ---------------------------------------------------------------
-- Email send ledger
-- ---------------------------------------------------------------

create table if not exists public.email_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null,
  email_type  text not null default 'purchase_receipt',
  to_email    text not null,
  -- 'sending' = claimed, provider call in flight; 'sent' = delivered to
  -- the provider; 'failed' = provider rejected it (retriable).
  status      text not null default 'sending'
              check (status in ('sending', 'sent', 'failed')),
  provider_id text,   -- Resend message id, for support/reconciliation
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (order_id, email_type)
);

create index if not exists email_events_order_idx
  on public.email_events (order_id);

alter table public.email_events enable row level security;
-- Zero policies: anon/authenticated can never read or write this table.
-- Only the service role (API routes) touches it, and it bypasses RLS.

-- ---------------------------------------------------------------
-- Release metadata on the existing version registry (0008)
-- ---------------------------------------------------------------

alter table public.product_versions
  add column if not exists release_status text not null default 'published'
    check (release_status in ('draft', 'published', 'withdrawn')),
  add column if not exists artifact_key text;

-- Backfill: every already-published version used the storage convention
-- the download route was written against.
update public.product_versions
   set artifact_key = product_slug || '/' || version || '/download.zip'
 where artifact_key is null;

comment on column public.product_versions.artifact_key is
  'Private delivery-bucket object key for this release; NULL until an artifact is uploaded.';
comment on column public.product_versions.release_status is
  'published = downloadable; withdrawn = stop serving (existing rows in storage untouched); draft = recorded, not yet served.';
