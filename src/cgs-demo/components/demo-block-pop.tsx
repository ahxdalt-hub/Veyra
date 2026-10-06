"use client";

/**
 * Demo block popup — the answer to every "what if I…" in the web demo.
 * A small red-glowing card, an X, a shake, and a two-tone "denied" buzz. It rotates copy,
 * counts attempts, and re-shakes instead of stacking when you keep poking.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { onDemoBlocked, type BlockedKind } from "@/cgs-demo/lib/demo-guard";

const COPY: Record<BlockedKind, string[]> = {
  add: [
    "Foundry & Finch is fictional. So is your new record.",
    "Adding isn't a thing here — the demo ships pre-stocked.",
  ],
  edit: [
    "Typing at a demo is like honking at a parked car.",
    "This workspace is read-only. The ideas still count.",
  ],
  delete: [
    "Deleting fictional work? Even you'll find that hollow.",
    "Nothing leaves this demo. Not even a bad idea.",
  ],
  complete: [
    "You can't finish someone else's business. Metaphorically.",
    "Completion is for owners. Admiration is for visitors.",
  ],
  reset: [
    "Panic button's not on this demo.",
    "Fresh start? The studio starts fresh for every visitor already.",
  ],
  import: [
    "Your file, our stage — not happening.",
    "Imports stay in the desktop app, where the data is yours.",
  ],
  generic: [
    "Curious. The answer is still no.",
    "Looking is free. Everything else is closed.",
  ],
};

const TAIL = ["", "", " (attempt {n} — the door is still a demo)", " ({n}). Still nothing to change here."];

/**
 * "Restricted" buzzer — two gated pulses of a detuned low sawtooth pair,
 * the classic wrong-answer buzz. Synthesized, so no audio file ships and it
 * stays gesture-triggered (browser autoplay policies allow exactly this).
 * Plays on every block, even rapid-fire ones.
 */
function useDeniedSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  return () => {
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!ctxRef.current) ctxRef.current = new AC();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const t0 = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, t0);
      master.gain.exponentialRampToValueAtTime(0.18, t0 + 0.008);
      master.gain.setValueAtTime(0.18, t0 + 0.34);
      master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);

      // Sawtooth through a lowpass = harsh buzz without ear-piercing edge.
      const soften = ctx.createBiquadFilter();
      soften.type = "lowpass";
      soften.frequency.setValueAtTime(700, t0);
      soften.Q.setValueAtTime(0.7, t0);
      master.connect(soften);
      soften.connect(ctx.destination);

      // Two detuned saws beat against each other — that's the "buzz".
      const pulse = (at: number, dur: number) => {
        for (const freq of [130, 137]) {
          const osc = ctx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, at);
          osc.connect(master);
          osc.start(at);
          osc.stop(at + dur);
        }
      };
      pulse(t0, 0.14); // bzz—
      pulse(t0 + 0.2, 0.18); // —zzt
    } catch {
      /* autoplay policy or no audio device — the visual still answers */
    }
  };
}

export function DemoBlockPop() {
  const reduce = useReducedMotion();
  const denied = useDeniedSound();
  const [shown, setShown] = useState<{ kind: BlockedKind; n: number; nonce: number } | null>(null);
  const attempts = useRef<{ n: number; lastAt: number }>({ n: 0, lastAt: 0 });
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      onDemoBlocked((kind) => {
        const now = Date.now();
        const st = attempts.current;
        st.n = now - st.lastAt < 60_000 ? st.n + 1 : 1;
        st.lastAt = now;
        denied();
        setShown({ kind, n: st.n, nonce: now });
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setShown(null), 3400);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDemoBlocked is a stable module bus
    [shown],
  );

  const lines = shown ? COPY[shown.kind] : null;
  const line = lines ? lines[shown!.n % lines.length] : null;
  const tail = shown ? TAIL[Math.min(shown.n - 1, TAIL.length - 1)] : "";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4 sm:justify-end sm:pr-6">
      <AnimatePresence>
        {shown && line && (
          <motion.div
            key={shown.nonce}
            role="status"
            aria-live="assertive"
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.9 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, x: [0, -7, 7, -5, 5, -2, 2, 0] }}
            exit={{ opacity: 0, y: 10, scale: 0.95, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 26, x: { duration: 0.45 } }}
            className="pointer-events-auto flex max-w-[320px] items-start gap-2.5 rounded-xl border border-cgs-danger/40 bg-cgs-surface px-3.5 py-3 shadow-[0_0_0_1px_rgba(160,60,48,0.15),0_0_22px_rgba(160,60,48,0.35)]"
          >
            <CircleX className="mt-px h-4 w-4 shrink-0 text-cgs-danger" aria-hidden />
            <p className="text-[12.5px] leading-snug text-cgs-ink">
              {line}
              {tail && shown.n >= 3 && (
                <span className="text-cgs-danger">{tail.replace("{n}", String(shown.n))}</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setShown(null)}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 rounded-md px-1.5 py-0.5 text-[13px] text-cgs-faint transition-colors hover:bg-cgs-inset hover:text-cgs-ink"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
