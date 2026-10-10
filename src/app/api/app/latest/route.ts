import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import { isDeliveryPlatform } from "@/lib/platforms";

/**
 * GET /api/app/latest?platform=windows|macos&current=1.1.0[&slug=…]
 *
 * The desktop app's "is there a newer build?" probe. PUBLIC and cache-busted:
 * it returns only non-sensitive release metadata (the latest published
 * version, its notes, and where to download). It never exposes the storage
 * key, the artifact URL, or any entitlement data — the app compares the
 * version against its own bundled number and shows an Update badge when it
 * is behind. Authorization is irrelevant here on purpose: a version number
 * is not a secret, and the actual download still goes through the normal
 * session + entitlement + registry chain in /api/download.
 */

const DEFAULT_SLUG = "client-growth-system";

/** Numeric semver compare: is `remote` strictly newer than `current`? */
function semverGt(remote: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const a = parse(remote);
  const b = parse(current);
  for (let i = 0; i < 3; i++) {
    const da = a[i] ?? 0;
    const db = b[i] ?? 0;
    if (da !== db) return da > db;
  }
  return false;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platformParam = url.searchParams.get("platform") ?? "windows";
  const current = url.searchParams.get("current") ?? "";
  const slug = url.searchParams.get("slug") ?? DEFAULT_SLUG;

  if (!isDeliveryPlatform(platformParam)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }
  if (!supabaseAdminConfigured()) {
    return NextResponse.json({ updateAvailable: false });
  }

  try {
    const admin = createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin
      .from("product_versions")
      .select("version, notes")
      .eq("product_slug", slug)
      .eq("platform", platformParam)
      .eq("current", true)
      .eq("release_status", "published")
      .maybeSingle();

    if (error || !data?.version) {
      return NextResponse.json({ updateAvailable: false });
    }

    const updateAvailable = current ? semverGt(data.version, current) : true;
    return NextResponse.json(
      {
        updateAvailable,
        version: data.version,
        notes: data.notes ?? null,
        downloadUrl: `${url.origin}/products/${slug}`,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ updateAvailable: false });
  }
}
