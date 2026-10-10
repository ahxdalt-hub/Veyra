"use client";

/**
 * useWorkspace — the Personal ⇄ Team workspace switch.
 *
 * The Client Growth System has TWO workspaces:
 *   - Personal: local-first, private, lives on the machine (the default).
 *   - Team: an opt-in, live, seat-gated workspace in Supabase (migration 0030)
 *     shared across the licensed seats on one entitlement.
 *
 * This provider owns the active mode (persisted to localStorage so it survives
 * a reload) and hosts the SINGLE `useTeam` subscription for the whole app — so
 * the switcher, the top bar and the presence panel all read one socket instead
 * of each opening their own (which would double presence + connection count).
 *
 * The mode is UI-level only: switching never touches the private personal
 * store. In the read-only web demo there is no session, so `teamLive` is false
 * and the Team workspace renders an honest "preview" state — nothing is faked.
 */

import { createContext, useCallback, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/lib/use-local-storage";
import { playSfx } from "@/lib/sound";
import { useTeam, type TeamState } from "@/cgs-demo/lib/use-team";

export type WorkspaceMode = "personal" | "team";

const MODE_KEY = "veyra:workspace:mode";

type WorkspaceValue = {
  /** The active workspace. */
  mode: WorkspaceMode;
  /** Switch workspace (no-op when already active); plays a soft cue. */
  setMode: (next: WorkspaceMode) => void;
  /** The shared team subscription (presence, chat, shared doc). */
  team: TeamState;
  /** True when the team socket is live (real session + an active seat). */
  teamLive: boolean;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useLocalStorageState(MODE_KEY, "personal");
  const mode: WorkspaceMode = stored === "team" ? "team" : "personal";
  const team = useTeam();

  const setMode = useCallback(
    (next: WorkspaceMode) => {
      if (next === mode) return;
      setStored(next);
      // Entering the shared space unlocks; returning to personal locks it again.
      playSfx(next === "team" ? "unlock" : "lock");
    },
    [mode, setStored],
  );

  const value = useMemo<WorkspaceValue>(
    () => ({ mode, setMode, team, teamLive: team.available }),
    [mode, setMode, team],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
