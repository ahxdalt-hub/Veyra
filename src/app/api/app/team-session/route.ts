import { jsonCORS, preflight } from "@/lib/licensing/http";
import { takeRateLimit, clientIp } from "@/lib/rate-limit";
import { revalidateActivation } from "@/lib/licensing/service";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseUrl, supabaseAnonKey } from "@/lib/supabase/config";

/**
 * POST /api/app/team-session — bridge a desktop activation into a short-lived
 * Supabase session so the Tauri app can use the shared Team workspace.
 *
 * The desktop app authenticates with signed OFFLINE licence tokens and has no
 * Supabase session of its own. Supabase RLS (migration 0030) only grants the
 * Team workspace to the entitlement owner or an active seat — both keyed by a
 * real auth `user_id`. This endpoint therefore:
 *   1. proves the caller still holds a valid, active activation for this exact
 *      device (reusing the same race-safe, rate-limited check as revalidate);
 *   2. resolves activation → licence → entitlement to the owner's auth user;
 *   3. mints a SINGLE-USE, short-lived magic-link token for that user and
 *      returns it with the public Supabase URL + anon key.
 *
 * The service-role key never leaves the server — only the public URL, the
 * public anon key, and a one-shot hashed token. The desktop exchanges that
 * token for a real session (verifyOtp) and every read/write is then scoped by
 * RLS to the entitlement, exactly like the web app.
 *
 * Fail-closed: any missing step returns a clean, non-revealing code and the
 * app keeps Team as an honest "preview" — it never fabricates a connection.
 *
 * Body: { activation_id, device_id }
 */
export { preflight as OPTIONS };

type TeamSessionErrCode =
  | "invalid_input"
  | "not_activated"
  | "no_account"
  | "server_unavailable"
  | "too_many";

function err(code: TeamSessionErrCode, message: string, status: number): Response {
  return jsonCORS({ ok: false, code, message }, status);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEVICE_RE = /^[A-Za-z0-9_-]{16,64}$/;

export async function POST(request: Request): Promise<Response> {
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  const admin = supabaseAdminClient();
  if (!url || !anon || !admin) {
    return err(
      "server_unavailable",
      "Team sync is unavailable right now. Your local workspace is unaffected.",
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err("invalid_input", "Invalid request.", 422);
  }
  const { activation_id, device_id } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof activation_id !== "string" ||
    typeof device_id !== "string" ||
    !UUID_RE.test(activation_id) ||
    !DEVICE_RE.test(device_id)
  ) {
    return err("invalid_input", "Invalid request.", 422);
  }

  // Throttle: this endpoint mints auth material, so bound it per-activation
  // and per-IP (mirrors /api/licence/revalidate).
  const [byKey, byIp] = await Promise.all([
    takeRateLimit(`team:session:${activation_id}`, 20, 60),
    takeRateLimit(`team:session:ip:${clientIp(request)}`, 60, 60),
  ]);
  if (!byKey.allowed || !byIp.allowed) {
    return err("too_many", "Too many attempts — wait a moment, then try again.", 429);
  }

  // 1. The caller must still hold a real, active activation for this device.
  const check = await revalidateActivation({ activationId: activation_id, deviceId: device_id });
  if (!check.ok) {
    return err("not_activated", "This device isn't activated, so team sync is unavailable.", 403);
  }

  // 2. Resolve activation → licence → entitlement to the owner's identity.
  const { data: activation } = await admin
    .from("licence_activations")
    .select("licence_id")
    .eq("id", activation_id)
    .maybeSingle();
  const licenceId = (activation as { licence_id?: string } | null)?.licence_id;
  if (!licenceId) {
    return err("not_activated", "This device isn't activated, so team sync is unavailable.", 403);
  }

  const { data: licence } = await admin
    .from("licences")
    .select("entitlement_id")
    .eq("id", licenceId)
    .maybeSingle();
  const entitlementId = (licence as { entitlement_id?: string } | null)?.entitlement_id;
  if (!entitlementId) {
    return err(
      "no_account",
      "Team sync needs a Veyra account. Sign in at veyra.caelmont.in with your licence email first.",
      403,
    );
  }

  const { data: entitlement } = await admin
    .from("entitlements")
    .select("user_id, email")
    .eq("id", entitlementId)
    .maybeSingle();
  const ownerUserId = (entitlement as { user_id?: string | null } | null)?.user_id ?? null;
  const ownerEmail = (entitlement as { email?: string } | null)?.email ?? "";

  // RLS only recognises a real auth user. With no owner account we fail closed
  // rather than minting an identity the database would reject anyway.
  if (!ownerUserId || !ownerEmail) {
    return err(
      "no_account",
      "Team sync needs a Veyra account. Sign in at veyra.caelmont.in with your licence email first.",
      403,
    );
  }

  // 3. Mint a single-use, short-lived magic-link token for the owner.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: ownerEmail,
  });
  const hashedToken = link?.properties?.hashed_token ?? null;
  if (linkErr || !hashedToken) {
    return err(
      "server_unavailable",
      "Team sync is unavailable right now. Your local workspace is unaffected.",
      503,
    );
  }

  return jsonCORS(
    { ok: true, supabase_url: url, anon_key: anon, hashed_token: hashedToken, email: ownerEmail },
    200,
  );
}

