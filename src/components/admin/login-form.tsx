"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import {
  attachLoginAudioUnlock,
  playLoginCue,
  unlockLoginAudio,
} from "@/lib/admin/login-sound";
import { useSoundMutedState } from "@/lib/admin/sound";
import { VaultPin, type PinVerifyResult } from "@/components/admin/vault-pin";

/**
 * The front door of the command center — a small film, not a form.
 *
 * Choreography: the V monogram settles in, the eyebrow fades, the
 * heading types itself out (with keystroke ticks), then the fields
 * rise. Two ambient loops keep the room alive: a radar sweep crossing
 * the viewport and the monogram's ring breathing. The intro is CSS-
 * driven (compositor-owned) so it can never freeze at its initial
 * state; the only JS in the loop is the typewriter.
 *
 * All audio is synthesized and gesture-gated — nothing plays until the
 * browser allows it, and everything respects the command center's mute
 * preference ("cc:sound").
 *
 * The gate itself is unchanged: the form only speaks to
 * /api/admin/session, which performs the authoritative role check
 * server-side. Two doors, same machinery — a personal Supabase
 * credential or the shared operator key (env-configured server-side;
 * the browser never knows which one matched).
 */

const HEADING = "Access the command center.";
const TYPE_START_MS = 950;
const TYPE_STEP_MS = 42;

type Phase = "intro" | "typing" | "ready";
type Status = "idle" | "verifying" | "granted" | "denied";
type Stage = "creds" | "to-pin" | "pin";

export function AdminSignInForm() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("intro");
  const [typed, setTyped] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState<Stage>("creds");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useSoundMutedState(); // hydration-safe localStorage state
  const identifierRef = useRef<HTMLInputElement>(null);

  // Audio unlock + intro chord. The chord defers to the first gesture
  // if autoplay policy holds it back.
  useEffect(() => {
    unlockLoginAudio();
    playLoginCue("intro");
    const detach = attachLoginAudioUnlock();
    return detach;
  }, []);

  // The intro → typing → ready sequence. Reduced motion skips straight
  // to a settled, fully visible form. State updates only ever happen
  // inside timer callbacks — never synchronously in the effect body
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (reduce) {
      const settle = window.setTimeout(() => {
        setTyped(HEADING.length);
        setPhase("ready");
      }, 0);
      return () => window.clearTimeout(settle);
    }
    const kick = window.setTimeout(() => setPhase("typing"), 0);
    let step = 0;
    const start = window.setTimeout(() => {
      let i = 0;
      step = window.setInterval(() => {
        i += 1;
        setTyped(i);
        if (i % 2 === 1) playLoginCue("key");
        if (i >= HEADING.length) {
          window.clearInterval(step);
          window.setTimeout(() => setPhase("ready"), 260);
        }
      }, TYPE_STEP_MS);
    }, TYPE_START_MS);
    return () => {
      window.clearTimeout(kick);
      window.clearTimeout(start);
      if (step) window.clearInterval(step);
    };
  }, [reduce]);

  // Take the cursor once the fields exist.
  useEffect(() => {
    if (phase === "ready") identifierRef.current?.focus();
  }, [phase]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (!next) {
      unlockLoginAudio();
      playLoginCue("key");
    }
  }, [muted, setMuted]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("verifying");
    setError(undefined);
    setNotice(undefined);
    playLoginCue("enter");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        notAdmin?: boolean;
        needsPin?: boolean;
      };
      if (!res.ok || !data.ok) {
        setStatus("denied");
        playLoginCue("fail");
        if (data.notAdmin) {
          setNotice(
            "That account signed in, but isn't an administrator. Customer accounts live at /account."
          );
        } else {
          setError(data.error ?? "Something went wrong. Please try again.");
        }
        setBusy(false);
        return;
      }
      if (data.needsPin) {
        // Credentials are proven; the vault wants its code. The form
        // exits upward, the safe rotates in.
        setStatus("idle");
        setStage("to-pin");
        window.setTimeout(() => setStage("pin"), 380);
        return;
      }
      // No vault on this deployment — straight to the granted beat.
      setStatus("granted");
      playLoginCue("success");
      window.setTimeout(() => {
        router.replace("/admin");
        router.refresh();
      }, 800);
    } catch {
      setStatus("denied");
      playLoginCue("fail");
      setError("We lost the connection. Please try again.");
      setBusy(false);
    }
  }

  // Stage two — the vault re-submits the full credential set plus the
  // code (stateless server: nothing sensitive is stored between stages).
  const verifyPin = useCallback(
    async (pin: string): Promise<PinVerifyResult> => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier, password, pin }),
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
            : (data.error ?? "the mechanism jammed — try again")
                .toLowerCase(),
        };
      } catch {
        return { ok: false, error: "we lost the connection" };
      }
    },
    [identifier, password]
  );

  function handleVaultOpen() {
    setStatus("granted");
    router.replace("/admin");
    router.refresh();
  }

  const typingDone = phase === "ready" || typed >= HEADING.length;

  return (
    <div className="relative w-full max-w-sm">
      {/* Ambient loop — viewport-wide radar sweep */}
      <div aria-hidden="true" className="cc-sweep" />

      {/* Mute toggle — the room's only control before sign-in */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute sound" : "Mute sound"}
        className="absolute -top-1 right-0 z-10 rounded-sm border p-2 transition-colors"
        style={{
          borderColor: "var(--cc-line)",
          color: "var(--cc-text-3)",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = "var(--cc-accent-line)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "var(--cc-line)")
        }
      >
        {muted ? <MutedIcon /> : <SoundIcon />}
      </button>

      {/* Emblem */}
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

      {/* Typed heading */}
      <h1
        className="text-display-2 min-h-[2.6em]"
        style={{ color: "var(--cc-text)" }}
        aria-label={HEADING}
      >
        <span aria-hidden="true">
          {HEADING.slice(0, typed)}
          {!typingDone && (
            <span className="cc-caret" style={{ color: "var(--cc-accent)" }}>
              ▍
            </span>
          )}
        </span>
      </h1>

      {/* Stage one: the credential form (exits upward when the vault
          is summoned). Stage two: the safe. */}
      {stage !== "pin" ? (
        phase === "ready" && (
          <form
            onSubmit={onSubmit}
            className={`cc-rise mt-8 space-y-4${stage === "to-pin" ? " cc-exit" : ""}`}
          >
          <label className="block">
            <span
              className="cc-label mb-2 block"
              style={{ color: "var(--cc-text-3)" }}
            >
              Operator
            </span>
            <input
              ref={identifierRef}
              type="text"
              autoComplete="username"
              spellCheck={false}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={() => playLoginCue("key")}
              disabled={busy || status === "granted"}
              placeholder="operator ID or email"
              className="h-11 w-full rounded-sm border bg-transparent px-3.5 text-sm outline-none transition-colors placeholder:text-[var(--cc-text-4)] disabled:opacity-60"
              style={{ borderColor: "var(--cc-line-strong)", color: "var(--cc-text)" }}
            />
          </label>
          <label className="block">
            <span
              className="cc-label mb-2 block"
              style={{ color: "var(--cc-text-3)" }}
            >
              Passphrase
            </span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={() => playLoginCue("key")}
              disabled={busy || status === "granted"}
              placeholder="••••••••"
              className="h-11 w-full rounded-sm border bg-transparent px-3.5 text-sm outline-none transition-colors placeholder:text-[var(--cc-text-4)] disabled:opacity-60"
              style={{ borderColor: "var(--cc-line-strong)", color: "var(--cc-text)" }}
            />
          </label>

          {error ? (
            <p
              role="alert"
              className="animate-shake mt-4 text-sm"
              style={{ color: "var(--cc-error)" }}
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <p
              role="status"
              className="mt-4 text-sm leading-relaxed"
              style={{ color: "var(--cc-text-3)" }}
            >
              {notice}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || status === "granted"}
            className="mt-8 h-11 w-full rounded-sm text-sm font-medium transition-all duration-200 active:scale-[0.985] disabled:opacity-60"
            style={{
              backgroundColor:
                status === "granted" ? "var(--cc-success)" : "var(--cc-accent)",
              color: "#141007",
            }}
            onMouseEnter={(e) => {
              if (status !== "granted")
                e.currentTarget.style.backgroundColor = "var(--cc-accent-ink)";
            }}
            onMouseLeave={(e) => {
              if (status !== "granted")
                e.currentTarget.style.backgroundColor = "var(--cc-accent)";
            }}
          >
            {status === "granted"
              ? "Granted — opening"
              : busy
                ? "Verifying…"
                : "Enter the command center"}
          </button>

          {/* Console line — the door talks back */}
          <p
            className="pt-2 text-center font-mono text-[11px] tracking-wide"
            style={{ color: "var(--cc-text-4)" }}
            role="status"
            aria-live="polite"
          >
            {status === "verifying" && "> verifying operator…"}
            {status === "granted" && "> access granted"}
            {status === "denied" && "> access denied"}
            {status === "idle" &&
              (stage === "to-pin"
                ? "> credentials accepted — the vault wants its code"
                : "> authorized personnel only · access is logged")}
          </p>
          </form>
        )
      ) : (
        <VaultPin onVerify={verifyPin} onOpen={handleVaultOpen} />
      )}
    </div>
  );
}

function SoundIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="m22 9-6 6" />
      <path d="m16 9 6 6" />
    </svg>
  );
}
