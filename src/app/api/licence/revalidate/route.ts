import {
  revalidateActivation,
  licensingConfigured,
  activationMessage,
} from "@/lib/licensing/service";
import { jsonCORS, preflight } from "@/lib/licensing/http";

/**
 * POST /api/licence/revalidate — the opportunistic online check behind the
 * offline-signed entitlement token. The desktop app calls this when it
 * happens to be online (app start with connectivity); the server answers
 * from authoritative state: licence + entitlement + purchase still valid,
 * activation still active. On success it refreshes last_seen_at; on
 * failure the app shows the message and re-locks — local data untouched.
 *
 * Body: { activation_id, device_id }
 */
export { preflight as OPTIONS };

export async function POST(request: Request) {
  if (!licensingConfigured()) {
    return jsonCORS(
      { ok: false, code: "server_unavailable", message: activationMessage("server_unavailable") },
      503
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonCORS(
      { ok: false, code: "invalid_input", message: "Invalid request." },
      400
    );
  }
  const { activation_id, device_id } = (body ?? {}) as Record<string, unknown>;
  if (typeof activation_id !== "string" || typeof device_id !== "string") {
    return jsonCORS(
      { ok: false, code: "invalid_input", message: activationMessage("invalid_input") },
      422
    );
  }

  const result = await revalidateActivation({
    activationId: activation_id,
    deviceId: device_id,
  });
  if (!result.ok) {
    return jsonCORS(
      { ok: false, code: result.code, message: activationMessage(result.code) },
      result.code === "server_unavailable" ? 503 : 403
    );
  }
  return jsonCORS({ ok: true, seats: result.seats, seats_used: result.seatsUsed });
}
