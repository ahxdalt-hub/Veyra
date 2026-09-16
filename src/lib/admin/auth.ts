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

/** The authoritative admin check for one user id (fresh DB read). */
async function isAdminUser(userId: string): Promise<boolean> {
  if (!supabaseAdminConfigured()) return false;
  const admin = createClient(supabaseUrl()!, supabaseServiceRoleKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) return false;
  return (data.user?.app_metadata as { role?: string } | undefined)?.role === "admin";
}

/** Resolves the current admin session, or null. Runs in server code
 *  only — every admin page/layout/action/API calls this first. */
export async function requireAdmin(): Promise<
  { id: string; email: string; full_name: string | null } | null
> {
  if (!adminAuthConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // validates the JWT against the auth server
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

/** Non-redirecting probe for the login page (already-signed-in check). */
export async function getAdminOrNull() {
  return requireAdmin();
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
