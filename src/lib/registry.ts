/**
 * Stage 8 — product registry reads (products / product_versions, 0008+0016).
 *
 * The registry is the AUTHORIZATION source for delivery: a download is
 * only served for the CURRENT version whose release_status is 'published'
 * and whose artifact_key points at an uploaded installer. The web catalog
 * (src/lib/products.ts) stays the display source of truth; this module
 * answers "what may we actually deliver right now?"
 *
 * Server-only (service-role read; the tables are RLS-restricted to
 * authenticated SELECT, but the download path runs with elevated trust
 * and must not be spoofable by a customer-visible row).
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/types";

function adminClient() {
  return createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type ReleaseInfo = {
  version: string;
  /** Private-bucket object key for the installer artifact. */
  artifactKey: string;
  publishedAt: string;
};

/**
 * The downloadable release for a product: the row marked current,
 * published, and backed by an uploaded artifact — or null when nothing
 * may be delivered (registry empty, artifact not yet uploaded, or the
 * current release was withdrawn).
 */
export async function currentRelease(
  slug: string
): Promise<ReleaseInfo | null> {
  if (!supabaseUrl() || !supabaseServiceRoleKey()) return null;
  try {
    const { data, error } = await adminClient()
      .from("product_versions")
      .select("version, artifact_key, published_at")
      .eq("product_slug", slug)
      .eq("current", true)
      .eq("release_status", "published")
      .not("artifact_key", "is", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      version: data.version,
      artifactKey: data.artifact_key as string,
      publishedAt: data.published_at,
    };
  } catch (err) {
    console.error(`[registry] currentRelease(${slug}) failed:`, err);
    return null;
  }
}

/**
 * The current version number for display/communication purposes —
 * published release first, then any current row, then null. Callers that
 * GATE a download must use currentRelease(), not this.
 */
export async function currentVersionNumber(slug: string): Promise<string | null> {
  const release = await currentRelease(slug);
  if (release) return release.version;
  if (!supabaseUrl() || !supabaseServiceRoleKey()) return null;
  try {
    const { data } = await adminClient()
      .from("product_versions")
      .select("version")
      .eq("product_slug", slug)
      .eq("current", true)
      .maybeSingle();
    return data?.version ?? null;
  } catch {
    return null;
  }
}
