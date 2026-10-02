-- Razorpay as a TEST payment provider (0022).
--
-- Production checkout remains Lemon Squeezy (0020). This migration only
-- restores a home for Razorpay references on orders so a deployment with
-- RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET set can run the real purchase
-- lifecycle in Razorpay's test mode (local/dev testing).
--
-- 0020 renamed the pre-existing razorpay_order_id / razorpay_payment_id
-- columns to lemon_squeezy_*; fresh, nullable columns are added here with
-- the same unique-index discipline (one Razorpay order per internal order).
-- Nothing existing is touched: provider stays free-text, Lemon Squeezy
-- rows never populate these columns.

alter table public.orders
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text;

-- At most one internal order per Razorpay order id (webhook + verify route
-- resolve payments back to exactly one row). Nullable columns: plain unique
-- indexes allow many NULLs.
drop index if exists orders_razorpay_order_id_uidx;
create unique index if not exists orders_razorpay_order_id_uidx
  on public.orders (razorpay_order_id)
  where razorpay_order_id is not null;

comment on column public.orders.razorpay_order_id is
  '0022 — Razorpay order id (test provider). Set at checkout creation; production checkout (Lemon Squeezy) leaves it null.';
comment on column public.orders.razorpay_payment_id is
  '0022 — Razorpay payment id, written when the payment signature verifies or the order.paid webhook arrives.';
