import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeading } from "@/components/admin/admin-ui";
import { Terminal } from "@/components/admin/terminal";

export const metadata: Metadata = { title: "Terminals" };
export const dynamic = "force-dynamic";

/**
 * Terminals — button-driven operational commands with a console output:
 * the manual moments (comp a customer, heal a stuck payment, resend a
 * receipt, refund-and-revoke) without building a page for each. The
 * commands are the same audited server actions the rest of the command
 * center uses; this surface just puts them at hand.
 */
export default async function TerminalsPage() {
  if (!(await requireAdmin())) redirect("/admin/sign-in");

  return (
    <div>
      <PageHeading
        title="Terminals"
        meta="Operational commands — pick one, fill the fields, run it. Every run is audited."
      />
      <Terminal />
    </div>
  );
}
