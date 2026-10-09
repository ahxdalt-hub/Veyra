import { NextResponse } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase/admin";
import { supabaseAdminConfigured } from "@/lib/supabase/config";
import { getProduct } from "@/lib/products";
import { takeRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/licence/verify — the endpoint the Client Growth System product
 * calls at launch. The product authenticates the Veyra account (email +
 * licence reference) and the SERVER decides access; the product never
 * relies on a local licence cache as the source of truth.
 *
 * Verified server-side here:
 *   - the licence reference exists and is active
 *   - the presenting email is the licence owner or holds a seat on it
 *   - the entitlement is active (revocations cut access immediately)
 *   - seat usage vs licensed seats, for the product's seat accounting
 *
 * The response carries no internal identifiers beyond the reference the
 * caller already has, and no storage paths.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  if (!supabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Licence verification is not available on this deployment." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { licence_reference, email } = (body ?? {}) as Record<string, unknown>;

  if (typeof licence_reference !== "string" || typeof email !== "string") {
    return NextResponse.json(
      { error: "Licence reference and account email are required." },
      { status: 422 }
    );
  }

  const reference = licence_reference.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^VY-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(reference)) {
    return NextResponse.json(
      { error: "That licence reference isn't valid." },
      { status: 422 }
    );
  }
  if (!EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "Sign in with the email on your Veyra account." },
      { status: 422 }
    );
  }

  // Shared throttle (Postgres-backed; enforced across every isolate —
  // see src/lib/rate-limit.ts): per reference+email, plus a per-IP cap.
  const [byKey, byIp] = await Promise.all([
    takeRateLimit(`licence:verify:${reference}:${normalizedEmail}`, 10, 60),
    takeRateLimit(`licence:verify:ip:${clientIp(request)}`, 60, 60),
  ]);
  const limited = !byKey.allowed || !byIp.allowed;
  if (limited) {
    return NextResponse.json(
      { error: "Too many verification attempts — try again in a moment." },
      { status: 429 }
    );
  }

  // Safe: guarded above by supabaseAdminConfigured().
  const admin = supabaseAdminClient()!;

  const { data: licence } = await admin
    .from("licences")
    .select("id, entitlement_id, product_slug, status, email")
    .eq("licence_reference", reference)
    .maybeSingle();

  if (!licence) {
    return NextResponse.json(
      { error: "That licence reference doesn't match an active licence." },
      { status: 404 }
    );
  }
  if (licence.status !== "active") {
    return NextResponse.json(
      { error: "This licence is no longer active. Contact support." },
      { status: 403 }
    );
  }

  const { data: entitlement } = await admin
    .from("entitlements")
    .select("seats, status")
    .eq("id", licence.entitlement_id)
    .maybeSingle();

  if (!entitlement || entitlement.status !== "active") {
    return NextResponse.json(
      { error: "This licence is no longer active. Contact support." },
      { status: 403 }
    );
  }

  // The presenting email must be the owner or hold an assigned seat.
  const { data: assignments } = await admin
    .from("seat_assignments")
    .select("seat_number, email, status")
    .eq("entitlement_id", licence.entitlement_id);

  const normalized = (assignments ?? []).map((a) => ({
    ...a,
    email: a.email.toLowerCase(),
  }));

  const isOwner = licence.email.toLowerCase() === normalizedEmail;
  const seat = normalized.find((a) => a.email === normalizedEmail);

  if (!isOwner && !seat) {
    return NextResponse.json(
      {
        error:
          "This email doesn't hold a seat on that licence. Ask the licence owner to assign your seat.",
      },
      { status: 403 }
    );
  }

  const product = getProduct(licence.product_slug);

  // Activated seats are devices (0008_activations.sql), not assigned seat
  // rows: a purchased-but-unassigned seat consumes nothing.
  const { data: activations } = await admin
    .from("licence_activations")
    .select("id")
    .eq("licence_id", licence.id)
    .eq("status", "active");
  const activatedSeats = activations?.length ?? 0;

  return NextResponse.json({
    valid: true,
    product: product?.name ?? licence.product_slug,
    productVersion: product?.version ?? null,
    licensedSeats: entitlement.seats,
    activatedSeats,
    availableSeats: Math.max(0, entitlement.seats - activatedSeats),
    seatNumber: isOwner ? (seat?.seat_number ?? 1) : (seat?.seat_number ?? null),
    checkedAt: new Date().toISOString(),
  });
}
