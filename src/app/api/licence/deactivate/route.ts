import {
  deactivateDevice,
  licensingConfigured,
  activationMessage,
} from "@/lib/licensing/service";
import { jsonCORS, preflight } from "@/lib/licensing/http";
import { takeRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/licence/deactivate — a device gives its seat back (the app's
 * "Deactivate this device" control, or the account area releasing a
 * machine). Frees the seat for another device.
 *
 * Body: { licence_reference, email, device_id }
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
  const { licence_reference, email, device_id } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof licence_reference !== "string" ||
    typeof email !== "string" ||
    typeof device_id !== "string"
  ) {
    return jsonCORS(
      { ok: false, code: "invalid_input", message: activationMessage("invalid_input") },
      422
    );
  }

  // Shared throttle (src/lib/rate-limit.ts): deactivation is seat-moving
  // and was previously unthrottled; keep brute hammering off the RPC.
  const limited =
    !(await takeRateLimit(`licence:deactivate:${licence_reference}:${email}`, 10, 60))
      .allowed ||
    !(await takeRateLimit(`licence:deactivate:ip:${clientIp(request)}`, 60, 60)).allowed;
  if (limited) {
    return jsonCORS(
      {
        ok: false,
        code: "server_unavailable",
        message: "Too many attempts — wait a moment, then try again.",
      },
      429
    );
  }

  const result = await deactivateDevice({
    licenceReference: licence_reference,
    email,
    deviceId: device_id,
  });
  if (!result.ok) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "not_activated"
          ? 409
          : result.code === "server_unavailable"
            ? 503
            : result.code === "invalid_input"
              ? 422
              : 403;
    return jsonCORS(
      { ok: false, code: result.code, message: activationMessage(result.code) },
      status
    );
  }
  return jsonCORS({ ok: true });
}
