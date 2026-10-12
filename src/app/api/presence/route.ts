import { NextResponse } from "next/server";
import { clientIp, takeRateLimit } from "@/lib/rate-limit";
import { recordPresenceHeartbeat } from "@/lib/presence";

/**
 * /api/presence — the public live-visitor beacon.
 *
 * The storefront (see src/components/layout/presence-beacon.tsx) POSTs an
 * anonymous session id + current path here roughly every 20s while a tab is
 * open. The server records it in Postgres (public.site_presence) so the
 * admin Command Center can show "how many people are viewing right now",
 * shared across every Cloudflare isolate.
 *
 * Privacy by construction: the request carries only a client-generated
 * random id and a path. We do not read or store IP, user agent, or any
 * cookie, and the response never contains the live count — so this public
 * endpoint leaks no traffic figures. The IP is used only, transiently, to
 * rate-limit bursts (below); it is never persisted.
 *
 * Always answers 200 { ok } on the success path and on a throttled request,
 * so the client beacon never has to react; it is fire-and-forget telemetry.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  let session = "";
  let path: string | null = null;
  try {
    const body = (await request.json()) as { session?: unknown; path?: unknown };
    if (typeof body.session === "string") session = body.session.trim();
    if (typeof body.path === "string") path = body.path.slice(0, 300);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE });
  }

  if (!session || session.length > 64) {
    return NextResponse.json({ ok: false }, { status: 400, headers: NO_STORE });
  }

  // Server-side guard against a flood of forged beacons: at most ~8 per 8s
  // per IP. The client sends ~1 per 20s, so honest traffic is far under this;
  // it exists only to blunt abuse. Fail-open by design (takeRateLimit allows
  // the request when the limiter itself is unavailable).
  const rl = await takeRateLimit(`presence:${clientIp(request)}`, 8, 8);
  if (!rl.allowed) {
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  await recordPresenceHeartbeat(session, path);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
