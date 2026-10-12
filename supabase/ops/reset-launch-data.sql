-- Veyra launch reset — clears ALL customer / test data while keeping the
-- store's configuration and the admin account.
--
--   Back up first: node scripts/sb-backup.mjs
--   Apply:         node scripts/sb-query.mjs --file supabase/ops/reset-launch-data.sql --yes-i-mean-prod
--
-- KEPT (configuration, not customer data):
--   products, product_versions (artifact_key for downloads), coupons,
--   the redeem_codes pool (launch inventory — any redemption
--   performed while testing is cleared back to `available`),
--   the storage object client-growth-system/1.0.0/installer.exe,
--   supabase_migrations history, and every admin auth user
--   (raw_app_meta_data.role = 'admin') plus their profile.
--
-- CLEARED: orders, entitlements, licences, seat assignments, activations,
-- redelivery/download/email events, leads, all legacy_* remnants, the admin
-- audit log + notifications, rate-limit counters (their bucket keys embed
-- customer emails, IPs and licence keys), and every non-admin auth user.
--
-- Idempotent — safe to re-run.

begin;

-- 1. Transactional / customer data. Children before parents so no FK is
--    ever violated regardless of ON DELETE behaviour.
delete from public.seat_assignments;
delete from public.licence_activations;
delete from public.redelivery_requests;
delete from public.download_events;
delete from public.email_events;
delete from public.licences;
delete from public.entitlements;
delete from public.orders;
delete from public.leads;

-- 2. Legacy remnants from the pre-rebuild site.
delete from public.legacy_license_seats;
delete from public.legacy_order_items;
delete from public.legacy_abandoned_checkouts;
delete from public.legacy_reviews;
delete from public.legacy_webhook_events;
delete from public.legacy_customers;
delete from public.legacy_products;

-- 3. Admin operational noise: the audit trail and notification feed only
--    describe the pre-launch testing that is being cleared.
delete from public.admin_notifications;
delete from public.admin_audit_log;

-- 4. Rate-limit counters. Each bucket key embeds customer emails, IPs and
--    licence keys from pre-launch testing, so this is customer data too.
delete from public.rate_limits;

-- 5. Redeem codes: the 10,000-code pool is launch inventory and stays, but
--    any redemption made while testing carries the redeeming customer's
--    email — return those codes to the pool with the PII cleared.
update public.redeem_codes
   set status           = 'available',
       redeemed_email   = null,
       redeemed_order_id = null,
       redeemed_at      = null,
       updated_at       = now()
 where status = 'redeemed';

-- 6. Non-admin auth users. profiles / entitlements / licences /
--    redelivery_requests cascade from auth.users, so they go with the user.
delete from auth.users
 where coalesce(raw_app_meta_data ->> 'role', '') <> 'admin';

commit;
