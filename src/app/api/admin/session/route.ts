import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  adminAuthConfigured,
  requireAdmin,
} from "@/lib/admin/auth";
import {
  supabaseAdminConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";

/**
 * POST /api/admin/session — the sign-in endpoint for the command
 * center, in two stages:
 *
 *   Stage 1 — { identifier, password }: credentials are verified
 *   (personal Supabase password or the shared operator key) and the
 *   account's admin role is confirmed fresh. NO session survives this
 *   stage; the response asks for the vault pin when one is configured.
 *
 *   Stage 2 — { identifier, password, pin }: credentials are re-verified
 *   (stateless — nothing is stored between stages) plus the pin, and
 *   only then is the live session established.
 *
 * Doors, one session machinery:
 *  1. Personal door — Supabase Auth password for a user whose
 *     app_metadata.role is 'admin' (verified fresh, service role).
 *  2. Shared operator door — a static username/password pair held in
 *     deployment env (VEYRA_ADMIN_USERNAME / VEYRA_ADMIN_PASSWORD).
 *     A match does NOT create its own authority: it mints a real
 *     Supabase session for the admin user named by VEYRA_ADMIN_EMAIL
 *     via a service-role magic link, verified server-side.
 *
 * The pin is deployment env (VEYRA_ADMIN_PIN, 4–8 digits). Unset env
 * means the stage doesn't exist — every gate here fails closed.
 */

/** Constant-time string compare (both sides hashed to equal length). */
function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) =>
    createHash("sha256").update(s).digest();
  const ab = digest(a);
  const bb = digest(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function operatorDoorConfigured(): boolean {
  return Boolean(
    process.env.VEYRA_ADMIN_USERNAME &&
      process.env.VEYRA_ADMIN_PASSWORD &&
      process.env.VEYRA_ADMIN_EMAIL
  );
}

function operatorDoorMatches(identifier: string, password: string): boolean {
  if (!operatorDoorConfigured()) return false;
  const userOk = safeEqual(
    identifier.trim().toLowerCase(),
    (process.env.VEYRA_ADMIN_USERNAME ?? "").trim().toLowerCase()
  );
  const passOk = safeEqual(password, process.env.VEYRA_ADMIN_PASSWORD ?? "");
  return userOk && passOk;
}

function pinStepEnabled(): boolean {
  const pin = process.env.VEYRA_ADMIN_PIN;
  return Boolean(pin && /^\d{4,8}$/.test(pin));
}

/** Mint a session for the operator-door admin user: service-role magic
 *  link → server-side verifyOtp on the SSR client (sets the httpOnly
 *  cookies), so the established session is indistinguishable from a
 *  normal sign-in. */
async function establishOperatorSession(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const admin = createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: process.env.VEYRA_ADMIN_EMAIL!,
  });
  if (error || !data.properties?.action_link) {
    return { ok: false, error: "The operator door is misconfigured." };
  }
  const tokenHash = new URL(data.properties.action_link).searchParams.get(
    "token"
  );
  if (!tokenHash) {
    return { ok: false, error: "The operator door is misconfigured." };
  }
  const supabase = await createSupabaseServerClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (verifyError) {
    return { ok: false, error: "The operator door refused this attempt." };
  }
  return { ok: true };
}

export async function POST(request: Request) {
  if (!adminAuthConfigured()) {
    return NextResponse.json(
      { error: "The command center isn't configured on this deployment." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { identifier, password, pin } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof identifier !== "string" ||
    typeof password !== "string" ||
    !identifier ||
    !password
  ) {
    return NextResponse.json(
      { error: "Enter your operator ID and password." },
      { status: 422 }
    );
  }

  const useOperator = operatorDoorMatches(identifier, password);
  if (!useOperator && !supabaseAdminConfigured() && operatorDoorConfigured()) {
    // Operator credentials match but the minting machinery is absent.
    return NextResponse.json(
      { error: "The command center isn't configured on this deployment." },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const email = identifier.trim().toLowerCase();

  // --- Credential verification (no live session may outlive this
  // block when a pin stage is pending). ---
  if (!useOperator) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = (error.message ?? "").toLowerCase();
      return NextResponse.json({
        error:
          msg.includes("invalid login credentials")
            ? "Those credentials don't match an account."
            : msg.includes("rate limit")
              ? "Too many attempts — wait a minute and try again."
              : "Something went wrong. Please try again.",
      }, { status: 401 });
    }

    // Authoritative gate: fresh DB read of app_metadata.role, service role.
    const admin = await requireAdmin();
    if (!admin) {
      await supabase.auth.signOut(); // never leave a half-usable session
      return NextResponse.json({ ok: false, notAdmin: true }, { status: 403 });
    }
    if (pinStepEnabled()) {
      await supabase.auth.signOut(); // hold the vault shut for stage 2
    }
  }
  // Operator door: the env pair IS the credential check; the role is
  // verified fresh on the minted session below, before anything returns
  // a live cookie.

  // --- Vault stage ---
  if (pinStepEnabled() && typeof pin !== "string") {
    return NextResponse.json({ ok: true, needsPin: true });
  }
  if (pinStepEnabled()) {
    const pinOk =
      typeof pin === "string" &&
      safeEqual(pin.trim(), process.env.VEYRA_ADMIN_PIN!.trim());
    if (!pinOk) {
      return NextResponse.json(
        { ok: false, badPin: true, error: "That pin doesn't open this safe." },
        { status: 401 }
      );
    }
  }

  // --- Establish the live session ---
  if (useOperator) {
    const minted = await establishOperatorSession();
    if (!minted.ok) {
      return NextResponse.json({ error: minted.error }, { status: 500 });
    }
  } else if (pinStepEnabled()) {
    // The stage-1 session was destroyed to hold the vault shut — the
    // credentials are already proven, so this is just re-cutting the key.
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 401 }
      );
    }
  }

  const finalAdmin = await requireAdmin();
  if (!finalAdmin) {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: false, notAdmin: true }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — sign out (called by the shell's profile menu). */
export async function DELETE() {
  if (!adminAuthConfigured()) {
    return NextResponse.json({ ok: true });
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
