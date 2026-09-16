import {
  activateDevice,
  activationMessage,
  licensingConfigured,
} from "@/lib/licensing/service";
import { jsonCORS, preflight } from "@/lib/licensing/http";

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

// Basic per-process throttle — same shape as the existing licence verify
// route: enough to stop hammering, no cache dependency. Activation is
// idempotent per device anyway, so replays are safe, not just blocked.
const recent = new Map<string, number>();
const THROTTLE_MS = 5_000;

function throttled(key: string): boolean {
  const last = recent.get(key) ?? 0;
  if (Date.now() - last < THROTTLE_MS) return true;
  recent.set(key, Date.now());
  if (recent.size > 1000) {
    for (const [k, t] of recent) if (Date.now() - t > THROTTLE_MS) recent.delete(k);
  }
  return false;
}

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

  if (throttled(`${licence_reference}:${email}:${device_id}`)) {
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
