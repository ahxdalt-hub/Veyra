import { redirect } from "next/navigation";
import { requireAdmin, adminAuthConfigured } from "@/lib/admin/auth";
import { pinStepEnabled, vaultCleared } from "@/lib/admin/vault";
import { AdminShell } from "@/components/admin/shell";
import { GlobalSearch } from "@/components/admin/global-search";
import { NotificationCenter } from "@/components/admin/notification-center";
import { SoundToggle } from "@/components/admin/sound-toggle";
import { ToastStack } from "@/components/admin/toast-stack";
import { NotificationProvider } from "@/components/admin/notifications";

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
  if (!adminAuthConfigured()) redirect("/admin/sign-in");
  const admin = await requireAdmin();
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