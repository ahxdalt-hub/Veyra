import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import { getProduct } from "@/lib/products";
import { currentRelease } from "@/lib/registry";

/**
 * GET /api/download/[slug] — secure product delivery.
 *
 * Authorization chain, all server-side:
 *   1. A valid Veyra session (cookies) — anonymous requests stop here.
 *   2. Entitlement check through the session client, so Supabase RLS
 *      guarantees the caller only ever reaches their own entitlements.
 *   3. The product registry decides WHAT ships: only the current version
 *      with release_status 'published' and an uploaded artifact (0016).
 *      Withdrawing a release stops deliveries instantly.
 *   4. Only then is a short-lived signed storage URL (service role,
 *      private bucket) minted for that exact artifact key.
 *
 * No permanent public storage URL is ever exposed. If delivery storage
 * isn't configured for this deployment, the endpoint says so honestly
 * instead of faking a download.
 */

const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes — single download intent

/** Customer-facing filename: derived from the artifact's own extension so
 *  an .exe release downloads as an .exe, not a .zip. */
function artifactName(objectKey: string, productName: string, version: string): string {
  const ext = objectKey.match(/\.[A-Za-z0-9]+$/)?.[0] ?? ".zip";
  return `Veyra-${productName.replace(/\s+/g, " ")}-v${version}${ext}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  // mode=json hands the signed URL back to the download button (same-origin
  // fetch, so the browser can be pointed at it directly); the default
  // redirects for plain navigation.
  const jsonMode =
    new URL(request.url).searchParams.get("mode") === "json";

  // 1. Session — the delivery gate.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to your Veyra account to download your products." },
      { status: 401 }
    );
  }

  // 2. Entitlement — RLS-scoped: this query can only return the caller's
  //    active entitlements, so customer isolation is enforced by the
  //    database, not by this route's logic.
  const { data: entitlement } = await supabase
    .from("entitlements")
    .select("id")
    .eq("product_slug", slug)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!entitlement) {
    return NextResponse.json(
      { error: "This product isn't in your library." },
      { status: 403 }
    );
  }

  const product = getProduct(slug);
  if (!product || product.status !== "available") {
    return NextResponse.json(
      { error: "This product isn't available for delivery." },
      { status: 404 }
    );
  }

  // 3. Registry decides what ships — current + published + uploaded.
  const release = await currentRelease(slug);
  if (!release) {
    return NextResponse.json(
      {
        error:
          "The installer is being published for this product. In the meantime, request delivery and our team will send the current version to your email.",
        code: "not_published",
      },
      { status: 503 }
    );
  }

  // 4. Signed URL — private bucket, short TTL, service role only.
  const bucket = process.env.SUPABASE_DELIVERY_BUCKET;
  if (!supabaseAdminConfigured() || !bucket) {
    return NextResponse.json(
      {
        error:
          "The installer is being published for this product. In the meantime, request delivery and our team will send the current version to your email.",
        code: "not_published",
      },
      { status: 503 }
    );
  }

  const version = release.version;
  const admin = createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Honest 404-prevention: a registry row can predate its upload (or be a
  // stale backfill), so confirm the object exists before promising it.
  const exists = await fetch(
    `${supabaseUrl()}/storage/v1/object/${bucket}/${release.artifactKey}`,
    {
      method: "HEAD",
      headers: {
        apikey: supabaseServiceRoleKey()!,
        Authorization: `Bearer ${supabaseServiceRoleKey()}`,
      },
      cache: "no-store",
    }
  ).catch(() => null);
  if (!exists?.ok) {
    console.warn(
      `[download] registry points at missing artifact ${bucket}/${release.artifactKey}`
    );
    return NextResponse.json(
      {
        error:
          "The installer is being published for this product. In the meantime, request delivery and our team will send the current version to your email.",
        code: "not_published",
      },
      { status: 503 }
    );
  }

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(release.artifactKey, SIGNED_URL_TTL_SECONDS, {
      download: artifactName(release.artifactKey, product.name, version),
    });

  if (error || !data) {
    console.error(`[download] signed URL failed for ${slug}:`, error?.message);
    return NextResponse.json(
      {
        error:
          "The installer is being published for this product. In the meantime, request delivery and our team will send the current version to your email.",
        code: "not_published",
      },
      { status: 503 }
    );
  }

  // Record the authorized delivery — the command center's download counts
  // and per-customer download history read exactly this trail. Fire-and-
  // forget: an event-write hiccup must never break a customer download.
  void admin
    .from("download_events")
    .insert({
      product_slug: slug,
      product_version: version,
      email: user.email ?? "",
      user_id: user.id,
    })
    .then(({ error: evErr }) => {
      if (evErr) console.error("[download] event write failed:", evErr.message);
    });

  // Temporary, expiring, authorized — the only URL shape customers see.
  if (jsonMode) {
    return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
  }
  return NextResponse.redirect(data.signedUrl, 302);
}
