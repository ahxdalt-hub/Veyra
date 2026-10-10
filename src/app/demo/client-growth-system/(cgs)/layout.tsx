"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { StoreProvider, useStore } from "@/cgs-demo/lib/store";
import { relPath } from "@/cgs-demo/lib/demo-paths";
import { MODULES, STAGES, ModuleId, isModuleId } from "@/cgs-demo/lib/stages";
import Sidebar from "@/cgs-demo/components/sidebar";
import { CommandPalette } from "@/cgs-demo/components/command-palette";
import { TeamOverlay } from "@/cgs-demo/components/team-overlay";
import { WorkspaceSwitcher, WorkspaceBanner } from "@/cgs-demo/components/workspace-switcher";
import { WorkspaceProvider } from "@/cgs-demo/lib/use-workspace";
import { DemoBlockPop } from "@/cgs-demo/components/demo-block-pop";
import { Spinner, formatWhen } from "@/cgs-demo/components/ui";

function currentTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const seg = pathname.split("/").filter(Boolean).join("/");
  if (seg === "settings") return "Settings";
  if (seg === "build") return "Build";
  if (isModuleId(seg.replace(/^build\//, ""))) {
    return MODULES[seg.replace(/^build\//, "") as ModuleId].title;
  }
  for (const stage of STAGES) {
    const item = stage.nav?.find((n) => seg === `${stage.id}/${n.id}`);
    if (item) return item.label;
  }
  return "Veyra";
}

function TopBar() {
  const pathname = relPath(usePathname());
  const { data } = useStore();
  const title = currentTitle(pathname);

  return (
    <header className="flex h-13 shrink-0 items-center justify-between gap-4 border-b border-cgs-line bg-cgs-surface/70 px-6 backdrop-blur-sm">
      <h1 className="flex items-center gap-2.5 text-[15px] font-semibold text-cgs-ink">
        <motion.span
          key={title}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="inline-block"
        >
          {title}
        </motion.span>
        <span className="rounded-full border border-cgs-danger/30 bg-cgs-danger-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cgs-danger">
          Demo · browse only
        </span>
      </h1>
      <div className="flex items-center gap-3">
        <CommandPalette />
        <WorkspaceSwitcher />
        <TeamOverlay />
        <span className="hidden items-center gap-1.5 text-[11.5px] text-cgs-faint sm:flex" aria-live="polite">
          <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M8 1.5a3.5 3.5 0 0 0-3.5 3.5V7H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-.5V5A3.5 3.5 0 0 0 8 1.5Zm2.3 5.5H5.7V5a2.3 2.3 0 0 1 4.6 0v2Z"
              fill="currentColor"
            />
          </svg>
          {data.updatedAt ? `Saved ${formatWhen(data.updatedAt)}` : "Nothing saved yet"}
        </span>
      </div>
    </header>
  );
}

function BootGate({ children }: { children: React.ReactNode }) {
  const { ready } = useStore();
  if (!ready) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Spinner label="Loading the demo workspace" />
      </div>
    );
  }
  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <WorkspaceProvider>
        <div className="flex h-full">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <WorkspaceBanner />
            <main className="flex-1 overflow-y-auto" id="main">
              <BootGate>{children}</BootGate>
            </main>
          </div>
        </div>
        <DemoBlockPop />
      </WorkspaceProvider>
    </StoreProvider>
  );
}
