-- Veyra — Stage 02 schema
-- Orders created at checkout. One row per payment attempt: a retried
-- payment creates a new order row (kept simple until the webhook phase,
-- which can consolidate state by razorpay_order_id).
--
-- To use: run this in the Supabase SQL editor (after 0001_leads.sql),
-- then set the Razorpay env vars in .env.local (see .env.example).

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  razorpay_order_id   text unique,
  razorpay_payment_id text unique,
  email               text not null,
  product_slug        text not null,
  quantity            integer not null default 1 check (quantity >= 1),
  amount              integer not null check (amount > 0),  -- smallest currency unit (paise)
  currency            text not null default 'USD',
  status              text not null default 'pending'
                        check (status in ('pending','paid','failed','cancelled','refunded')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists orders_email_idx  on public.orders (email);
create index if not exists orders_status_idx on public.orders (status);

-- The API routes use the service role key (server-side only); clients
-- never touch this table directly, so no RLS policies are defined.
alter table public.orders enable row level security;

-- ---------------------------------------------------------------------------
-- Webhooks (foundation in place, configuration-dependent):
--   * POST /api/webhooks/razorpay verifies the x-razorpay-signature header
--     (HMAC-SHA256 over the raw body with RAZORPAY_WEBHOOK_SECRET) and
--     confirms 'pending' orders by razorpay_order_id, making this table the
--     single source of truth even if the customer closes the browser.
--   * The unique constraint on razorpay_order_id gives webhook idempotency
--     for free — upsert confirmation logic can key on it.
--   * Until RAZORPAY_WEBHOOK_SECRET is set and the endpoint is registered
--     in the Razorpay dashboard, the route answers 503 and trusts nothing.
--   * 'refunded' will be set by refund events (Razorpay API or dashboard).
-- ---------------------------------------------------------------------------
