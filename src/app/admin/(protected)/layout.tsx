import { redirect } from "next/navigation";
import {
  adminAuthConfigured,
  requireAdmin,
  AdminRoleCheckError,
} from "@/lib/admin/auth";
import { pinStepEnabled, vaultCleared } from "@/lib/admin/vault";
import { AdminShell } from "@/components/admin/shell";
import { GlobalSearch } from "@/components/admin/global-search";
import { NotificationCenter } from "@/components/admin/notification-center";
import { SoundToggle } from "@/components/admin/sound-toggle";
import { ToastStack } from "@/components/admin/toast-stack";
import { NotificationProvider } from "@/components/admin/notifications";
import { RoleCheckRetry } from "@/components/admin/retry-gate";

/**
 * Protected command-center layout — the authoritative gate.
 *
 * requireAdmin() performs the fresh, service-role re-read of the
 * session user's role on EVERY render: the middleware's JWT-claim check
 * is only a fast pre-filter, so a demoted admin's live session stops at
 * this layout even before a page's own guard runs.
 */

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!adminAuthConfigured()) {
    // No redirect here: /admin/sign-in bounces back to /admin when auth is
    // unconfigured, so redirecting would loop. Say what's missing instead.
    return (
      <div className="cc-bg-grid flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-display-2 mb-2" style={{ color: "var(--cc-text)" }}>
            Configuration incomplete
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--cc-text-3)" }}>
            The command center can&rsquo;t start: Supabase auth or the
            service-role key is missing on this server. Set{" "}
            <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>, then restart.
          </p>
        </div>
      </div>
    );
  }
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (err) {
    // Verification unavailable (transient), not "not an admin" — offer a
    // retry instead of bouncing a legitimate admin to sign-in.
    if (err instanceof AdminRoleCheckError) return <RoleCheckRetry />;
    throw err;
  }
  if (!admin) redirect("/admin/sign-in");
  // The vault re-arms on every fresh entry: a signed, session-scoped
  // clearance cookie (issued when the pin last cleared) is required
  // beyond the role check itself.
  if (pinStepEnabled() && !(await vaultCleared())) redirect("/admin/vault");

  return (
    <NotificationProvider>
      <AdminShell admin={admin} topbarExtras={<Topbar />}>
        {children}
      </AdminShell>
      <ToastStack />
    </NotificationProvider>
  );
}

function Topbar() {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden min-w-0 flex-1 sm:block sm:max-w-md">
        <GlobalSearch />
      </div>
      <NotificationCenter />
      <SoundToggle />
    </div>
  );
}