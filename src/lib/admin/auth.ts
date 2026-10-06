import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import {
  supabaseAdminConfigured,
  supabaseAuthConfigured,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { describeAuthError, isDefinitiveSignOut } from "@/lib/supabase/errors";

/**
 * Admin authentication — the gate to the Veyra Command Center.
 *
 * Security model (rebuilt Stage 09):
 *  - Admins are ordinary Supabase Auth users flagged with
 *    app_metadata.role === 'admin'. app_metadata can ONLY be set by
 *    service-role code (the Auth admin API) — a signup payload's
 *    user_metadata can never forge it, and Supabase explicitly ignores
 *    client-provided app_metadata. Authorization therefore rests on
 *    server-controlled state, not a shared secret.
 *  - Verification is always double-sourced: the request's JWT claims
 *    (fast path) AND a fresh auth.users read with the service-role key
 *    (ground truth). A stale token for a demoted user fails the DB read.
 *  - The browser never sees the service-role key; every check below
 *    runs in server code (pages, layouts, actions, APIs). The middleware
 *    gate is defense in depth, never the only line.
 *  - Sessions use Supabase's own httpOnly cookie machinery (shared with
 *    the customer account area) — sign out is Supabase sign out.
 */

export function adminAuthConfigured(): boolean {
  // Auth needs anon+url; the ground-truth role check needs the service
  // role. Both must be present for the command center to be trustworthy.
  return supabaseAuthConfigured() && supabaseAdminConfigured();
}

/**
 * The role check could not be COMPLETED — Supabase was unreachable, 5xx,
 * rate-limited, or rejected our service-role key.
 *
 * This is deliberately NOT the same as a verdict of "not an admin". The two
 * lead to different screens and conflating them is the bug this class fixes:
 * a transient blip used to fall through to `null`, which bounced a signed-in
 * admin to the sign-in page, where the missing session then looked like a
 * problem with their account. Callers catch this and offer a retry; a real
 * "you are not an admin" still returns null.
 */
export class AdminRoleCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminRoleCheckError";
  }
}

/** The authoritative admin check for one user id (fresh DB read). */
async function isAdminUser(userId: string): Promise<boolean> {
  if (!supabaseAdminConfigured()) return false;
  const admin = createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    // A deleted/demoted account is a verdict: this session is not an
    // admin's. Anything else is us failing to read, not an answer.
    const status = (error as { status?: number } | undefined)?.status;
    if (status === 404 || /not found/i.test(error.message ?? "")) return false;
    console.error("[admin] role read unavailable:", describeAuthError(error));
    throw new AdminRoleCheckError(`Admin role check failed: ${error.message}`);
  }
  return (data.user?.app_metadata as { role?: string } | undefined)?.role === "admin";
}

/** Resolves the current admin session, or null. Runs in server code
 *  only — every admin page/layout/action/API calls this first. */
export async function requireAdmin(): Promise<
  { id: string; email: string; full_name: string | null } | null
> {
  if (!adminAuthConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  let session: Awaited<ReturnType<typeof supabase.auth.getUser>>;
  try {
    // Validates the JWT against the auth server — a local cookie decode is
    // never enough.
    session = await supabase.auth.getUser();
  } catch (err) {
    // @supabase/ssr also THROWS here (a refresh token Supabase has rotated
    // out or no longer knows is the common case). An uncaught throw is what
    // made every anonymous hit on /admin/sign-in a 500.
    const auth = err as { name?: string; status?: number; message?: string };
    if (isDefinitiveSignOut(auth)) return null;
    console.error("[admin] session verification threw:", describeAuthError(err));
    throw new AdminRoleCheckError(
      `Session verification failed: ${auth.message ?? String(err)}`
    );
  }
  const { data, error } = session;
  if (error && !data.user) {
    // A rejected/expired session is a verdict — sign in again. Only a
    // Supabase we could not reach is a hiccup worth retrying.
    if (isDefinitiveSignOut(error)) return null;
    console.error("[admin] session verification unavailable:", describeAuthError(error));
    throw new AdminRoleCheckError(`Session verification failed: ${error.message}`);
  }
  const user = data.user;
  if (!user) return null;

  // Fast path: JWT already carries app_metadata.role. Re-verify against
  // auth.users so a demoted user's unexpired session cannot pass.
  if ((user.app_metadata as { role?: string } | undefined)?.role === "admin") {
    if (await isAdminUser(user.id)) {
      const meta = user.user_metadata as { full_name?: string } | undefined;
      return { id: user.id, email: user.email ?? "", full_name: meta?.full_name ?? null };
    }
  }
  return null;
}

/** Non-redirecting probe for the login page (already-signed-in check).
 *  Never throws: the sign-in page has no retry UI, and when the role check
 *  can't complete the honest thing to show there is the form — submitting it
 *  runs the real gate again. */
export async function getAdminOrNull() {
  try {
    return await requireAdmin();
  } catch (err) {
    if (err instanceof AdminRoleCheckError) return null;
    throw err;
  }
}

/** Sign out the current session (called from the server action). */
export async function adminSignOut() {
  if (!supabaseAuthConfigured()) return;
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // Clear any leftover session cookies explicitly in SSR context.
  const store = await cookies();
  for (const c of store.getAll()) {
    if (c.name.startsWith("sb-")) store.delete(c.name);
  }
}

/**
 * Audit trail — every meaningful admin mutation writes here (service
 * role). Failures never block the operation itself: the action succeeded
 * even if the log line didn't. detail must be human-readable and never
 * carry secrets (passwords, keys, signatures).
 */
export async function audit(
  actor: { id: string; email: string },
  action: string,
  entity: string,
  entityId: string,
  detail: string
): Promise<void> {
  if (!supabaseAdminConfigured()) return;
  try {
    const admin = createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from("admin_audit_log").insert({
      action,
      actor_id: actor.id,
      actor_email: actor.email,
      entity,
      entity_id: entityId,
      detail: detail.slice(0, 500),
    });
    if (error) console.error("[admin] audit write failed:", error.message);
  } catch (err) {
    console.error("[admin] audit write failed:", err);
  }
}
