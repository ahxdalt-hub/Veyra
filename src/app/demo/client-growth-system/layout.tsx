import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/source-serif-4/wght.css";
import "./cgs-demo.css";

/**
 * Host shell for the ported Client Growth System desktop app. The whole app
 * lives under this route as a read-only web demo — no Supabase, no licence
 * calls, no local database; content edits are intercepted by the demo guard.
 */

export const metadata: Metadata = {
  title: {
    default: "Client Growth System — Interactive Demo",
    template: "%s · Client Growth System Demo",
  },
  description:
    "A working example of the Client Growth System: six stages, real workflows, and a fictional studio's data. Browse freely — editing is switched off.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function CgsDemoShell({ children }: { children: React.ReactNode }) {
  return <div className="cgs-demo-root">{children}</div>;
}
