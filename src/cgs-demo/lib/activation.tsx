"use client";

/**
 * Demo shim for the desktop licensing layer. The web demo is always "running",
 * so activation is a static, slightly cheeky active state — and the one
 * destructive licence action (release device) politely refuses.
 */

import type { BlockedKind } from "@/cgs-demo/lib/demo-guard";

interface ActivePhase {
  kind: "active";
  email: string;
  claims: { lic: string; seats: number; product: string; until: number };
}

export interface ActivationValue {
  phase: ActivePhase;
  checkLicence: () => Promise<string | null>;
  deactivateThisDevice: () => Promise<{ ok: boolean; message: string }>;
  blockedNotice: (kind: BlockedKind) => string;
}

const PHASE: ActivePhase = {
  kind: "active",
  email: "demo@veyra.local",
  claims: { lic: "DEMO-READ-ONLY", seats: 1, product: "veyra-client-growth-system", until: 4102444800 },
};

export function ActivationProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useActivation(): ActivationValue {
  return {
    phase: PHASE,
    checkLicence: async () => "This is a demo — licence checks are switched off.",
    deactivateThisDevice: async () => ({
      ok: false,
      message: "There is nothing to release — this demo never leaves the browser.",
    }),
    blockedNotice: () => "This is a demo. Looking is free; editing is off.",
  };
}
