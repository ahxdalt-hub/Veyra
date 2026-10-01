import { redirect } from "next/navigation";
import { adminAuthConfigured, requireAdmin } from "@/lib/admin/auth";
import { AdminSignInForm } from "@/components/admin/login-form";

/**
 * Admin sign-in page. A signed-in ADMIN is redirected straight into the
 * command center; the form itself only ever speaks to /api/admin/session,
 * which performs the authoritative role check server-side.
 */

export const metadata = { title: "Sign in" };

export default async function AdminSignInPage() {
  if (!adminAuthConfigured()) {
    // Nothing to authenticate against — the (protected) surfaces explain
    // configuration state; this route simply has no gate to show.
    redirect("/admin");
  }
  const admin = await requireAdmin();
  if (admin) redirect("/admin");

  return (
    <div className="cc-bg-grid cc-grid-drift flex min-h-screen items-center justify-center px-6">
      <AdminSignInForm />
    </div>
  );
}
