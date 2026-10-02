"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { VaultPin, type PinVerifyResult } from "@/components/admin/vault-pin";

/**
 * The vault's re-entry door — the standalone gate an admin meets when
 * they open the command center with a live session but no vault
 * clearance (fresh browser session, or the 12h clearance elapsed).
 * PIN only: the credentials were typed once when the session was
 * minted, and the session itself is the proof of identity here.
 */

export function VaultGate() {
  const router = useRouter();

  const verifyPin = useCallback(async (pin: string): Promise<PinVerifyResult> => {
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        badPin?: boolean;
      };
      if (res.ok && data.ok) return { ok: true };
      return {
        ok: false,
        error: data.badPin
          ? "that code doesn't open this safe"
          : (data.error ?? "the mechanism jammed — try again").toLowerCase(),
      };
    } catch {
      return { ok: false, error: "we lost the connection" };
    }
  }, []);

  function handleOpen() {
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="cc-emblem-in relative mb-10 flex items-center gap-3">
        <span className="relative flex h-11 w-11 items-center justify-center">
          <span
            aria-hidden="true"
            className="cc-ring-breathe absolute inset-0 rounded-full border"
            style={{ borderColor: "var(--cc-accent-line)" }}
          />
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border font-display text-lg italic"
            style={{
              borderColor: "var(--cc-accent-line)",
              color: "var(--cc-accent-ink)",
            }}
          >
            V
          </span>
        </span>
        <p className="cc-label cc-fade-x">Veyra Command Center</p>
      </div>

      <h1 className="text-display-2 mb-2" style={{ color: "var(--cc-text)" }}>
        The vault.
      </h1>
      <p
        className="mb-4 text-sm leading-relaxed"
        style={{ color: "var(--cc-text-3)" }}
      >
        Welcome back. Enter the vault code to open the command center — your
        session is still yours.
      </p>

      <VaultPin onVerify={verifyPin} onOpen={handleOpen} />
    </div>
  );
}
