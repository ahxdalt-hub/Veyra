-- Veyra — one free claim per account (Growth Audit).
--
-- WHY: free products are acquired by POST /api/claim, which walks the
-- real order lifecycle (a $0 'free-claim' order → entitlement + licence).
-- The one-per-account rule lived only as an application check
-- (check-then-insert), so two concurrent requests — or a scripted client —
-- could open several $0 orders and grants for the same account. This
-- index makes the rule a fact of the database: one free-claim order per
-- (account, product), full stop. The claim route treats the resulting
-- unique violation (23505) as "already claimed" and heals fulfillment on
-- the existing order instead of erroring.
--
-- Partial by design: it covers only provider='free-claim' rows, so
-- legitimate repeat purchases of paid products (extra seats) are
-- untouched, and email-keyed guest orders (user_id null) keep linking
-- into accounts via claimPurchasesForUser as they always have.
--
-- NOTE: creation fails loudly if history already contains duplicate
-- free claims for one account — that would be a genuine bug to inspect,
-- not something to paper over with a dedupe statement.
--
-- Idempotent; safe to re-run.

create unique index if not exists orders_one_free_claim_per_user_slug_idx
  on public.orders (user_id, product_slug)
  where provider = 'free-claim' and user_id is not null;

-- Verification:
--   select indexdef from pg_indexes
--     where indexname = 'orders_one_free_claim_per_user_slug_idx';
--   -- expect: CREATE UNIQUE INDEX ... ON public.orders USING btree
--   --   (user_id, product_slug) WHERE ((provider = 'free-claim') AND
--   --   (user_id IS NOT NULL))
