# Veyra

Premium digital-product storefront for practical business systems.
A Caelmont brand.

- **Stage 01 — brand foundation:** design system, marketing site, homepage
- **Stage 02 — complete commerce (this stage):** product page, cart,
  checkout, Razorpay payment initiation, server-side verification,
  webhook foundation, order + entitlement records
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
- **Razorpay** (payment initiation; REST API via fetch, no SDK)

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
│   ├── api/checkout/                # order creation (server-priced)
│   ├── api/checkout/verify/         # server-side payment verification
│   ├── api/checkout/cancel/         # modal-dismiss → cancelled (pending only)
│   ├── api/webhooks/razorpay/       # signature-verified durable confirmation
│   ├── api/orders/[id]/             # safe order status for polling
│   └── api/subscribe/               # lead capture
├── components/                      # ui / layout / home / product / cart / search
├── lib/
│   ├── products.ts                  # CATALOG — single source of truth
│   ├── site.ts                      # brand, nav, USD price formatting
│   ├── razorpay.ts                  # server-only Razorpay REST + signature check
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
  the only numbers sent to Razorpay or stored in `orders`.
- **Order creation** — a pending order row is recorded, then a Razorpay
  order is created server-side; the browser receives only public data
  (order id, razorpay order id, amount, currency, key id).
- **Verification** — the browser's Razorpay response is treated as a claim.
  `/api/checkout/verify` checks the HMAC signature (server-held secret,
  timing-safe compare), matches the stored `razorpay_order_id`, and fetches
  the payment's authoritative state from Razorpay's API before marking an
  order `paid`. Invalid signatures mark the order `failed`.
- **Honest states** — the UI never shows a confirmed purchase unless the
  server returned `paid`. `pending` verification is displayed as exactly
  that (the result page polls `/api/orders/[id]`). Cancelled and failed are
  explicit, recoverable states.
- **Webhooks: configuration-dependent** — `/api/webhooks/razorpay` verifies
  the `x-razorpay-signature` header (HMAC-SHA256 over the raw body with
  `RAZORPAY_WEBHOOK_SECRET`, timing-safe) and confirms pending orders by
  `razorpay_order_id` (`payment.captured` / `payment.failed`, amount-checked,
  idempotent). Until the secret is set and the URL is registered in the
  Razorpay dashboard, the endpoint answers 503 and processes nothing — it
  never generates or trusts local test events.
- **Secrets** — `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and
  `SUPABASE_SERVICE_ROLE_KEY` are read only in server modules. The browser
  receives only the public key id, served by the order-creation API, and
  nothing else.

Order statuses: `pending → paid | failed | cancelled` (this stage),
`refunded` reserved for the future refund flow.

# Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata/sitemap/JSON-LD |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Leads + orders persistence (server-only) |
| `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` | Razorpay API (server-only) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification (server-only) |
| `VEYRA_LICENCE_SIGNING_KEY` + `VEYRA_LICENCE_PUBLIC_KEY_JWK` | Licensing — offline entitlement signing (server-only; the JWK is public material mirrored into the desktop app) |

Every variable degrades gracefully: without Supabase, leads log locally and
orders use a clearly-labelled in-memory dev store; without Razorpay,
checkout returns a clean "payments not configured" state — nothing breaks
and nothing pretends to be live.

# Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_leads.sql` → `0008_activations.sql`
   in order in the SQL editor (skip `0004_reconcile.sql` on a fresh
   project — it's a dev-local fix for the pre-0003 shape).
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
  seat 1 + receipt email. The verify route, the Razorpay webhook, and the
  sign-in claim routine all call it; unique constraints make every step
  idempotent, and a webhook replay after a half-failed fulfillment HEALS
  the gap instead of short-circuiting.
- **Receipt email** (src/lib/email/purchase.ts, Resend over REST, no SDK).
  Sends once per order — a row in `email_events` (0016) unique on
  (order_id, email_type) records the attempt; 'sent' is final, 'failed' or
  abandoned rows are retryable, so replays never double-email and a
  provider outage self-heals. Without `RESEND_API_KEY` the exact email
  renders to the server console.
- **Payment truth is server-side only.** Verify = signature + stored order
  id + Razorpay's authoritative payment state; webhook = HMAC over the raw
  body + amount/currency match. A `payment.captured` event also
  RECONCILES an order the browser prematurely marked cancelled/failed —
  money moved, so the product ships (guarded for refunded).
- **Registry-gated downloads.** `/api/download/[slug]` serves only the
  `product_versions` row that is `current` AND `published` AND has an
  uploaded artifact (short-lived signed URL on the private bucket, 5 min).
  Withdrawing a release (`scripts/publish-version.mjs --withdraw`) stops
  deliveries instantly.
- **Releases** are published with
  `node scripts/publish-version.mjs --file <installer> --slug <product>
  --version <x.y.z> [--notes …]` — uploads the artifact first, then points
  the registry at it.
- **Test infrastructure:** `node scripts/fake-razorpay.mjs` (local gateway
  with the exact Razorpay API + signature schemes; pair with
  `RAZORPAY_API_BASE` in .env.local — test only) and
  `node supabase/test/delivery.e2e.mjs <origin>` — 33 checks covering the
  full brief matrix: success, failure, cancellation, duplicate + delayed
  webhooks, refresh-polling, account rendering, licence creation, download
  authorization, activation, and forged-signature rejection.

# Razorpay TEST MODE (end-to-end test environment)

Checkout runs against **Razorpay's TEST mode only**. Test credentials come
from the environment; no key, key secret, or webhook secret is ever
hardcoded, logged, or sent to the browser — `/api/checkout` returns only
the public key id.

```bash
# .env.local
RAZORPAY_MODE=test                 # test | live — test is the default
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx  # Razorpay Dashboard (TEST) → API Keys
RAZORPAY_KEY_SECRET=…              # server-side only
RAZORPAY_WEBHOOK_SECRET=…          # the secret you set on the webhook
# RAZORPAY_API_BASE stays UNSET for real test mode; it is local test
# infrastructure (scripts/fake-razorpay.mjs) only.
```

**Live mode is refused by construction.** `src/lib/razorpay.ts` resolves a
mode from `RAZORPAY_MODE` + the key id prefix and fails closed:
a `rzp_live_…` key under `RAZORPAY_MODE=test` (or a `rzp_test_…` key under
`RAZORPAY_MODE=live`) makes `razorpayConfigured()` false, so checkout
answers *payments not configured* and nothing is ever charged. The admin
Settings page shows the resolved mode and the guard.

## Flow

```
Razorpay TEST Checkout → /api/checkout/verify (signature + payment state)
                       → /api/webhooks/razorpay (durable, idempotent)
                       → order PAID → entitlement ACTIVE → licence ACTIVE
                       → registry-gated download → customer account
```

- **Order** — `POST /api/checkout` prices the canonical product
  (`client-growth-system`) from `src/lib/pricing.ts` only, creates the
  Razorpay order server-side, and stores the relationship in `orders`
  (`razorpay_order_id`, customer `email` + `user_id`, `product_slug`,
  `quantity` = seats, `amount`, `currency`) with the Razorpay order's
  `receipt`/`notes.internal_order_id` set to the Veyra order id.
- **Verify** — the browser's callback is a *claim*: HMAC signature +
  Razorpay's authoritative payment state must both agree before
  `pending → paid`.
- **Webhook** — HMAC-SHA256 over the **raw** body with the webhook secret
  (`X-Razorpay-Signature`), then event, payment status, amount + currency,
  and the order must all match. Duplicates are no-ops: transitions are
  conditional (`expectedCurrent`), entitlements/licences/seats are
  unique-keyed, and the receipt ledger is unique on `(order_id, type)`.
  `x-razorpay-event-id` is logged for traceability.
- **Failure** — a failed/cancelled attempt never moves to paid, so no
  entitlement, licence, or download authorization can exist (the download
  route requires an active entitlement).

## Setting the webhook (test)

Dashboard in **TEST mode** → Accounts & Settings → Webhooks → *+ Add New
Webhook* (test-mode OTP `754081`):

- URL: `https://<public-https-url>/api/webhooks/razorpay`
- Events: `payment.captured`, `payment.failed`
- Secret: copy it into `RAZORPAY_WEBHOOK_SECRET`

Razorpay does not deliver to `localhost` and blacklists several tunnel
domains (including `ngrok.io`) — their docs recommend **zrok**. Point the
tunnel at port 3000, then register the tunnel's HTTPS URL. Until
`RAZORPAY_WEBHOOK_SECRET` is set the endpoint answers `503` and trusts
nothing.

## Automated checks

```bash
npm run test:razorpay:config        # credentials/mode/leak audit (no network)
npm run test:razorpay:testmode      # + Razorpay API, order relationship, webhook
npm run test:delivery:e2e           # full fulfillment matrix on the local gateway
npm run test:licensing              # licence token + activation engine
npm run typecheck && npm run lint
```

`test:razorpay:testmode` asserts: mode is test, the key is `rzp_test_…`,
no secret sits behind a `NEXT_PUBLIC_*` variable or inside
`.next/static`, Razorpay accepts the keys, `/api/checkout` returns the
public key id + the server-computed amount (1 seat = $79 → `7900` USD) +
the matching Razorpay order (receipt/notes/amount), no secret in the
response body, and the webhook rejects unsigned/forged deliveries while
ignoring non-captured statuses and amount mismatches. It cancels the
order it creates, so no paid order is left behind. Real capture is not
synthesized — that is the in-browser matrix below.

## In-browser TEST matrix

Run with **test cards only** — never a real card or bank credential.

| Scenario | Steps | Expected |
| --- | --- | --- |
| Successful payment | 1 seat → checkout → card `4100 2800 0000 1007`, any future expiry, random CVV, mock bank **Success**, OTP of 4–10 digits | `paid` → entitlement + licence + seat 1 + receipt; account shows product, order, payment status, licence, seats, current version, download |
| Failed payment | failure card `4100 2800 0004 0005` (card_declined) or mock bank **Failure**, or an OTP below 4 digits | order `failed`; no entitlement/licence/seat; download refused |
| Cancelled checkout | close the Razorpay modal | order `cancelled`, nothing charged; webhook `payment.captured` later (if the payment actually went through) reconciles it to `paid` |
| Refresh / retry | refresh `/checkout/complete?order=…`, or reload the cart and pay again | the result page polls real order status; a retry creates a **new** order row (one row per attempt) |
| Duplicate webhook | resend the same event from the dashboard's webhook logs, or run `npm run test:delivery:e2e` (sends one signed event twice) | both deliveries `200`; exactly one entitlement, licence, seat, and receipt email |

Verify in Supabase after a run:

```sql
select o.status, o.amount, o.currency, o.razorpay_payment_id, o.paid_at,
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
