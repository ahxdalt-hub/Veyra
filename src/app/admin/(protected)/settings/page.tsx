import type { Metadata } from "next";
import Link from "next/link";
import { getSystemHealth, listAuditLog, adminDataLocal } from "@/lib/admin/data";
import { adminPasswordConfigured, ADMIN_SESSION_TTL_MS } from "@/lib/admin/auth";
import { formatDateTime, EmptyState } from "@/components/admin/admin-ui";
import { adminLogoutAction } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Settings — Command Center",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * /admin/settings — system status, configuration indicators, and the
 * audit trail. Status indicators report configuration state ONLY —
 * never secret values. Every health check shown was actually run on
 * this request.
 */

function StatusDot({ status }: { status: "ok" | "warn" | "down" | "unknown" }) {
  const map = {
    ok: { glyph: "✓", cls: "border-cc-good/40 bg-cc-good-soft text-cc-good", label: "Operational" },
    warn: { glyph: "▲", cls: "border-cc-accent/40 bg-cc-accent-soft text-cc-accent", label: "Attention" },
    down: { glyph: "✕", cls: "border-cc-bad/40 bg-cc-bad-soft text-cc-bad", label: "Issue" },
    unknown: { glyph: "•", cls: "border-cc-line-strong bg-cc-panel-3 text-cc-text-3", label: "Unknown" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-[0.6875rem] font-medium ${m.cls}`}>
      <span aria-hidden="true">{m.glyph}</span>
      {m.label}
    </span>
  );
}

export default async function SettingsPage() {
  const [health, audit] = await Promise.all([
    getSystemHealth().catch(() => null),
    listAuditLog(30).catch(() => null),
  ]);

  const sessionHours = Math.round(ADMIN_SESSION_TTL_MS / 3600000);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="spec text-cc-text-4">System</p>
        <h1 className="mt-1.5 font-display text-2xl font-medium tracking-[-0.015em] text-cc-text">
          Settings
        </h1>
      </div>

      {/* System health */}
      <section className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        <div className="border-b border-cc-line px-5 py-3.5">
          <h2 className="font-display text-[0.9375rem] font-medium text-cc-text">
            System status
          </h2>
          <p className="mt-0.5 text-xs text-cc-text-3">
            Checked live on this request — nothing claims health untested.
          </p>
        </div>
        {health === null ? (
          <EmptyState title="Health checks unavailable" />
        ) : (
          <ul>
            {health.map((check) => (
              <li
                key={check.name}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-cc-line/60 px-5 py-3.5 last:border-b-0"
              >
                <div>
                  <p className="text-[0.8125rem] font-medium text-cc-text">
                    {check.name}
                  </p>
                  <p className="mt-0.5 text-xs text-cc-text-3">{check.detail}</p>
                </div>
                <StatusDot status={check.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Admin access */}
      <section className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        <div className="border-b border-cc-line px-5 py-3.5">
          <h2 className="font-display text-[0.9375rem] font-medium text-cc-text">
            Admin access
          </h2>
          <p className="mt-0.5 text-xs text-cc-text-3">
            The admin credential is server-side configuration; its value is
            never displayed, logged, or shipped to the browser.
          </p>
        </div>
        <div className="px-5 py-2">
          <dl>
            <div className="flex items-center justify-between border-b border-cc-line/60 py-3 last:border-b-0">
              <dt className="text-[0.8125rem] text-cc-text-2">
                Admin password (VEYRA_ADMIN_PASSWORD)
              </dt>
              <dd className="text-xs text-cc-text-3">
                {adminPasswordConfigured() ? "Configured — change before production" : "Not configured"}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-cc-line/60 py-3 last:border-b-0">
              <dt className="text-[0.8125rem] text-cc-text-2">Session length</dt>
              <dd className="text-xs text-cc-text-3">{sessionHours} hours, HMAC-signed cookie</dd>
            </div>
            <div className="flex items-center justify-between border-b border-cc-line/60 py-3 last:border-b-0">
              <dt className="text-[0.8125rem] text-cc-text-2">Data access</dt>
              <dd className="text-xs text-cc-text-3">
                Server-side only · service-role key never in client code
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-[0.8125rem] text-cc-text-2">Session</dt>
              <dd>
                <form action={adminLogoutAction}>
                  <button
                    type="submit"
                    className="rounded-sm border border-cc-line px-3 py-1.5 text-xs text-cc-text-2 transition-colors hover:border-cc-bad/50 hover:text-cc-bad"
                  >
                    Sign out now
                  </button>
                </form>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Audit trail */}
      <section className="cc-edge overflow-hidden rounded-md border border-cc-line bg-cc-panel">
        <div className="border-b border-cc-line px-5 py-3.5">
          <h2 className="font-display text-[0.9375rem] font-medium text-cc-text">
            Audit trail
          </h2>
          <p className="mt-0.5 text-xs text-cc-text-3">
            Admin actions, newest first. Actions only — no secrets are ever
            logged.
          </p>
        </div>
        {audit === null || audit.length === 0 ? (
          <EmptyState
            title={adminDataLocal() ? "Audit store not connected" : "No audit entries yet"}
            hint={
              adminDataLocal()
                ? "The audit log persists in Supabase (admin_audit_log, migration 0004)."
                : "Logins, logouts, and admin views will be recorded here."
            }
          />
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {audit.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 border-b border-cc-line/60 px-5 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-cc-text-2">
                    {entry.action}
                  </p>
                  {entry.entity ? (
                    <p className="truncate text-[0.6875rem] text-cc-text-4">
                      {entry.entity}
                      {entry.entity_id ? ` · ${entry.entity_id.slice(0, 18)}…` : ""}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-[0.6875rem] text-cc-text-4">
                  {formatDateTime(entry.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-cc-text-4">
        Public storefront: <Link href="/" className="text-cc-text-3 hover:text-cc-accent">veyra.co</Link>
      </p>
    </div>
  );
}
