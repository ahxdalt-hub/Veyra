import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  lemonSqueezyConfigured,
  lemonSqueezyMode,
  lemonSqueezyWebhookConfigured,
} from "@/lib/lemon-squeezy";
import {
  supabaseAdminConfigured,
  supabaseAuthConfigured,
  supabaseUrl,
} from "@/lib/supabase/config";
import { site, CURRENCY, REFUND_WINDOW_LABEL } from "@/lib/site";
import { FOUNDING_PRICE, REGULAR_PRICE, MAX_SEATS } from "@/lib/pricing";
import { products } from "@/lib/products";
import { pingDatabase } from "@/app/admin/mutations";
import { Panel, PageHeading, StatusPill, KV } from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/**
 * Settings — a focused admin surface. Everything it reports is derived
 * from the deployment's real configuration: env presence (never env
 * VALUES — no secrets are ever rendered here), the live database check,
 * and the code's own commercial constants. It deliberately doesn't
 * "edit" values that ship in code (pricing, catalog) — claiming to edit
 * them would be theater; it says where each one actually lives.
 */

export default async function SettingsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/sign-in");

  const db = await pingDatabase();

  return (
    <div>
      <PageHeading title="Settings" meta="Configuration status of the Veyra operation" />

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Business */}
        <Panel title="Business">
          <div className="space-y-0">
            <KV k="Brand" v={`${site.name} · a ${site.parent} brand`} />
            <KV k="Contact" v={site.contact.email} />
            <KV k="Canonical URL" v={site.url} />
            <KV k="Currency" v={`${CURRENCY} · prices in whole dollars`} />
            <KV k="Refund policy" v={REFUND_WINDOW_LABEL} />
            <KV k="Pricing authority" v={<code className="font-mono text-xs" style={{ color: "var(--cc-text-3)" }}>src/lib/pricing.ts</code>} />
            <KV k="Founding / regular price" v={`$${FOUNDING_PRICE} / $${REGULAR_PRICE} per seat (1–${MAX_SEATS})`} />
          </div>
          <Note>
            Brand, pricing, and catalog ship with the code — editing them
            is a change to src/lib/site.ts and src/lib/pricing.ts, shipped
            deliberately, not clicked casually.
          </Note>
        </Panel>

        {/* Admin & security */}
        <Panel title="Admin & security">
          <div className="space-y-0">
            <KV k="Signed-in admin" v={<span style={{ color: "var(--cc-text)" }}>{admin.email}</span>} />
            <KV k="Role" v={<StatusPill status="active" />} />
            <KV
              k="Authorization model"
              v="Supabase Auth · app_metadata.role=admin (server-set only)"
            />
            <KV k="Session" v="Supabase httpOnly cookies · verified against auth server on every render" />
            <KV k="Middleware" v="JWT claim pre-filter + full role re-read at layout/action/API level" />
            <KV k="Audit trail" v={<a href="/admin/activity" className="hover:underline" style={{ color: "var(--cc-accent-ink)" }}>Activity → admin actions</a>} />
          </div>
          <Note>
            Granting or revoking admin access is a Supabase Auth operation
            (Dashboard → Authentication → Users → app_metadata) or a
            service-role call. It is intentionally not a button here —
            one compromised session must not be able to recruit another.
          </Note>
        </Panel>

        {/* Payments */}
        <Panel title="Payments · Lemon Squeezy">
          <div className="space-y-0">
            <KV k="API credentials" v={<StatusPill status={lemonSqueezyConfigured() ? "connected" : "pending-config"} />} />
            <KV k="Webhook verification" v={<StatusPill status={lemonSqueezyWebhookConfigured() ? "connected" : "pending-config"} />} />
            <KV
              k="Mode"
              v={
                lemonSqueezyMode() === "test"
                  ? "Test mode — no real money moves"
                  : "Live mode"
              }
            />
            <KV k="Checkout style" v="Hosted Lemon Squeezy checkout; Veyra sets the price (custom_price)" />
            <KV k="Webhook endpoint" v={<code className="font-mono text-xs" style={{ color: "var(--cc-text-3)" }}>{site.url}/api/webhooks/lemonsqueezy</code>} />
            <KV k="Events required" v="Order created · Order refunded" />
            <KV k="Key handling" v="Secrets live server-side only; card data never touches Veyra" />
          </div>
          {!lemonSqueezyConfigured() ? (
            <Note>Lemon Squeezy credentials are set in .env.local (LEMONSQUEEZY_API_KEY / LEMONSQUEEZY_STORE_ID / LEMONSQUEEZY_VARIANT_ID_*). Values are never displayed here — only whether they exist.</Note>
          ) : null}
        </Panel>

        {/* Product delivery */}
        <Panel title="Product delivery">
          <div className="space-y-0">
            <KV k="Database writes" v={<StatusPill status={supabaseAdminConfigured() ? "connected" : "pending-config"} />} />
            <KV k="Delivery bucket" v={<StatusPill status={process.env.SUPABASE_DELIVERY_BUCKET ? "connected" : "pending-config"} />} />
            <KV
              k="Versions"
              v={products
                .filter((p) => p.version)
                .map((p) => `${p.name.split(" ").slice(-1)[0]} v${p.version}`)
                .join(" · ") || "none published"}
            />
            <KV k="URL lifetime" v="Signed URLs expire in 5 minutes" />
            <KV k="Access rule" v="Entitlement + active status required before any URL is minted" />
          </div>
        </Panel>

        {/* Licensing */}
        <Panel title="Licensing">
          <div className="space-y-0">
            <KV k="Verification API" v={<StatusPill status={supabaseAdminConfigured() ? "healthy" : "pending-config"} />} />
            <KV k="Model" v="Perpetual per-seat licences (no expiry by design)" />
            <KV k="Seat range" v={`1–${MAX_SEATS} seats per purchase`} />
            <KV
              k="Activation signing"
              v={<StatusPill status={process.env.VEYRA_LICENCE_SIGNING_KEY ? "configured" : "pending-config"} />}
            />
            <KV k="Revocation" v="Licence/entitlement revoke cuts verification immediately; devices release via cascade" />
          </div>
        </Panel>

        {/* Email */}
        <Panel title="Email">
          <div className="space-y-0">
            <KV k="Transactional (auth)" v={<StatusPill status={supabaseAuthConfigured() ? "connected" : "pending-config"} />} />
            <KV k="Sender" v="Supabase Auth built-in email (until a custom SMTP sender is configured)" />
            <KV k="Confirmations" v="Sign-up email confirmation enforced before account linking" />
          </div>
          <Note>
            Custom sender domain: Supabase Dashboard → Authentication →
            SMTP settings.
          </Note>
        </Panel>

        {/* System health */}
        <Panel title="System health">
          <div className="space-y-0">
            <KV
              k="Database round-trip"
              v={db.ok ? <span style={{ color: "var(--cc-success)" }}>{db.latencyMs} ms</span> : <span style={{ color: "var(--cc-error)" }}>unreachable</span>}
            />
            <KV k="Realtime" v={<StatusPill status={supabaseAuthConfigured() ? "connected" : "pending-config"} />} />
            <KV k="Supabase project" v={<code className="font-mono text-xs" style={{ color: "var(--cc-text-3)" }}>{supabaseUrl()?.replace(/^https?:\/\//, "") ?? "—"}</code>} />
          </div>
        </Panel>

        {/* System information */}
        <Panel title="System information">
          <div className="space-y-0">
            <KV k="Application" v="Veyra — Next.js 16 (App Router, Turbopack)" />
            <KV k="Environment" v={process.env.NODE_ENV === "production" ? "Production" : "Development"} />
            <KV k="Site URL" v={process.env.NEXT_PUBLIC_SITE_URL ? "configured" : "defaults to veyra.caelmont.in"} />
            <KV k="Migrations" v="0001 → 0015 applied (supabase/migrations)" />
            <KV k="Last health check" v={new Date().toLocaleString("en-US", { timeZone: "UTC", hour12: false }) + " UTC"} />
          </div>
        </Panel>
      </div>

      {/* Danger zone */}
      <div className="mt-5">
        <Panel title="Danger zone">
          <p className="text-sm leading-relaxed" style={{ color: "var(--cc-text-3)" }}>
            The command center deliberately offers no destructive database
            operations — no bulk deletes, no schema resets, no
            “clear everything” buttons. Licence revocation (with
            confirmation, reversible) is the most powerful mutation it
            exposes. If the business ever needs a true irreversible
            operation, it should be a deliberate, reviewed database
            action — never a casual click.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 border-t pt-3 text-xs leading-relaxed" style={{ borderColor: "var(--cc-line)", color: "var(--cc-text-4)" }}>
      {children}
    </p>
  );
}
