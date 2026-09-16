import { CcThemeProvider } from "@/components/admin/theme";
import "./admin.css";

/**
 * Admin root layout — the theme surface only. The authoritative auth
 * gate lives in the (protected) segment layout so the sign-in page
 * stays reachable. The middleware's claim check is defense in depth on
 * top; nothing under (protected) renders without a fresh, service-role
 * verified admin session.
 */

export const metadata = {
  title: {
    default: "Veyra Command Center",
    template: "%s · Veyra Command Center",
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CcThemeProvider>{children}</CcThemeProvider>;
}
