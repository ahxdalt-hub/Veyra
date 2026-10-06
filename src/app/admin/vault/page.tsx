import { redirect } from "next/navigation";
import {
  adminAuthConfigured,
  requireAdmin,
  AdminRoleCheckError,
} from "@/lib/admin/auth";
import { vaultCleared } from "@/lib/admin/vault";
import { VaultGate } from "@/components/admin/vault-gate";
import { RoleCheckRetry } from "@/components/admin/retry-gate";

/**
 * The vault re-entry page — reached from the (protected) gate when the
 * admin's session is live but the vault clearance is missing or stale.
 * Asks for the pin only; an anonymous visitor is sent to the full
 * sign-in, and an already-cleared admin straight inside.
 */

export const metadata = { title: "Vault" };
export const dynamic = "force-dynamic";

export default async function VaultPage() {
  if (!adminAuthConfigured()) redirect("/admin");
  try {
    if (!(await requireAdmin())) redirect("/admin/sign-in");
  } catch (err) {
    if (err instanceof AdminRoleCheckError) return <RoleCheckRetry />;
    throw err;
  }
  if (await vaultCleared()) redirect("/admin");

  return (
    <div className="cc-bg-grid cc-grid-drift flex min-h-screen items-center justify-center px-6">
      <VaultGate />
    </div>
  );
}
