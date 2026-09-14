import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import { getProduct } from "@/lib/products";

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

// Basic per-process throttle: same reference+email pair at most once
// every 10 seconds — enough to stop hammering without a cache dependency.
const recent = new Map<string, number>();
const THROTTLE_MS = 10_000;

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

  const throttleKey = `${reference}:${normalizedEmail}`;
  const last = recent.get(throttleKey) ?? 0;
  if (Date.now() - last < THROTTLE_MS) {
    return NextResponse.json(
      { error: "Too many verification attempts — try again in a moment." },
      { status: 429 }
    );
  }
  recent.set(throttleKey, Date.now());
  if (recent.size > 1000) {
    // Keep the throttle map bounded; entries expire by timestamp anyway.
    for (const [k, t] of recent) {
      if (Date.now() - t > THROTTLE_MS) recent.delete(k);
    }
  }

  const admin = createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
  const activatedSeats = normalized.length;

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
