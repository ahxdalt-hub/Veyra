import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminAuthConfigured, requireAdmin } from "@/lib/admin/auth";

/**
 * POST /api/admin/session — the sign-in endpoint for the command
 * center. Password verification happens through Supabase Auth (which
 * sets the httpOnly session cookies); the ADMIN decision happens here
 * with the fresh service-role re-read (requireAdmin), not in the
 * browser. A correct password for a non-admin account ends the session
 * immediately — no cookie survives this response.
 */

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
  const { email, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 422 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
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
    return NextResponse.json(
      { ok: false, notAdmin: true },
      { status: 403 }
    );
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
