"use client";

/**
 * WorkspaceSwitcher + WorkspaceBanner — the Personal ⇄ Team controls.
 *
 * Personal is the private, local-first workspace; Team is the opt-in shared one
 * (see use-workspace / migration 0030). The switcher is a compact segmented
 * control in the top bar with a sliding accent pill; the Team segment carries a
 * live dot when the team socket is connected. The banner is a slim status strip
 * shown only in Team mode — green "syncing live" for a real seat, or an honest
 * "preview" state in the read-only demo (nothing is faked).
 *
 * All styling reuses the cgs design tokens; motion respects reduced-motion.
 */

import { motion, useReducedMotion } from "framer-motion";
import { HardDrive, Users } from "lucide-react";
import { useWorkspace, type WorkspaceMode } from "@/cgs-demo/lib/use-workspace";
import { isLive } from "@/cgs-demo/lib/team";

const OPTIONS: { id: WorkspaceMode; label: string; Icon: typeof Users }[] = [
  { id: "personal", label: "Personal", Icon: HardDrive },
  { id: "team", label: "Team", Icon: Users },
];

export function WorkspaceSwitcher() {
  const { mode, setMode, teamLive } = useWorkspace();
  const reduced = useReducedMotion();

  return (
    <div
      role="group"
      aria-label="Workspace"
      className="relative flex items-center gap-0.5 rounded-lg border border-cgs-line-strong bg-cgs-inset p-0.5"
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            aria-pressed={active}
            className={`relative flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors ${
              active ? "text-cgs-ink" : "text-cgs-muted hover:text-cgs-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={reduced ? undefined : "ws-pill"}
                transition={{ duration: 0.2, ease: [0.2, 0.6, 0.3, 1] }}
                className="absolute inset-0 rounded-md border border-cgs-line bg-cgs-raised shadow-sm"
                aria-hidden
              />
            )}
            <Icon size={13} className="relative" aria-hidden />
            <span className="relative">{label}</span>
            {id === "team" && teamLive && (
              <span className="relative h-1.5 w-1.5 rounded-full bg-cgs-complete" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function WorkspaceBanner() {
  const { mode, team } = useWorkspace();
  if (mode !== "team") return null;

  const live = team.available;
  const online = team.teammates.filter((t) => isLive(t)).length;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 border-b px-6 py-1.5 text-[11.5px] ${
        live
          ? "border-cgs-complete/25 bg-cgs-complete-soft text-cgs-complete"
          : "border-cgs-line bg-cgs-inset text-cgs-muted"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${live ? "bg-cgs-complete" : "bg-cgs-faint"}`}
        aria-hidden
      />
      <span className="font-semibold">{live ? "Team workspace" : "Team workspace · preview"}</span>
      <span className="text-cgs-faint">·</span>
      <span className="min-w-0 flex-1 truncate">
        {live
          ? team.connected
            ? "Shared pipeline syncing live across your seats"
            : "Connecting to your team…"
          : "Presence, chat and shared sync activate when you sign in on the desktop app"}
      </span>
      {live && online > 0 && (
        <span className="shrink-0 tabular-nums text-cgs-complete">{online} online</span>
      )}
    </div>
  );
}
