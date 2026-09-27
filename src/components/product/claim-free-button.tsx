"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { useUiSounds } from "@/components/audit/use-sounds";

/**
 * ClaimFreeButton — the purchase path for $0 products (the Growth Audit).
 * Cart and checkout reject free products by construction, so claiming is
 * its own small flow: one POST to /api/claim runs the real order
 * lifecycle server-side (pending → paid → entitlement → licence), and
 * this button only mirrors what the server already knows (GET on mount)
 * and what it returns (401 → sign in, carrying the return path).
 */
type Status = "unknown" | "guest" | "idle" | "claiming" | "claimed" | "owned" | "error";

export function ClaimFreeButton({ slug }: { slug: string }) {
  const { hover, play } = useUiSounds();
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/claim?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { signedIn?: boolean; owned?: boolean } | null) => {
        if (cancelled || !d) return;
        if (!d.signedIn) setStatus("guest");
        else setStatus(d.owned ? "owned" : "idle");
      })
      .catch(() => {
        /* stay idle — the click itself will surface any server error */
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function claim() {
    if (status === "claiming") return;
    setStatus("claiming");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        signInRequired?: boolean;
        already?: boolean;
      };
      if (data.signInRequired) {
        setStatus("guest");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Please try again.");
      play("unlock");
      setStatus(data.already ? "owned" : "claimed");
    } catch {
      setStatus("error");
    }
  }

  const next = encodeURIComponent(`/products/${slug}`);

  if (status === "guest") {
    return (
      <Button
        href={`/account/sign-in?next=${next}`}
        variant="accent"
        size="lg"
        className="w-full"
        arrow
        onMouseEnter={hover}
      >
        Sign in to claim — free
      </Button>
    );
  }

  if (status === "owned" || status === "claimed") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-sm border border-accent/30 bg-accent-soft/60 px-4 py-3">
          <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
          <p className="text-sm font-medium text-ink">
            {status === "owned" ? "Already yours" : "Claimed — it’s in your library"}
          </p>
        </div>
        <Button href="/audit" variant="accent" size="lg" className="w-full" arrow onMouseEnter={hover}>
          Open the Growth Audit
        </Button>
        <Link
          href={`/account/library/${slug}`}
          className="block text-center text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          View in your library · licence included
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        variant="accent"
        size="lg"
        className="w-full"
        onClick={claim}
        disabled={status === "claiming"}
        onMouseEnter={hover}
      >
        {status === "claiming"
          ? "Claiming…"
          : "Claim free — no card, ever"}
      </Button>
      {status === "error" ? (
        <p role="alert" className="text-center text-xs text-clay animate-shake">
          Something went wrong — nothing was charged. Please try again.
        </p>
      ) : null}
    </div>
  );
}
