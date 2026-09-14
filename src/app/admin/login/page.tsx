import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { AdminLoginScreen } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin — Veyra",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#14120d",
  width: "device-width",
  initialScale: 1,
};

/**
 * /admin/login — the gate to the command center. The only admin route
 * reachable without a session. Nothing about the page reveals whether the
 * deployment has the gate configured; a failed attempt shows the same
 * neutral error either way.
 */
export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect("/admin");
  return <AdminLoginScreen />;
}
