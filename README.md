# Standard Practice

Premium digital-product storefront — **Phase 1: brand foundation & marketing site**.

Ready-to-use business systems (client acquisition, follow-up, pipeline, onboarding) sold as Notion / Google Sheets / PDF workspaces for consultants, freelancers, and small studios.

## Stack

- **Next.js 16** (App Router, Turbopack, Server Components first)
- **TypeScript** (strict)
- **Tailwind CSS v4** (token-based design system in `globals.css`)
- **Framer Motion 12** (reduced-motion aware)
- **Supabase** (lead capture; commerce layer arrives in Phase 2)

## Commands

```bash
npm run dev        # development
npm run build      # production build (22 routes)
npm run start      # serve the production build
npm run lint       # eslint (0 errors)
npm run typecheck  # tsc --noEmit (0 errors)
```

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # fonts, SEO defaults, JSON-LD, header/footer shell
│   ├── page.tsx               # homepage — the 10-section funnel (A–J)
│   ├── shop/                  # full catalog
│   ├── products/[slug]/       # SSG product pages + Product JSON-LD
│   ├── categories/[slug]/     # SSG category pages
│   ├── resources/             # lead magnet + content architecture
│   ├── about|contact|account/ # brand & support pages
│   ├── privacy|terms|refund-policy/
│   ├── api/subscribe/         # lead capture (Supabase or dev fallback)
│   ├── sitemap.ts             # 15 URLs, catalog-driven
│   └── robots.ts
├── components/
│   ├── ui/                    # Button, Input, Section, icons, PageHeader
│   ├── motion/                # Reveal, Stagger (prefers-reduced-motion)
│   ├── layout/                # Header (scroll state, ⌘K, cart badge), Footer
│   ├── cart/                  # localStorage cart via useSyncExternalStore
│   ├── search/                # ⌘K dialog, context
│   ├── product/               # ProductCard, previews, AddToCart
│   ├── home/                  # sections A–J
│   └── legal/                 # shared policy shell
└── lib/
    ├── products.ts            # typed catalog — single source of truth
    └── site.ts                # brand config, nav, SEO defaults
```

**Data flow:** `lib/products.ts` drives the shop grid, PDPs, categories, search, homepage featured sections, and the sitemap. Phase 2 replaces its internals with Supabase rows — every consumer already depends only on the exported types/helpers.

## Design system

Defined once in `src/app/globals.css` (`@theme` + `@layer utilities`):

- **Colors** — paper `#fbfaf8`, ink scale, one moss accent `#2f4f3a`, amber + clay support
- **Type** — Fraunces (display, italic accents) · Inter (UI) · IBM Plex Mono (eyebrows/specs)
- **Roles** — `.text-display-hero/1/2`, `.text-eyebrow`, `.text-lead`, `.spec`, `.tnum`
- **Containers** — `.container-page` (76rem), `.container-tight` (42rem)
- **Shadows** — four restrained levels; borders are hairline `--color-line`
- **Motion** — 200–600ms, expo-out; every animated component checks `useReducedMotion()`; global CSS kills transitions under `prefers-reduced-motion`

Product visuals are **rendered in code** (workspace mockups, lead sheets, pipeline boards) — crisp at any DPI, zero image payload, honestly labeled as sample data.

## Supabase setup (lead capture)

1. Create a Supabase project.
2. Run `supabase/migrations/0001_leads.sql` in the SQL editor.
3. Copy `.env.example` → `.env.local`, fill `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

Without env vars the form still works end-to-end in dev mode (submissions log server-side). No code changes are needed to go live.

## Phase 1 boundaries (by design)

- Cart is client-side (localStorage, cross-tab sync); **checkout is not implemented** — the button is honestly labeled as arriving with the commerce launch.
- No payment provider, no auth — the account page explains what arrives instead of faking it.
- No fabricated social proof: no testimonials, no logos, no invented statistics.

## Phase 2 hooks

- `cart-context.tsx` — swap the external store's internals for Supabase line items
- `lib/products.ts` — swap the local array for a `products` table query
- `app/api/subscribe` — pattern ready for order webhooks

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata/sitemap/JSON-LD |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only inserts (never exposed client-side) |
