import {
  activateDevice,
  activationMessage,
  licensingConfigured,
} from "@/lib/licensing/service";
import { jsonCORS, preflight } from "@/lib/licensing/http";
import { takeRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/licence/activate — first-launch activation for Veyra desktop
 * products (Client Growth System). Public unauthenticated endpoint by
 * design: the licence key + purchase email IS the credential, and the
 * server decides everything (licence exists → active → entitlement valid
 * → purchase paid → product matches → seat holder → seat capacity).
 *
 * Returns a signed local entitlement token so the desktop app can keep
 * working fully offline afterwards. No service-role or signing material
 * ever crosses this boundary — the response carries the token, which is
 * worthless to anyone who can't read it, and nothing else.
 *
 * Body: { licence_reference, email, product_slug, device_id, device_label? }
 * 200: { ok:true, action, token, claims, seats, seats_used }
 * 4xx: { ok:false, code, message } — code is the machine vocabulary the
 *      desktop app switches on; message is the customer copy.
 */

export { preflight as OPTIONS };

// Shared throttle — a Postgres-backed fixed-window counter (see
// src/lib/rate-limit.ts), enforced across every Worker isolate, unlike
// the per-isolate Map this replaced. Activation is idempotent per device
// anyway, so replays are safe, not just blocked.

export async function POST(request: Request) {
  if (!licensingConfigured()) {
    return jsonCORS(
      {
        ok: false,
        code: "server_unavailable",
        message:
          "Licensing isn't available on this deployment yet. Please try again later.",
      },
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
  const { licence_reference, email, product_slug, device_id, device_label } =
    (body ?? {}) as Record<string, unknown>;

  if (
    typeof licence_reference !== "string" ||
    typeof email !== "string" ||
    typeof product_slug !== "string" ||
    typeof device_id !== "string" ||
    (device_label !== undefined && typeof device_label !== "string")
  ) {
    return jsonCORS(
      {
        ok: false,
        code: "invalid_input",
        message: "Licence key, account email, product, and device are required.",
      },
      422
    );
  }
  // Cap the free-text label before it reaches the database.
  const label =
    typeof device_label === "string"
      ? device_label.trim().slice(0, 40) || undefined
      : undefined;

  const [byKey, byIp] = await Promise.all([
    takeRateLimit(
      `licence:activate:${licence_reference}:${email}:${device_id}`,
      10,
      60
    ),
    takeRateLimit(`licence:activate:ip:${clientIp(request)}`, 60, 60),
  ]);
  const limited = !byKey.allowed || !byIp.allowed;
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

  const result = await activateDevice({
    licenceReference: licence_reference,
    email,
    productSlug: product_slug.trim().toLowerCase(),
    deviceId: device_id,
    deviceLabel: label,
  });

  if (!result.ok) {
    const status =
      result.code === "not_found" || result.code === "not_activated"
        ? 404
        : result.code === "seat_limit"
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

  return jsonCORS({
    ok: true,
    action: result.action,
    token: result.token,
    claims: result.claims,
    seats: result.seats,
    seats_used: result.seatsUsed,
  });
}
