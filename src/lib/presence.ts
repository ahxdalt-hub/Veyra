import "server-only";

import { supabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Live site presence — "how many people are viewing Veyra right now".
 *
 * Server side of the presence beacon. The public storefront posts an
 * anonymous heartbeat to /api/presence (see src/components/layout/
 * presence-beacon.tsx); that route calls recordPresenceHeartbeat. The admin
 * Command Center reads the live count through getLivePresence and shows it
 * in the "LIVE NOW" box at the top of the Overview.
 *
 * State lives in Postgres (public.site_presence, migration 0031), the same
 * shared, cross-isolate store the rate limiter uses — because on Cloudflare
 * Workers an in-memory counter is per-isolate and resets on deploy (see
 * src/lib/rate-limit.ts). Both functions here use the untyped service-role
 * client for the same reason rate-limit.ts does: these RPCs are not in the
 * generated Database type, and responses are narrowed by hand.
 *
 * Both fail soft: when Supabase isn't configured (local dev) or the call
 * errors, the write is a no-op and the read returns null — the admin box
 * then renders an honest "—" rather than a fabricated number.
 */

export type LivePresence = {
  /** Distinct visitors whose last heartbeat was within 60 seconds. */
  now: number;
  /** Distinct visitors seen within the last 5 minutes. */
  last5m: number;
};

/** True when presence can be recorded/read (service role available). */
export function presenceConfigured(): boolean {
  return supabaseAdminClient() !== null;
}

/**
 * Record one visitor heartbeat. Returns true when it landed (or was a no-op
 * because Supabase is absent), false only when the DB call itself failed —
 * callers treat a beacon as best-effort and never surface it to the user.
 */
export async function recordPresenceHeartbeat(
  session: string,
  path: string | null
): Promise<boolean> {
  const admin = supabaseAdminClient();
  if (!admin) return false;
  try {
    const { error } = await admin.rpc("presence_heartbeat", {
      p_session: session,
      p_path: path,
    });
    if (error) {
      console.error("[presence] heartbeat failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[presence] heartbeat threw:", err);
    return false;
  }
}

/**
 * Current live presence for the dashboard, or null when unavailable. Never
 * invents a count: an empty or unreadable result is reported as null and the
 * UI shows "—".
 */
export async function getLivePresence(): Promise<LivePresence | null> {
  const admin = supabaseAdminClient();
  if (!admin) return null;
  try {
    const { data, error } = await admin.rpc("presence_live_count");
    if (error) {
      console.error("[presence] live_count failed:", error.message);
      return null;
    }
    const now = Number((data as { now?: unknown } | null)?.now ?? NaN);
    const last5m = Number((data as { last5m?: unknown } | null)?.last5m ?? NaN);
    if (!Number.isFinite(now) || !Number.isFinite(last5m)) return null;
    return { now, last5m };
  } catch (err) {
    console.error("[presence] live_count threw:", err);
    return null;
  }
}
