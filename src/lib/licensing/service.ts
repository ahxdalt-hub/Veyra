/**
 * Activation service — the licensing decisions the desktop app makes,
 * centralised so every route shares one error vocabulary.
 *
 * The authoritative checks live in the database (0008_activations.sql:
 * licence_activate / licence_deactivate / licence_revalidate — atomic,
 * race-safe, advisory-locked per licence). This module only:
 *   1. calls those RPCs with the service-role key (privileged write path),
 *   2. maps machine codes to customer-facing messages — professional,
 *      never a database error, never a hint about how the check works,
 *   3. mints the signed entitlement token on success.
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import { licenceSigningKey, licenceSigningConfigured } from "./keys";
import { mintEntitlementToken, type EntitlementClaims } from "./token";

export const LICENCE_REFERENCE_RE = /^VY-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** The app generates 24 random url-safe chars; the DB check allows 16–64. */
export const DEVICE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** Machine-readable outcomes — identical strings on both sides of the
 *  (server ↔ desktop) boundary. Unknown codes must render a generic
 *  fallback, never leak. */
export type ActivationCode =
  | "ok"
  | "invalid_input"
  | "not_found"
  | "licence_revoked"
  | "entitlement_revoked"
  | "purchase_invalid"
  | "product_mismatch"
  | "product_inactive"
  | "not_seat"
  | "seat_limit"
  | "not_activated"
  | "activation_revoked"
  | "server_unavailable";

/** Customer-facing copy for every state the spec lists. No secrets, no
 *  schema, no stack — a person can act on each message. */
export const ACTIVATION_MESSAGES: Record<ActivationCode, string> = {
  ok: "",
  invalid_input:
    "Please enter a valid licence key and the email address on your Veyra account.",
  not_found:
    "We couldn't find a licence with that key. Check the key (it looks like VY-XXXX-XXXX-XXXX) or find it in your Veyra account under Licences.",
  licence_revoked:
    "This licence is no longer active. If you believe this is a mistake, contact Veyra support.",
  entitlement_revoked:
    "This licence is no longer active. If you believe this is a mistake, contact Veyra support.",
  purchase_invalid:
    "The purchase behind this licence isn't confirmed yet. Complete checkout or contact support if you've already paid.",
  product_mismatch:
    "This licence key belongs to a different Veyra product. Sign out and use the key for Client Growth System.",
  product_inactive:
    "This product isn't available for activation at the moment. Please check back or contact support.",
  not_seat:
    "This email doesn't hold a seat on that licence. Ask the licence owner to assign you a seat from their Veyra account.",
  seat_limit:
    "All seats on this licence are currently activated. Deactivate one of your devices from your Veyra account, or from this app's licence settings, then try again.",
  not_activated:
    "This device isn't activated with that licence.",
  activation_revoked:
    "This device's activation was released. Re-enter your licence key to activate again.",
  server_unavailable:
    "We couldn't reach the licensing service. Check your connection and try again.",
};

export function activationMessage(code: ActivationCode): string {
  return ACTIVATION_MESSAGES[code] ?? ACTIVATION_MESSAGES.server_unavailable;
}

function admin() {
  return createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** True when this deployment can activate (service role + signing key). */
export function licensingConfigured(): boolean {
  return supabaseAdminConfigured() && licenceSigningConfigured();
}

export type ActivateInput = {
  licenceReference: string;
  email: string;
  productSlug: string;
  deviceId: string;
  deviceLabel?: string;
};

export type ActivationResult =
  | {
      ok: true;
      action: "activated" | "reactivated" | "already_active";
      token: string;
      claims: EntitlementClaims;
      seats: number;
      seatsUsed: number;
    }
  | { ok: false; code: ActivationCode };

/**
 * Verify the licence chain server-side, record the activation, and return a
 * signed local entitlement token. Replay-safe: the same device re-activating
 * refreshes last-seen and returns a fresh token for the same activation id.
 */
export async function activateDevice(
  input: ActivateInput
): Promise<ActivationResult> {
  if (!licensingConfigured()) {
    return { ok: false, code: "server_unavailable" };
  }
  const reference = input.licenceReference.trim().toUpperCase();
  const email = input.email.trim().toLowerCase();
  if (
    !LICENCE_REFERENCE_RE.test(reference) ||
    !EMAIL_RE.test(email) ||
    !DEVICE_ID_RE.test(input.deviceId)
  ) {
    return { ok: false, code: "invalid_input" };
  }

  const db = admin();
  const { data, error } = await db.rpc("licence_activate", {
    p_licence_reference: reference,
    p_email: email,
    p_product_slug: input.productSlug,
    p_device_id: input.deviceId,
    p_device_label: input.deviceLabel ?? null,
  });
  if (error) {
    console.error("[licensing] licence_activate rpc failed:", error.message);
    return { ok: false, code: "server_unavailable" };
  }

  const res = (data ?? {}) as {
    ok?: boolean;
    code?: ActivationCode;
    action?: string;
    activation_id?: string;
    seats?: number;
    seats_used?: number;
  };
  if (!res.ok || !res.activation_id || !res.action) {
    return { ok: false, code: normaliseCode(res.code) };
  }

  const key = licenceSigningKey()!;
  const { token, claims } = mintEntitlementToken(
    {
      productSlug: input.productSlug,
      licenceReference: reference,
      activationId: res.activation_id,
      deviceId: input.deviceId,
      seats: res.seats ?? 1,
    },
    key
  );
  return {
    ok: true,
    action: res.action as "activated" | "reactivated" | "already_active",
    token,
    claims,
    seats: res.seats ?? 1,
    seatsUsed: res.seats_used ?? 1,
  };
}

export type DeactivateResult = { ok: true } | { ok: false; code: ActivationCode };

export async function deactivateDevice(input: {
  licenceReference: string;
  email: string;
  deviceId: string;
}): Promise<DeactivateResult> {
  if (!licensingConfigured()) {
    return { ok: false, code: "server_unavailable" };
  }
  const { data, error } = await admin().rpc("licence_deactivate", {
    p_licence_reference: input.licenceReference.trim().toUpperCase(),
    p_email: input.email.trim().toLowerCase(),
    p_device_id: input.deviceId,
  });
  if (error) {
    console.error("[licensing] licence_deactivate rpc failed:", error.message);
    return { ok: false, code: "server_unavailable" };
  }
  const res = (data ?? {}) as { ok?: boolean; code?: ActivationCode };
  return res.ok ? { ok: true } : { ok: false, code: normaliseCode(res.code) };
}

export type RevalidateResult =
  | { ok: true; seats: number; seatsUsed: number }
  | { ok: false; code: ActivationCode };

/** Online check behind the offline token: is this activation still real? */
export async function revalidateActivation(input: {
  activationId: string;
  deviceId: string;
}): Promise<RevalidateResult> {
  if (!licensingConfigured()) {
    return { ok: false, code: "server_unavailable" };
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.activationId
    ) ||
    !DEVICE_ID_RE.test(input.deviceId)
  ) {
    return { ok: false, code: "invalid_input" };
  }
  const { data, error } = await admin().rpc("licence_revalidate", {
    p_activation_id: input.activationId,
    p_device_id: input.deviceId,
  });
  if (error) {
    console.error("[licensing] licence_revalidate rpc failed:", error.message);
    return { ok: false, code: "server_unavailable" };
  }
  const res = (data ?? {}) as {
    ok?: boolean;
    code?: ActivationCode;
    seats?: number;
    seats_used?: number;
  };
  return res.ok
    ? { ok: true, seats: res.seats ?? 1, seatsUsed: res.seats_used ?? 1 }
    : { ok: false, code: normaliseCode(res.code) };
}

/** Anything unknown becomes the safe generic — never echo the DB's words. */
const KNOWN: ActivationCode[] = [
  "invalid_input",
  "not_found",
  "licence_revoked",
  "entitlement_revoked",
  "purchase_invalid",
  "product_mismatch",
  "product_inactive",
  "not_seat",
  "seat_limit",
  "not_activated",
  "activation_revoked",
  "server_unavailable",
];
function normaliseCode(code: string | undefined): ActivationCode {
  return (KNOWN as string[]).includes(code ?? "")
    ? (code as ActivationCode)
    : "server_unavailable";
}

/**
 * Deactivate an activation the caller can see (their licence, their seat).
 * Resolves the activation's licence reference + device id server-side so a
 * client can never target another licence's activation by id guessing —
 * RLS already scoped the readable rows at the page level.
 */
export async function deactivateActivationById(input: {
  activationId: string;
  callerEmail: string;
}): Promise<DeactivateResult> {
  if (!licensingConfigured()) {
    return { ok: false, code: "server_unavailable" };
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      input.activationId
    )
  ) {
    return { ok: false, code: "invalid_input" };
  }
  const { data: row } = await admin()
    .from("licence_activations")
    .select("device_id, licence:licences(licence_reference)")
    .eq("id", input.activationId)
    .maybeSingle();
  if (!row) return { ok: false, code: "not_found" };
  return deactivateDevice({
    licenceReference: (row as unknown as { licence: { licence_reference: string } })
      .licence.licence_reference,
    email: input.callerEmail,
    deviceId: row.device_id,
  });
}
