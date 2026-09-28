# Veyra

Premium digital-product storefront for practical business systems.
A Caelmont brand.

- **Stage 01 — brand foundation:** design system, marketing site, homepage
- **Stage 02 — complete commerce (this stage):** product page, cart,
  checkout, Lemon Squeezy hosted payment, webhook-driven verification,
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
- **Lemon Squeezy** (payment processing; REST API via fetch, no SDK —
  hosted checkout with server-set `custom_price`)

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
│   ├── api/checkout/                # order creation + hosted LS checkout (server-priced)
│   ├── api/webhooks/lemonsqueezy/   # signature-verified durable confirmation
│   ├── api/orders/[id]/             # safe order status for polling
│   └── api/subscribe/               # lead capture
├── components/                      # ui / layout / home / product / cart / search
├── lib/
│   ├── products.ts                  # CATALOG — single source of truth
│   ├── site.ts                      # brand, nav, USD price formatting
│   ├── lemon-squeezy.ts             # server-only LS REST + webhook signature check
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
  the only numbers sent to Lemon Squeezy (as the checkout's `custom_price`)
  or stored in `orders`. Seat tiers and coupons stay Veyra's own math;
  Lemon Squeezy charges exactly the amount our server computed.
- **Order creation** — a pending order row is recorded first (its uuid is
  the confirmation key), then a hosted Lemon Squeezy checkout is created
  server-side carrying that order id in `checkout_data.custom`; the browser
  receives only the signed, expiring checkout URL and is redirected there.
- **Confirmation is webhook-only** — Lemon Squeezy's hosted checkout has no
  browser-side signature callback. The order becomes `paid` exclusively in
  `/api/webhooks/lemonsqueezy` when a signature-verified `order_created`
  event arrives whose subtotal matches our priced amount. The customer's
  redirect back to `/checkout/complete` merely opens the polling page,
  which reads the ORDERS TABLE — the UI never shows `paid` unless the
  server says so.
- **Honest states** — `pending` confirmation is displayed as exactly that
  (the result page polls `/api/orders/[id]`). Failed and abandoned
  checkouts simply never receive an `order_created` event; an abandoned
  order that later gets paid IS reconciled (cancelled → paid) by the
  webhook, because a placed Lemon Squeezy order is authoritative.
- **Webhooks: configuration-dependent** — the endpoint verifies the
  `X-Signature` header (HMAC-SHA256 over the raw body with
  `LEMONSQUEEZY_WEBHOOK_SECRET`, timing-safe), resolves the order through
  the checkout's custom data (`meta.custom_event_data.veyra_order_id`),
  and checks event status + amount + currency before any transition.
  Until the secret is set and the URL is registered in the Lemon Squeezy
  dashboard, the endpoint answers 503 and processes nothing — it never
  generates or trusts local test events.
- **Secrets** — `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET`, and
  `SUPABASE_SERVICE_ROLE_KEY` are read only in server modules. The browser
  receives only the hosted checkout URL, served by the order-creation API,
  and nothing else.

Order statuses: `pending → paid | failed | cancelled`, with
`paid → refunded` driven by the Lemon Squeezy `order_refunded` webhook — the
refund revokes the entitlement, licence, seats, and activations and
emails the customer (see `src/lib/refunds.ts`).

# Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata/sitemap/JSON-LD |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Leads + orders persistence (server-only) |
| `LEMONSQUEEZY_API_KEY` + `LEMONSQUEEZY_STORE_ID` + `LEMONSQUEEZY_VARIANT_ID_<SLUG>` | Lemon Squeezy hosted-checkout API (server-only) |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook signature verification (server-only) |
| `LEMONSQUEEZY_MODE` | `test` (default) / `live` — display-only honesty about the wired store mode |
| `VEYRA_LICENCE_SIGNING_KEY` + `VEYRA_LICENCE_PUBLIC_KEY_JWK` | Licensing — offline entitlement signing (server-only; the JWK is public material mirrored into the desktop app) |

Every variable degrades gracefully: without Supabase, leads log locally and
orders use a clearly-labelled in-memory dev store; without Lemon Squeezy,
checkout returns a clean "payments not configured" state — nothing breaks
and nothing pretends to be live.

# Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_leads.sql` → `0020_lemon_squeezy.sql`
   in order in the SQL editor (skip `0004_reconcile.sql` on a fresh
   project — it's a dev-local fix for the pre-0003 shape; on a project
   that ran the earlier 0002 shape, `0020` renames the gateway columns).
3. Copy `.env.example` → `.env.local` and fill in the vars.

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
  seat 1 + receipt email. The Lemon Squeezy webhook, the free-coupon branch
  of the checkout route, and the sign-in claim routine all call it; unique
  constraints make every step idempotent, and a webhook replay after a
  half-failed fulfillment HEALS the gap instead of short-circuiting.
- **Receipt email** (src/lib/email/purchase.ts, Resend over REST, no SDK).
  Sends once per order — a row in `email_events` (0016) unique on
  (order_id, email_type) records the attempt; 'sent' is final, 'failed' or
  abandoned rows are retryable, so replays never double-email and a
  provider outage self-heals. Without `RESEND_API_KEY` the exact email
  renders to the server console.
- **Payment truth is server-side only.** Webhook = HMAC over the raw body
  (`X-Signature`) + event status + amount/currency match + the order the
  checkout carried in its custom data. A placed order also RECONCILES one
  the browser prematurely marked cancelled/failed — money moved, so the
  product ships (guarded for refunded).
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
  drives REAL signed Lemon Squeezy webhooks (order_created / order_refunded)
  against a dev server started with
  `LEMONSQUEEZY_WEBHOOK_SECRET=test_webhook_secret_zzz`, covering the full
  brief matrix: success, duplicate + delayed webhooks, forged signature and
  amount-mismatch rejection, refund revocation, refresh-polling, account
  rendering, licence creation, download authorization, and activation.
  `npm run test:payments:config` audits the credential/variant/webhook env
  without any network; `npm run test:payments:live` additionally validates
  the API key against Lemon Squeezy.

# Lemon Squeezy TEST MODE (end-to-end test environment)

Checkout runs against **Lemon Squeezy's test mode** (store Test Mode toggle
ON + a test-mode API key). Credentials come from the environment; no API
key or webhook secret is ever hardcoded, logged, or sent to the browser —
`/api/checkout` returns only the hosted checkout URL.

```bash
# .env.local
LEMONSQUEEZY_MODE=test                    # test | live (display-only declaration)
LEMONSQUEEZY_API_KEY=…                    # Lemon Squeezy → Developer settings (test key)
LEMONSQUEEZY_STORE_ID=…                   # numeric, same screen
LEMONSQUEEZY_VARIANT_ID_CLIENT_GROWTH_SYSTEM=…   # per purchasable product
LEMONSQUEEZY_VARIANT_ID_GROWTH_AUDIT=…
LEMONSQUEEZY_WEBHOOK_SECRET=…             # the secret you set on the webhook
```

**There is no key-prefix guard anymore.** Razorpay encoded test/live in
the key id (`rzp_test_…`/`rzp_live_…`); Lemon Squeezy keys are opaque
JWTs and the mode lives on the store's Test Mode toggle. The discipline
moved upstream: keep the toggle OFF in production and the test key in
`.env.local`, and let `LEMONSQUEEZY_MODE` (rendered on the checkout page
and the admin Settings page) state honestly which mode is wired.
`npm run test:payments:config` audits this.

## Flow

```
/api/checkout (server-priced) → Lemon Squeezy hosted checkout (custom_price)
                              → /api/webhooks/lemonsqueezy (durable, idempotent)
                              → order PAID → entitlement ACTIVE → licence ACTIVE
                              → registry-gated download → customer account
```

- **Order** — `POST /api/checkout` prices the canonical product
  (`client-growth-system`) from `src/lib/pricing.ts` only, inserts the
  pending order (`lemon_squeezy_*` columns are stamped at confirmation),
  then creates the hosted checkout carrying the Veyra order id in
  `checkout_data.custom` (`veyra_order_id`) and `custom_price` = the exact
  server-computed cents. The response is just the checkout URL.
- **Webhook** — HMAC-SHA256 over the **raw** body with the webhook secret
  (`X-Signature`), then event name, order status, amount + currency, and
  the order resolved through `meta.custom_event_data` must all match.
  Duplicates are no-ops: transitions are conditional (`expectedCurrent`),
  entitlements/licences/seats are unique-keyed, and the receipt ledger is
  unique on `(order_id, type)`.
- **Failure** — an abandoned or failed hosted checkout never produces an
  `order_created` event, so the order stays pending and no entitlement,
  licence, or download authorization can exist (the download route
  requires an active entitlement).

## Setting the webhook (test)

Lemon Squeezy → Store → Settings → Webhooks → *Add webhook*:

- URL: `https://<public-https-url>/api/webhooks/lemonsqueezy`
- Events: `Order created`, `Order refunded`
- Secret: the signing secret you choose (6–40 chars) — copy it into
  `LEMONSQUEEZY_WEBHOOK_SECRET`

Like Razorpay before it, Lemon Squeezy will not deliver to `localhost` —
expose the dev server through a public HTTPS tunnel and register that URL.
Until `LEMONSQUEEZY_WEBHOOK_SECRET` is set the endpoint answers `503` and
trusts nothing.

## Automated checks

```bash
npm run test:payments:config        # credential/variant/webhook env audit
npm run test:payments:live          # + validates the API key against LS GET /user
npm run test:delivery:e2e           # full fulfillment matrix via signed webhooks
npm run test:licensing              # licence token + activation engine
npm run typecheck && npm run lint
```

## In-browser TEST matrix

Run with **test cards only** — never a real card or bank credential.
Lemon Squeezy test mode accepts the test card `4242 4242 4242 4242`, any
future expiry, any CVC.

| Scenario | Steps | Expected |
| --- | --- | --- |
| Successful payment | 1 seat → checkout → complete on the hosted page with the test card | webhook flips `paid` → entitlement + licence + seat 1 + receipt; account shows product, order, payment status, licence, seats, current version, download |
| Abandoned checkout | load the hosted checkout, walk away | order stays `pending`; nothing granted; download refused |
| Full-coupon order | a 100% code → "Complete your free order" | no gateway at all: order inserted, confirmed, and fulfilled in one request |
| Return redirect | finish payment → Lemon Squeezy redirects to `/checkout/complete?order=…` | page polls the orders table; shows `pending` until the webhook lands, then `paid` — the redirect alone never confirms |
| Duplicate webhook | resend the same event from the dashboard's webhook logs, or run `npm run test:delivery:e2e` (sends one signed event twice) | both deliveries `200`; exactly one entitlement, licence, seat, and receipt email |
| Refund | refund the test order in the dashboard | `order_refunded` revokes entitlement/licence/seats, order → `refunded`, refund email sent once |

Verify in Supabase after a run:

```sql
select o.status, o.amount, o.currency, o.lemon_squeezy_order_id, o.paid_at,
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
