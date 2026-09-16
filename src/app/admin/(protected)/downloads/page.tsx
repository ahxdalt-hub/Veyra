import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getDownloadSummary } from "@/lib/admin/data";
import { supabaseAdminConfigured } from "@/lib/supabase/config";
import { timeAgo } from "@/components/admin/format";
import { Panel, PageHeading, EmptyState, StatusPill } from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Downloads" };
export const dynamic = "force-dynamic";

/**
 * Downloads — product delivery registry. Versions come from the server-
 * side registry (product_versions, 0008) with the web catalog's declared
 * version shown alongside when the registry lags. Download counts are
 * real events recorded by the delivery route (download_events, 0011).
 * Storage configuration is reported as a status, never as credentials.
 */

export default async function DownloadsPage() {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const summary = await getDownloadSummary();

  return (
    <div>
      <PageHeading
        title="Downloads"
        meta={
          summary
            ? "Protected delivery — short-lived signed URLs from a private bucket"
            : "Database not connected"
        }
      />

      {!summary ? (
        <Panel>
          <EmptyState
            title="Database not connected"
            body="Add your Supabase credentials to see delivery state."
          />
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {summary.map((d) => (
            <Panel key={d.slug} title={d.name}>
              <div className="space-y-0">
                <Row k="Published version">
                  <span className="font-mono" style={{ color: "var(--cc-text)" }}>
                    v{d.effectiveVersion ?? "—"}
                  </span>
                  <span className="ml-2 text-xs" style={{ color: "var(--cc-text-4)" }}>
                    {d.versionSource === "registry"
                      ? "server registry"
                      : d.versionSource === "catalog"
                        ? "web catalog — promote to registry after a release"
                        : "not set"}
                  </span>
                </Row>
                <Row k="Availability">
                  <StatusPill status={d.purchasable ? "available" : "coming-soon"} />
                </Row>
                <Row k="Delivery status">
                  {d.versionSource !== "registry" ? (
                    <StatusPill status="pending-config" />
                  ) : d.releaseStatus === "withdrawn" ? (
                    <StatusPill status="revoked" />
                  ) : !d.artifactReady ? (
                    <StatusPill status="attention" />
                  ) : (
                    <StatusPill status="healthy" />
                  )}
                  <span className="ml-2 text-xs" style={{ color: "var(--cc-text-4)" }}>
                    {d.versionSource !== "registry"
                      ? "publish this version to the registry to control delivery"
                      : d.releaseStatus === "withdrawn"
                        ? "withdrawn — downloads stopped"
                        : !d.artifactReady
                          ? "release recorded, installer not uploaded yet"
                          : "installer published · serving signed URLs"}
                  </span>
                </Row>
                <Row k="Downloads (all time)">
                  <span className="tnum" style={{ color: "var(--cc-text)" }}>{d.downloadCount}</span>
                  <span className="ml-2 text-xs" style={{ color: "var(--cc-text-4)" }}>
                    {d.lastDownloadAt ? `last ${timeAgo(d.lastDownloadAt)}` : "no events yet"}
                  </span>
                </Row>
                <Row k="Re-delivery requests">
                  <span className="tnum" style={{ color: "var(--cc-text)" }}>{d.redeliveryRequests}</span>
                </Row>
                <Row k="Delivery storage">
                  <StatusPill status={supabaseAdminConfigured() ? "connected" : "pending-config"} />
                </Row>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--cc-text-4)" }}>
        File paths, storage buckets, and signed URLs never appear here —
        only delivery outcomes. Customers authorize against their
        entitlement; every minted URL expires in 5 minutes.
      </p>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--cc-line)" }}>
      <span className="shrink-0 text-xs" style={{ color: "var(--cc-text-4)" }}>{k}</span>
      <span className="text-right text-sm" style={{ color: "var(--cc-text-2)" }}>{children}</span>
    </div>
  );
}
