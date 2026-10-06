# Veyra

Premium digital-product storefront for practical business systems.
A Caelmont brand.

- **Stage 01 — brand foundation:** design system, marketing site, homepage
- **Stage 02 — complete commerce (this stage):** product page, cart,
  checkout, Dodo Payments hosted payment, webhook-driven verification,
  order + entitlement records
- **Later — fulfillment phase:** licensing/activation,
  download/fulfillment infrastructure, customer accounts
- **Stage 07 — commercial licensing:** activation API with signed offline
  entitlement tokens for the Client Growth System desktop app (see
  “Licensing” below)
- **Stage 08 — purchase-to-delivery automation:** verified payment →
  order → entitlement → licence → receipt email → account download,
  fully automated and idempotent (see “Delivery automation” below)

Veyra's flagship product, **Client Growth System** (USD $79 founding /
$149 regular, one-time, per seat), is
the only purchasable product. The rest of the collection (Client
Acquisition OS, Offer OS, Sales OS, Client Operations OS, Agency Growth OS)
is announced as coming-soon and cannot be added to a cart — enforced in the
catalog type, the cart context, and again server-side at checkout.

# Stack

- **Next.js 16** (App Router, Turbopack, Server Components first)
- **TypeScript** (strict)
- **Tailwind CSS v4** (token-based design system in `globals.css`)
- **Framer Motion 12** (reduced-motion aware)
- **Supabase** (leads + orders via service role, server-only)
- **Dodo Payments** (merchant of record; REST API via fetch, no SDK —
  hosted checkout with a server-set `amount` on a Pay-What-You-Want product)

# Commands

```bash
npm run dev         # development
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint (0 errors)
npm run typecheck   # tsc --noEmit (0 errors)
```

# Architecture

```
src/
├── app/
│   ├── page.tsx                     # homepage — 10-section funnel
│   ├── shop/                        # catalog (available + coming soon)
│   ├── products/[slug]/             # SSG product pages (full journey for CGS)
│   ├── checkout/                    # checkout page + /checkout/complete result
│   ├── api/checkout/                # order creation + hosted Dodo checkout (server-priced)
│   ├── api/webhooks/dodo/           # signature-verified durable confirmation
│   ├── api/orders/[id]/             # safe order status for polling
│   └── api/subscribe/               # lead capture
├── components/                      # ui / layout / home / product / cart / search
├── lib/
│   ├── products.ts                  # CATALOG — single source of truth
│   ├── site.ts                      # brand, nav, USD price formatting
│   ├── dodo-payments.ts             # server-only Dodo REST + webhook signature check
│   └── orders.ts                    # order persistence (Supabase / dev store)
└── supabase/migrations/
    ├── 0001_leads.sql
    └── 0002_orders.sql
```

Product data flows from `lib/products.ts` to everything: shop grid, product
pages, search, homepage, sitemap, and **server-side price resolution**.
Nothing about a price is ever hardcoded in a component or accepted from the
client.

# Commerce architecture

- **Server-side pricing** — `/api/checkout` accepts only slugs, quantities,
  and an email. Amounts are computed from the catalog (`USD`, cents) and are
  the only numbers sent to Dodo (as the checkout's `amount`) or stored in
  `orders`. Seat tiers and coupons stay Veyra's own math. **This only works
  because the Dodo product is Pay-What-You-Want**: on a fixed-price product
  Dodo ignores the sent amount and charges its stored price, silently.
- **Order creation** — a pending order row is recorded first (its uuid is
  the confirmation key, carried to Dodo as checkout `metadata`), then the
  hosted checkout is created; the browser receives only the single-use,
  24-hour checkout URL and is redirected there. The returned `session_id`
  (`cks_…`) is written to `orders.provider_session_id`.
- **Confirmation is webhook-only** — Dodo's hosted checkout has no
  browser-side signature callback. The order becomes `paid` exclusively in
  `/api/webhooks/dodo` when a signature-verified `payment.succeeded` event
  arrives whose amount and currency match our priced order. The customer's
  redirect back to `/checkout/complete` merely opens the polling page,
  which reads the ORDERS TABLE — the UI never shows `paid` unless the
  server says so.
- **Honest states** — `pending` confirmation is displayed as exactly that
  (the result page polls `/api/orders/[id]`). Failed and abandoned
  checkouts simply never receive a `payment.succeeded` event; a payment that
  lands after the browser walked away IS reconciled by the webhook, because
  a confirmed Dodo payment is authoritative.
- **Webhooks: configuration-dependent** — the endpoint verifies the Standard
  Webhooks headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`:
  HMAC-SHA256 over `${id}.${timestamp}.${rawBody}`, base64, keyed by the
  base64-decoded `DODO_PAYMENTS_WEBHOOK_KEY`, timing-safe, 5-minute skew
  limit), resolves the order through the checkout's `metadata`
  (`veyra_order_id`), and checks status + amount + currency before any
  transition. Until the key is set and the URL is registered in the Dodo
  dashboard, the endpoint answers 503 and processes nothing — it never
  generates or trusts local test events.
- **Secrets** — `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY` are read only in server modules. The browser
  receives only the hosted checkout URL, served by the order-creation API,
  and nothing else.

Order statuses: `pending → paid`, with `paid → refunded` driven by the Dodo
`refund.succeeded` webhook — the refund revokes the entitlement, licence,
seats, and activations and emails the customer (see `src/lib/refunds.ts`).
Dodo is the merchant of record: it is the legal seller, calculates and
remits sales tax/VAT, and appears on the customer's statement.

# Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata/sitemap/JSON-LD |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Leads + orders persistence (server-only) |
| `DODO_PAYMENTS_API_KEY` + `DODO_PAYMENTS_PRODUCT_ID_<SLUG>` | Dodo hosted-checkout API (server-only key; product ids are public and may live in `wrangler.jsonc`) |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Webhook signature verification, `whsec_…` (server-only) |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` (default) / `live_mode` — picks the API base URL and the mode banner; keys are mode-scoped |
| `PAYMENT_PROVIDER` | must be `dodo`; any other value fails checkout closed |
| `VEYRA_LICENCE_SIGNING_KEY` + `VEYRA_LICENCE_PUBLIC_KEY_JWK` | Licensing — offline entitlement signing (server-only; the JWK is public material mirrored into the desktop app) |

Every variable degrades gracefully: without Supabase, leads log locally and
orders use a clearly-labelled in-memory dev store; without Dodo,
checkout returns a clean "payments not configured" state (503) — nothing
breaks and nothing pretends to be live.

# Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_leads.sql` → `0028_dodo_payments.sql`
   in order in the SQL editor (skip `0004_reconcile.sql` on a fresh
   project — it's a dev-local fix for the pre-0003 shape). `0028` backfills
   the legacy gateway columns into the processor-agnostic
   `provider_session_id` / `provider_payment_id` and drops the
   Lemon Squeezy / Razorpay columns; every later migration chain assumes the
   Dodo shape.
3. Copy `.env.example` → `.env.local` and fill in the vars, or run
   `npm run dodo:setup` — it audits what is missing and prints the exact
   lines to paste.

# Licensing (Stage 07)

The commercial activation plane for desktop products. Everything is
server-deciding; the desktop app only ever holds the public key.

- `POST /api/licence/activate` — the app presents its licence key
  (`VY-XXXX-XXXX-XXXX`), the purchase email, product slug, and a random
  per-install device id. `public.licence_activate` (Postgres, advisory-
  locked per licence) verifies the full chain — licence exists → active →
  entitlement active → order paid → product matches the registry →
  email owns or holds a seat → active-device count < purchased seats —
  records the device, and the route returns a signed entitlement token.
  Replays are idempotent (`already_active`), never double-count a seat.
- `POST /api/licence/deactivate` — a machine releases its seat for
  another device. `POST /api/licence/revalidate` — the app's opportunistic
  online check behind the offline token (updates `last_seen_at`).
- Token: `base64url(claims).base64url(ES256-P256 sig)` signed with
  `VEYRA_LICENCE_SIGNING_KEY`. Claims carry product, licence reference,
  activation id, device id, seats, issued-at — no expiry (perpetual
  licence). Revocation reaches a machine through the revalidation check.
- Schema: `licence_activations` + `products`/`product_versions` in
  `supabase/migrations/0008_activations.sql` (reuses licences/entitlements/
  seat_assignments — nothing duplicated). Customers manage devices from
  the account licence page; RLS keeps every table private to its owner.
- Tests: `npm run test:licensing` (token crypto + 18-scenario Postgres
  engine suite on PGlite). Live end-to-end: `node
  supabase/test/licensing.e2e.mjs <origin>` against a running deployment.

# Delivery automation (Stage 08)

Buy → pay → account → download → install → activate, with no manual step:

- **One fulfillment chain, three entry points.** `grantPurchaseForOrder`
  (src/lib/fulfillment.ts) turns a paid order into entitlement + licence +
  seat 1 + receipt email. The Dodo webhook, the free-coupon branch
  of the checkout route, and the sign-in claim routine all call it; unique
  constraints make every step idempotent, and a webhook replay after a
  half-failed fulfillment HEALS the gap instead of short-circuiting.
- **Receipt email** (src/lib/email/purchase.ts, Resend over REST, no SDK).
  Sends once per order — a row in `email_events` (0016) unique on
  (order_id, email_type) records the attempt; 'sent' is final, 'failed' or
  abandoned rows are retryable, so replays never double-email and a
  provider outage self-heals. Without `RESEND_API_KEY` the exact email
  renders to the server console.
- **Payment truth is server-side only.** Webhook = Standard Webhooks HMAC
  over `${id}.${timestamp}.${rawBody}` + event status + amount/currency
  match + the order id carried in the checkout's `metadata`. A confirmed
  payment also RECONCILES an order the browser had walked away from — money
  moved, so the product ships (guarded for refunded).
- **Registry-gated downloads.** `/api/download/[slug]` serves only the
  `product_versions` row that is `current` AND `published` AND has an
  uploaded artifact (short-lived signed URL on the private bucket, 5 min).
  Withdrawing a release (`scripts/publish-version.mjs --withdraw`) stops
  deliveries instantly.
- **Releases** are published with
  `node scripts/publish-version.mjs --file <installer> --slug <product>
  --version <x.y.z> [--notes …]` — uploads the artifact first, then points
  the registry at it.
- **Test infrastructure:** `node supabase/test/delivery.e2e.mjs <origin>` —
  drives REAL signed Dodo webhooks (payment.succeeded / refund.succeeded)
  against a dev server started with
  `DODO_PAYMENTS_WEBHOOK_KEY=whsec_<base64 of test_webhook_secret_zzz>`,
  covering the full brief matrix: success, duplicate + delayed webhooks,
  forged signature and amount-mismatch rejection, refund revocation,
  refresh-polling, account rendering, licence creation, download
  authorization, and activation. `npm run dodo:setup` (alias
  `test:payments:config`) audits the credential/product/webhook env and
  prints the exact lines to paste, without any network;
  `npm run test:payments:live` re-runs the audit for the live-mode cutover.

# Dodo Payments — test and live modes

Checkout runs against **Dodo Payments** (`test.dodopayments.com` in
test_mode, `live.dodopayments.com` in live_mode). Credentials come from the
environment; no API key or webhook secret is ever hardcoded, logged, or sent
to the browser — `/api/checkout` returns only the hosted checkout URL.

```bash
# .env.local  — or let `npm run dodo:setup` print these with your values filled in
PAYMENT_PROVIDER=dodo
DODO_PAYMENTS_ENVIRONMENT=test_mode             # test_mode | live_mode
DODO_PAYMENTS_API_KEY=…                         # Dodo → Developers → API keys (mode-scoped)
DODO_PAYMENTS_WEBHOOK_KEY=whsec_…               # the signing secret of the webhook endpoint
DODO_PAYMENTS_PRODUCT_ID_CLIENT_GROWTH_SYSTEM=… # the PAID product's id (pdt_…)
```

### Provider selection is explicit

`PAYMENT_PROVIDER` decides — never the presence of keys:

- `PAYMENT_PROVIDER=dodo` (or `dodo-payments`) → Dodo Payments is the ONLY
  provider. The Razorpay and Lemon Squeezy modules, routes and columns are
  removed; no other provider can be selected from code.
- Any other value fails closed: checkout answers `payment_provider_invalid`
  (500) until the var is fixed. A leftover `razorpay`/`lemonsqueezy` in a
  deployed var can never silently charge through a gateway that isn't there.

The selection lives in `src/lib/payments/provider.ts`.

**Mode is declared, never guessed.** Dodo issues separate test and live keys
and serves them from separate hosts, so `DODO_PAYMENTS_ENVIRONMENT` picks the
base URL and must match the bound key — a live key with `test_mode` 401s at
checkout. The mode is rendered on the checkout page and the admin Settings
page so it is always honest about what is wired. `npm run dodo:setup`
audits it.

## Flow

```
/api/checkout (server-priced) → Dodo hosted checkout (amount, PWYW product)
                              → /api/webhooks/dodo (durable, idempotent)
                              → order PAID → entitlement ACTIVE → licence ACTIVE
                              → registry-gated download → customer account
```

- **Order** — `POST /api/checkout` prices the canonical product
  (`client-growth-system`) from `src/lib/pricing.ts` only, inserts the
  pending order, then creates the hosted checkout carrying the Veyra order
  id in `metadata` (`veyra_order_id`) and `amount` = the exact
  server-computed cents. The session id (`cks_…`) is written to
  `orders.provider_session_id`; the response is just the checkout URL.
- **Webhook** — Standard Webhooks HMAC-SHA256 over
  `${webhook-id}.${webhook-timestamp}.${raw body}` with the base64-decoded
  `whsec_` secret, then event type, payment status, amount + currency, and
  the order resolved through `data.metadata` must all match. Duplicates are
  no-ops: transitions are conditional (`expectedCurrent`),
  entitlements/licences/seats are unique-keyed, and the receipt ledger is
  unique on `(order_id, type)`.
- **Failure** — an abandoned or failed hosted checkout never produces a
  `payment.succeeded` event, so the order stays pending and no entitlement,
  licence, or download authorization can exist (the download route
  requires an active entitlement AND an active licence when one exists —
  revoking either cuts downloads).

## Setting the webhook

Dodo → Developers → Webhooks → *Add endpoint*:

- URL: `https://<public-https-url>/api/webhooks/dodo`
  (production: `https://veyra.caelmont.in/api/webhooks/dodo`)
- Events: `payment.succeeded`, `refund.succeeded`
- Secret: the `whsec_…` signing secret Dodo shows — copy it into
  `DODO_PAYMENTS_WEBHOOK_KEY`

Dodo will not deliver to `localhost` — expose the dev server through a
public HTTPS tunnel and register that URL. Until the key is set the endpoint
answers `503` and trusts nothing. Acknowledge with any 2xx; Dodo retries
non-2xx eight times over ~25 hours, so the route only returns 500 for work
that genuinely must be retried (attribution/revocation), never for events it
can never make sense of.

## Automated checks

```bash
npm run dodo:setup                # credential/product/webhook env audit + env lines
npm run test:payments:live        # same audit, aimed at the live-mode cutover
npm run test:dodo                 # webhook signature verification (crypto only, no network)
npm run test:delivery:e2e         # full fulfillment matrix via signed webhooks
npm run test:licensing            # licence token + activation engine
npm run typecheck && npm run lint
```

## In-browser test matrix

Run against **test_mode with a test key and Dodo's test card only** — never
a real card or bank credential.

| Scenario | Steps | Expected |
| --- | --- | --- |
| Successful payment | 1 seat → checkout → complete on the hosted page with the test card | webhook flips `paid` → entitlement + licence + seat 1 + receipt; account shows product, order, payment status, licence, seats, current version, download |
| Abandoned checkout | load the hosted checkout, walk away | order stays `pending`; nothing granted; download refused |
| Full-coupon order | a 100% code → "Complete your free order" | no gateway at all: order inserted, confirmed, and fulfilled in one request |
| Amount integrity | complete a checkout whose `amount` differs from the product's stored price | it must charge what we sent — if it charges the dashboard price, the product is not Pay-What-You-Want and the webhook logs an amount mismatch instead of paying the order |
| Return redirect | finish payment → Dodo redirects to `return_url` (`/checkout/complete?order=…`) | page polls the orders table; shows `pending` until the webhook lands, then `paid` — the redirect alone never confirms |
| Duplicate webhook | resend the same event from the dashboard's webhook logs, or run `npm run test:delivery:e2e` (sends one signed event twice) | both deliveries `200`; exactly one entitlement, licence, seat, and receipt email |
| Refund | refund the test order in the dashboard | `refund.succeeded` revokes entitlement/licence/seats, order → `refunded`, refund email sent once |

Verify in Supabase after a run:

```sql
select o.status, o.amount, o.currency, o.provider, o.provider_session_id,
       o.provider_payment_id, o.paid_at,
       e.status as entitlement, e.seats, l.licence_reference, l.status as licence,
       (select count(*) from seat_assignments s where s.entitlement_id = e.id) as seats_assigned,
       (select count(*) from email_events m where m.order_id = o.id) as receipt_emails
from orders o
left join entitlements e on e.order_id = o.id
left join licences l on l.entitlement_id = e.id
where o.email = '<the test email you used>';
```

# Design system

Defined once in `src/app/globals.css` (`@theme` + `@layer utilities`):

- **Colors** — warm cream paper (`#fbfaf8`), off-white surfaces, dark ink
  scale, warm neutrals, one restrained champagne-bronze accent (`#8a6320`)
  with amber support.
- **Type** — Fraunces (display), Inter (UI), IBM Plex Mono (eyebrows/specs).
- **Roles** — `.text-display-hero/1/2`, `.text-eyebrow`, `.text-lead`,
  `.spec`, `.tnum`, blueprint grids.
- **Motion** — expo-out, reduced-motion respected everywhere.

Product visuals are **rendered in code** (components/product/*-preview.tsx)
— crisp at any DPI, zero image payload, honestly structural (no fabricated
metrics or client names). No testimonials, reviews, counts, or case studies
anywhere: the site makes no social-proof claims it can't stand behind.
