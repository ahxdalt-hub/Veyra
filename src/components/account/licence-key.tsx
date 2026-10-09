"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

/**
 * LicenceKey — the key the app asks for at activation, presented as a field
 * rather than as prose: copyable in one click, selectable as a fallback.
 */
export function LicenceKey({ reference }: { reference: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(reference);
      setState("copied");
    } catch {
      setState("manual");
    }
    setTimeout(() => setState((s) => (s === "idle" ? s : "idle")), 2000);
  }

  return (
    <div className="mt-5">
      <p className="spec text-ink-4">Licence key</p>
      <div className="mt-2 flex items-stretch gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-sm border border-line-strong bg-paper px-4 py-3">
          <span className="select-all break-all font-mono text-sm font-medium tracking-[0.02em] text-ink">
            {reference}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy licence key to clipboard"
          className="inline-flex h-auto shrink-0 items-center gap-2 rounded-sm border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors duration-200 hover:border-ink/30 hover:bg-accent-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {state === "copied" ? (
            <CheckIcon className="h-4 w-4 text-accent" />
          ) : (
            <CopyIcon className="h-4 w-4 text-ink-3" />
          )}
          <span className="hidden sm:inline">
            {state === "copied" ? "Copied" : "Copy"}
          </span>
        </button>
      </div>
      <p
        role="status"
        className="mt-2 text-xs leading-relaxed text-ink-3"
      >
        {state === "manual"
          ? "Your browser blocked automatic copying — the key is selectable, so click it and press Ctrl/Cmd+C."
          : "Paste this into the app’s activation screen, along with the email on your account."}
      </p>
    </div>
  );
}
