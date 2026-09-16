"use server";

import { createClient } from "@supabase/supabase-js";
import { requireAdmin, audit } from "@/lib/admin/auth";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import { notifyLicenceEvent, notifyCouponEvent } from "@/lib/admin/notifications";
import { getProduct } from "@/lib/products";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin mutations — the ONLY write surface of the command center.
 *
 * Contract every action here keeps:
 *  - requireAdmin() on every call (fresh service-role role re-read).
 *    Hiding a button is not the protection.
 *  - Mutations go to the real backend with the service role and take
 *    effect immediately — revoking a licence genuinely cuts the next
 *    licence/verify call; coupon edits genuinely change checkout.
 *  - Destructive operations cascade honestly: revoking a licence fires
 *    the DB's revocation cascade (0008) which releases device
 *    activations; nothing is ever hard-deleted.
 *  - Every action is audited (who, what, human summary — never secrets).
 */

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

function admin() {
  return createClient<Database>(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------------ */
/* Licences                                                            */
/* ------------------------------------------------------------------ */

/** Revoke — cuts the licence for every future verification; the DB
 *  cascade releases its active device activations. The customer's
 *  entitlement row stays intact — nothing is destroyed. */
export async function revokeLicenceAction(licenceId: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Your session expired. Sign in again." };
  if (!supabaseAdminConfigured() || !UUID_RE.test(licenceId)) return { ok: false, error: "Invalid licence." };

  const db = admin();
  const { data: licence } = await db
    .from("licences")
    .select("id, email, product_slug, status")
    .eq("id", licenceId)
    .maybeSingle();
  if (!licence) return { ok: false, error: "Licence not found." };
  if (licence.status === "revoked")
    return { ok: false, error: "That licence is already revoked." };

  const { error } = await db
    .from("licences")
    .update({ status: "revoked" })
    .eq("id", licenceId)
    .eq("status", "active");
  if (error) {
    console.error("[admin] revokeLicence failed:", error.message);
    return { ok: false, error: "Couldn't revoke the licence. Try again." };
  }

  notifyLicenceEvent({
    licenceId,
    email: licence.email,
    productName: getProduct(licence.product_slug)?.name ?? licence.product_slug,
    event: "revoked",
  });
  await audit(actor, "licence.revoke", "licences", licenceId, `Revoked licence for ${licence.email}`);
  return { ok: true, message: "Licence revoked — the customer's access was cut immediately." };
}

/** Reactivate — reverses a revocation (device activations stay released;
 *  customers reactivate their machines normally). */
export async function reactivateLicenceAction(licenceId: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Your session expired. Sign in again." };
  if (!UUID_RE.test(licenceId)) return { ok: false, error: "Invalid licence." };

  const db = admin();
  const { data: licence } = await db
    .from("licences")
    .select("id, email, product_slug, status, entitlement_id")
    .eq("id", licenceId)
    .maybeSingle();
  if (!licence) return { ok: false, error: "Licence not found." };
  if (licence.status === "active")
    return { ok: false, error: "That licence is already active." };

  // The entitlement must be active too — revoking an order's whole
  // entitlement is a different (also honest) operation.
  const { data: ent } = await db
    .from("entitlements")
    .select("id, status")
    .eq("id", licence.entitlement_id)
    .maybeSingle();
  if (!ent || ent.status !== "active") {
    return { ok: false, error: "The underlying entitlement is revoked — reactivate it from the order first." };
  }

  const { error } = await db
    .from("licences")
    .update({ status: "active" })
    .eq("id", licenceId)
    .eq("status", "revoked");
  if (error) {
    console.error("[admin] reactivateLicence failed:", error.message);
    return { ok: false, error: "Couldn't reactivate the licence. Try again." };
  }

  notifyLicenceEvent({
    licenceId,
    email: licence.email,
    productName: getProduct(licence.product_slug)?.name ?? licence.product_slug,
    event: "reactivated",
  });
  await audit(actor, "licence.reactivate", "licences", licenceId, `Reactivated licence for ${licence.email}`);
  return { ok: true, message: "Licence reactivated." };
}

/** Deactivate one device of a licence (admin override — the device must
 *  reactivate to use its seat again). */
export async function deactivateActivationAction(
  activationId: string
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Your session expired. Sign in again." };
  if (!UUID_RE.test(activationId)) return { ok: false, error: "Invalid activation." };

  const db = admin();
  const { data: row } = await db
    .from("licence_activations")
    .select("id, status, licence_id, activated_email")
    .eq("id", activationId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Activation not found." };
  if (row.status !== "active") return { ok: false, error: "That device is already deactivated." };

  const { error } = await db
    .from("licence_activations")
    .update({
      status: "deactivated",
      deactivated_at: new Date().toISOString(),
      deactivated_reason: "device",
      updated_at: new Date().toISOString(),
    })
    .eq("id", activationId)
    .eq("status", "active");
  if (error) {
    console.error("[admin] deactivateActivation failed:", error.message);
    return { ok: false, error: "Couldn't deactivate that device." };
  }
  await audit(
    actor,
    "activation.deactivate",
    "licence_activations",
    activationId,
    `Admin deactivated device of ${row.activated_email}`
  );
  return { ok: true, message: "Device deactivated — its seat is free for reactivation." };
}

/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */

export type CouponInput = {
  code: string;
  label: string;
  kind: "percent" | "fixed";
  value: number;
  active: boolean;
  starts_at: string | null; // ISO date or null
  ends_at: string | null;
  min_subtotal: number | null; // whole dollars
  max_uses: number | null;
  per_customer_limit: number | null;
};

/** Server-side validation — the frontend asks politely; this decides. */
function validateCouponInput(input: CouponInput): string | null {
  const code = input.code.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(code))
    return "Code must be 3–40 characters: letters, numbers, hyphens, underscores.";
  if (!input.label.trim() || input.label.trim().length > 120)
    return "A short label (up to 120 characters) is required.";
  if (!Number.isInteger(input.value) || input.value <= 0)
    return "Discount value must be a positive number.";
  if (input.kind === "percent" && input.value > 100)
    return "A percentage can't exceed 100.";
  if (input.kind === "fixed" && input.value > 1_000_000)
    return "Fixed discount is unreasonably large.";
  for (const n of [input.min_subtotal, input.max_uses, input.per_customer_limit]) {
    if (n !== null && (!Number.isInteger(n) || n < 0))
      return "Limits must be whole positive numbers (or left blank).";
  }
  if (input.starts_at && input.ends_at && input.ends_at < input.starts_at)
    return "The end date can't be before the start date.";
  try {
    if (input.starts_at) new Date(input.starts_at + "T00:00:00Z").toISOString();
    if (input.ends_at) new Date(input.ends_at + "T00:00:00Z").toISOString();
  } catch {
    return "Dates are invalid.";
  }
  return null;
}

function couponRow(input: CouponInput) {
  return {
    code: input.code.trim().toLowerCase(),
    label: input.label.trim(),
    kind: input.kind,
    value: input.value,
    active: input.active,
    starts_at: input.starts_at,
    ends_at: input.ends_at,
    min_subtotal: input.min_subtotal === 0 ? null : input.min_subtotal,
    max_uses: input.max_uses === 0 ? null : input.max_uses,
    per_customer_limit:
      input.per_customer_limit === 0 ? null : input.per_customer_limit,
  };
}

export async function createCouponAction(input: CouponInput): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Your session expired. Sign in again." };
  const problem = validateCouponInput(input);
  if (problem) return { ok: false, error: problem };

  const db = admin();
  const { data: created, error } = await db
    .from("coupons")
    .insert({ ...couponRow(input), used_count: 0 })
    .select("code")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "A coupon with that code already exists." };
    console.error("[admin] createCoupon failed:", error.message);
    return { ok: false, error: "Couldn't create the coupon." };
  }
  if (!created) return { ok: false, error: "Couldn't create the coupon." };
  notifyCouponEvent({ couponId: created.code, code: created.code, event: "created" });
  await audit(actor, "coupon.create", "coupons", created.code, `Created coupon ${created.code.toUpperCase()}`);
  return { ok: true, message: "Coupon created — it works at checkout immediately." };
}

export async function updateCouponAction(
  originalCode: string,
  input: CouponInput
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Your session expired. Sign in again." };
  const problem = validateCouponInput(input);
  if (problem) return { ok: false, error: problem };
  const db = admin();
  const next = couponRow(input);
  const { error } = await db.from("coupons").update(next).eq("code", originalCode);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Another coupon already uses that code." };
    console.error("[admin] updateCoupon failed:", error.message);
    return { ok: false, error: "Couldn't save the coupon." };
  }
  notifyCouponEvent({ couponId: originalCode, code: originalCode, event: "updated" });
  await audit(
    actor,
    "coupon.update",
    "coupons",
    originalCode,
    `Updated coupon ${originalCode.toUpperCase()}`
  );
  return { ok: true, message: "Coupon updated." };
}

export async function setCouponActiveAction(
  code: string,
  active: boolean
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Your session expired. Sign in again." };
  const db = admin();
  const { error } = await db.from("coupons").update({ active, updated_at: new Date().toISOString() }).eq("code", code);
  if (error) {
    console.error("[admin] setCouponActive failed:", error.message);
    return { ok: false, error: "Couldn't update the coupon." };
  }
  notifyCouponEvent({
    couponId: code,
    code,
    event: active ? "reactivated" : "deactivated",
  });
  await audit(
    actor,
    active ? "coupon.reactivate" : "coupon.deactivate",
    "coupons",
    code,
    `${active ? "Reactivated" : "Deactivated"} coupon ${code.toUpperCase()}`
  );
  return {
    ok: true,
    message: active
      ? "Coupon reactivated."
      : "Coupon deactivated — it stops working at checkout immediately.",
  };
}

/* ------------------------------------------------------------------ */
/* Products / versions                                                 */
/* ------------------------------------------------------------------ */

/** Release a version into the server-side product registry (0008+0016).
 *  This is what activation checks and delivery authorization run
 *  against; the web catalog keeps its display version until you ship a
 *  site change. An optional artifactKey names the installer object in
 *  the private delivery bucket (convention: slug/version/download.zip);
 *  without it the release is recorded 'published' but the honest
 *  Downloads view shows "artifact pending" until the file is uploaded. */
export async function publishVersionAction(
  slug: string,
  version: string,
  notes: string | null,
  artifactKey?: string | null
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Your session expired. Sign in again." };
  const clean = version.trim();
  if (!/^\d+\.\d+(\.\d+)?$/.test(clean))
    return { ok: false, error: "Version must look like 1.0 or 1.2.3." };
  const artifact = artifactKey?.trim() || `${slug}/${clean}/download.zip`;
  const db = admin();
  // Demote the incumbent first, then promote — order matters so the
  // registry never holds two current rows.
  await db.from("product_versions").update({ current: false }).eq("product_slug", slug);
  const { error } = await db
    .from("product_versions")
    .insert({
      product_slug: slug,
      version: clean,
      notes: notes?.trim() || null,
      current: true,
      release_status: "published",
      artifact_key: artifact,
    });
  if (error) {
    console.error("[admin] publishVersion failed:", error.message);
    return { ok: false, error: "Couldn't record the version." };
  }
  await audit(actor, "version.publish", "product_versions", `${slug}@${clean}`, `Released v${clean} for ${slug}`);
  return { ok: true, message: `Version ${clean} is now the published registry version.` };
}

/** Retire/reactivate a product in the authorization registry. The web
 *  catalog remains the display source; this decides whether the product
 *  can be activated server-side. */
export async function setRegistryProductStatusAction(
  slug: string,
  status: "active" | "retired"
): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Your session expired. Sign in again." };
  const db = admin();
  const { error } = await db
    .from("products")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) {
    console.error("[admin] setRegistryStatus failed:", error.message);
    return { ok: false, error: "Couldn't update the product." };
  }
  await audit(
    actor,
    status === "retired" ? "product.retire" : "product.activate",
    "products",
    slug,
    `Marked registry product ${slug} as ${status}`
  );
  return { ok: true, message: `Registry product marked ${status}.` };
}

/* ------------------------------------------------------------------ */
/* Health probe                                                        */
/* ------------------------------------------------------------------ */

/** One lightweight real query proving the service-role path works. */
export async function pingDatabase(): Promise<{ ok: boolean; latencyMs: number | null }> {
  if (!supabaseAdminConfigured()) return { ok: false, latencyMs: null };
  const start = Date.now();
  try {
    const { error } = await admin().rpc("admin_totals");
    return { ok: !error, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
