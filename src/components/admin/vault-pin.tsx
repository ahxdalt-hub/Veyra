"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playLoginCue } from "@/lib/admin/login-sound";

/**
 * The vault — stage two of the sign-in. A circular safe door in CSS 3D:
 * every entered digit rotates the dial a quarter turn and lights one of
 * the four rim bolts, each with a rising mechanical click. Four digits
 * auto-submit; a wrong code shakes the door and spins the dial back; a
 * correct one throws the bolts with a heavy clunk and swings the door
 * open before handing off to the command center.
 *
 * The pin itself is verified server-side (POST /api/admin/session with
 * the full credential set) — this component is theatre around a real
 * gate, never the gate.
 */

export type PinVerifyResult = { ok: boolean; error?: string };

const PIN_LENGTH = 4;
const BOLT_ANGLES = [45, 135, 225, 315];
const RIVET_ANGLES = [0, 60, 120, 180, 240, 300];

export function VaultPin({
  onVerify,
  onOpen,
}: {
  onVerify: (pin: string) => Promise<PinVerifyResult>;
  onOpen: () => void;
}) {
  const [digits, setDigits] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "wrong" | "open">(
    "idle"
  );
  const [message, setMessage] = useState("> enter the 4-digit vault code");
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  // The capture field owns the cursor so typing just works.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const openSequence = useCallback(() => {
    setStatus("open");
    setMessage("> bolts thrown — opening");
    playLoginCue("unlock");
    window.setTimeout(() => playLoginCue("vault"), 420);
    window.setTimeout(onOpen, 1500);
  }, [onOpen]);

  const verify = useCallback(
    async (pin: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setStatus("checking");
      setMessage("> checking the mechanism…");
      const result = await onVerify(pin);
      if (result.ok) {
        openSequence();
        return; // busy stays latched — the vault is open, we're done
      }
      playLoginCue("fail");
      setStatus("wrong");
      setMessage(`> ${result.error ?? "that code doesn't open this safe"}`);
      window.setTimeout(() => {
        setDigits("");
        setStatus("idle");
        setMessage("> enter the 4-digit vault code");
        busyRef.current = false;
        inputRef.current?.focus();
      }, 900);
    },
    [onVerify, openSequence]
  );

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (busyRef.current) return;
    const next = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (next.length > digits.length) {
      // One click per new digit, the mechanism's pitch climbing.
      for (let i = digits.length; i < next.length; i++) {
        playLoginCue("dial", i);
      }
    }
    setDigits(next);
    if (next.length === PIN_LENGTH) void verify(next);
  }

  const wrong = status === "wrong";
  const open = status === "open";
  const sceneClass = [
    "cc-vault-scene relative mt-10 flex flex-col items-center",
    wrong ? "wrong" : "",
    open ? "open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={sceneClass} onClick={() => inputRef.current?.focus()}>
      {/* The safe door */}
      <div className={`cc-vault${open ? " open" : ""}${wrong ? " wrong" : ""}`}>
        {RIVET_ANGLES.map((a) => (
          <span
            key={a}
            aria-hidden="true"
            className="cc-rivet"
            style={{ transform: `rotate(${a}deg) translateY(-117px)` }}
          />
        ))}
        {BOLT_ANGLES.map((a, i) => (
          <span
            key={a}
            aria-hidden="true"
            className={`cc-bolt${i < digits.length ? " lit" : ""}`}
            style={{ transform: `rotate(${a}deg) translateY(-117px)` }}
          />
        ))}
        <div
          aria-hidden="true"
          className="cc-dial"
          style={{
            ["--dial-rot" as string]: `${(open ? 4 : digits.length) * 90}deg`,
          }}
        >
          <span className="cc-handle" />
        </div>
      </div>

      {/* Code slots */}
      <div className="mt-8 flex gap-3" aria-hidden="true">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span key={i} className={`cc-pin-slot${digits[i] ? " filled" : ""}`}>
            {digits[i] ? "•" : ""}
          </span>
        ))}
      </div>

      {/* Mechanism line */}
      <p
        role="status"
        aria-live="polite"
        className="pt-4 text-center font-mono text-[11px] tracking-wide"
        style={{
          color:
            status === "wrong"
              ? "var(--cc-error)"
              : status === "open"
                ? "var(--cc-success)"
                : "var(--cc-text-4)",
        }}
      >
        {message}
      </p>

      {/* The real capture field — visually hidden, always focused */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Vault pin"
        value={digits}
        onChange={onChange}
        disabled={status === "checking" || open}
        className="cc-pin-capture"
      />
    </div>
  );
}
