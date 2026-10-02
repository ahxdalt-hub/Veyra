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
import { isDeliveryPlatform, PLATFORM_LABEL, type DeliveryPlatform } from "@/lib/platforms";
import { takeRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * GET /api/download/[slug]?platform=windows|macos — secure product delivery.
 *
 * Authorization chain, all server-side (a platform choice never weakens
 * any step — it only selects WHICH published artifact the already-
 * authorized request points at):
 *   1. A valid Veyra session (cookies) — anonymous requests stop here.
 *   2. Entitlement check through the session client, so Supabase RLS
 *      guarantees the caller only ever reaches their own entitlements.
 *   3. The product registry decides WHAT ships: per platform (0021), only
 *      the current version with release_status 'published' and an
 *      uploaded artifact (0016). Withdrawing a release stops deliveries
 *      instantly.
 *   4. Only then is a short-lived signed storage URL (service role,
 *      private bucket) minted for that exact artifact key.
 *
 * No permanent public storage URL is ever exposed. If delivery storage
 * isn't configured for this deployment, the endpoint says so honestly
 * instead of faking a download.
 */

const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes — single download intent

/** Customer-facing filename: derived from the artifact's own extension so
 *  an .exe release downloads as an .exe and a .dmg release as a .dmg,
 *  never a .zip. */
function artifactName(objectKey: string, productName: string, version: string): string {
  const ext = objectKey.match(/\.[A-Za-z0-9]+$/)?.[0] ?? ".zip";
  return `Veyra-${productName.replace(/\s+/g, " ")}-v${version}${ext}`;
}

/** Honest "this build isn't shippable yet" state for one platform: same
 *  503 + not_published posture the route has always used (the request-
 *  delivery fallback keys off the code), but naming the pending build so
 *  a Mac customer is never told about a Windows installer. */
function notPublishedResponse(platform: DeliveryPlatform) {
  return NextResponse.json(
    {
      error: `The ${PLATFORM_LABEL[platform]} installer is being published for this product. In the meantime, request delivery and our team will send the current version to your email.`,
      code: "not_published",
    },
    { status: 503 }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  // mode=json hands the signed URL back to the download button (same-origin
  // fetch, so the browser can be pointed at it directly); the default
  // redirects for plain navigation.
  const jsonMode = url.searchParams.get("mode") === "json";
  // Platform selection. Defaults to 'windows' so every existing request
  // (and the legacy redirect/navigation path) is unchanged. An explicit
  // unknown platform is refused — a typo must never silently serve the
  // other OS's installer.
  const platformParam = url.searchParams.get("platform") ?? "windows";
  if (!isDeliveryPlatform(platformParam)) {
    return NextResponse.json(
      { error: "Unsupported platform — choose Windows or Mac.", code: "bad_platform" },
      { status: 400 }
    );
  }

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

  // Abuse throttle — shared, Postgres-backed (src/lib/rate-limit.ts):
  // signing URLs costs service-role API calls; keep scripted hammering
  // off. Authorization itself is unchanged below.
  if (!(await takeRateLimit(`download:${clientIp(request)}`, 30, 300)).allowed) {
    return NextResponse.json(
      { error: "Too many download attempts — try again in a few minutes." },
      { status: 429 }
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

  // 2b. Licence consistency — the authorization rule, made deliberate:
  //     an active entitlement AND an active licence (when one exists)
  //     AND an authenticated account. Revoking ONLY the licence (the
  //     admin revoke action) therefore cuts download access too, exactly
  //     as it cuts activation — no entitlement-only loophole. Products
  //     issued without a licence (free claims) authorize on the
  //     entitlement alone. Checked with the service role so a licence
  //     row is never invisible to this check due to RLS scope.
  const adminEarly = supabaseAdminConfigured()
    ? createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  const { data: licence } = adminEarly
    ? await adminEarly
        .from("licences")
        .select("id, status")
        .eq("entitlement_id", entitlement.id)
        .maybeSingle()
    : { data: null };
  if (licence && licence.status !== "active") {
    return NextResponse.json(
      {
        error:
          "This product's licence is no longer active. Contact support if you believe this is a mistake.",
        code: "licence_revoked",
      },
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

  // 3. Registry decides what ships — per platform: current + published + uploaded.
  const release = await currentRelease(slug, platformParam);
  if (!release) {
    return notPublishedResponse(platformParam);
  }

  // 4. Signed URL — private bucket, short TTL, service role only.
  const bucket = process.env.SUPABASE_DELIVERY_BUCKET;
  if (!adminEarly || !bucket) {
    return notPublishedResponse(platformParam);
  }

  const version = release.version;
  const admin = adminEarly;

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
    return notPublishedResponse(platformParam);
  }

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(release.artifactKey, SIGNED_URL_TTL_SECONDS, {
      download: artifactName(release.artifactKey, product.name, version),
    });

  if (error || !data) {
    console.error(`[download] signed URL failed for ${slug}:`, error?.message);
    return notPublishedResponse(platformParam);
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
