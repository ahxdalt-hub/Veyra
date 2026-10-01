"use client";

/**
 * Command-center sound cues.
 *
 * The paid-sale chime is the shipped audio file (public/sounds/
 * sale-chime.mp3 — the Shopify-style register), played through an
 * HTMLAudioElement. Fallback (file missing/codec dead) is a synthesized
 * two-strike bell. Failures get a low synthesized pitch-drop thud; other
 * events get a quiet tick. All cues are muteable and burst-guarded.
 *
 * Autoplay policy: a browser will not emit audio until the user has
 * interacted with the page, so `unlockAudio()` runs on the admin's first
 * pointer/key event (and on the topbar toggle). Until then cues are
 * skipped silently — the toast still slides in.
 *
 * Mute state persists in localStorage ("cc:sound"); the burst guard caps
 * playback at ~2 cues/sec so a rush of sales is a pleasant run of
 * chimes, not a machine gun.
 */

export type Cue = "sale" | "failed" | "tick";

import { SALE_CHIME_SRC } from "@/lib/admin/sound-asset";
import { useLocalStorageState } from "@/lib/use-local-storage";

const MUTE_KEY = "cc:sound";
const MIN_GAP_MS = 450;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false; // a user gesture has happened → audio is allowed
let saleAudio: HTMLAudioElement | null = null;
let lastPlayedAt = 0;

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(MUTE_KEY) === "off";
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUTE_KEY, muted ? "off" : "on");
}

/** React view of the mute preference — the house localStorage pattern
 *  (useSyncExternalStore): hydration-safe via a fixed server snapshot,
 *  no setState-in-effect, same-tab updates propagate to every subscriber.
 *  Returns [muted, setMuted]. The server snapshot AND the unset value are
 *  both "on" — sound is armed by default, exactly like isSoundMuted() on
 *  a fresh browser. */
export function useSoundMutedState(): [boolean, (muted: boolean) => void] {
  const [flag, setFlag] = useLocalStorageState(MUTE_KEY, "on");
  return [flag === "off", (muted: boolean) => setFlag(muted ? "off" : "on")];
}

/** Create/resume the shared AudioContext and prewarm the sale chime.
 *  Safe to call repeatedly — every path is idempotent. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  unlocked = true; // gesture happened — file playback is now allowed too
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // Gentle limiter so stacked partials never clip.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
  try {
    // Prewarm the chime at unlock time so the FIRST sale's sound is
    // instant — no mp3 fetch racing the toast.
    ensureSaleAudio().load();
  } catch {
    /* the file path is cosmetic here; play() retries lazily */
  }
}

/** Persistent gesture listeners for the autoplay-policy unlock. Unlike
 *  one-shot listeners these survive React StrictMode's double-mount and
 *  keep re-unlocking if the context ever gets suspended again. */
export function attachAudioUnlock(): () => void {
  if (typeof window === "undefined") return () => {};
  const onGesture = () => unlockAudio();
  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
  return () => {
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  };
}

function ensureSaleAudio(): HTMLAudioElement {
  if (!saleAudio) {
    // Data URI — plays regardless of static-asset serving and needs no
    // network fetch, so the first sale's chime is instant.
    saleAudio = new Audio(SALE_CHIME_SRC);
    saleAudio.preload = "auto";
    saleAudio.volume = 0.85;
  }
  return saleAudio;
}

/** One bell strike: fundamental + inharmonic partials, exp decay. */
function strike(freq: number, at: number, gain: number, decay: number, detune = 0) {
  if (!ctx || !master) return;
  const partials: [number, number][] = [
    [1, 1],
    [2.76, 0.4],
    [5.4, 0.18],
  ];
  for (const [ratio, level] of partials) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    osc.detune.value = detune;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain * level, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay * (ratio === 1 ? 1 : 0.55));
    osc.connect(g);
    g.connect(master);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

/** Tiny noise burst through a bandpass — the "tick" transient. */
function tickBody(at: number, gain: number) {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2400;
  bp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start(at);
}

/** Synthesized fallback for the file chime. */
function scheduleSaleFallback() {
  if (!ctx || !master) return;
  const t = ctx.currentTime + 0.01;
  strike(1318.5, t, 0.16, 0.9); // E6
  strike(1318.5 * 1.5, t + 0.13, 0.18, 1.1); // B6
  strike(2637, t + 0.13, 0.05, 0.7, 8); // faint shimmer octave
}

function scheduleFailed() {
  if (!ctx || !master) return;
  const t = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(196, t); // G3
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.22);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.14, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + 0.35);
}

function scheduleTick() {
  if (!ctx || !master) return;
  tickBody(ctx.currentTime + 0.01, 0.05);
}

/** Fire a cue. Skips silently when muted, not yet unlocked (no user
 *  gesture), or firing faster than the burst guard allows. */
export function playCue(cue: Cue): void {
  if (typeof window === "undefined" || !unlocked || isSoundMuted()) return;
  const now = performance.now();
  if (now - lastPlayedAt < MIN_GAP_MS) return;
  lastPlayedAt = now;
  try {
    if (cue === "sale") {
      const a = ensureSaleAudio();
      a.currentTime = 0;
      a.play().catch(() => {
        if (ctx && ctx.state === "running") scheduleSaleFallback();
      });
    } else {
      if (!ctx || ctx.state !== "running") return;
      if (cue === "failed") scheduleFailed();
      else scheduleTick();
    }
  } catch {
    /* audio must never break the UI */
  }
}

/** Map a notification to its cue. Money events get voices; the rest are
 *  silent so the chime keeps its meaning. */
export function cueForKind(kind: string): Cue | null {
  switch (kind) {
    case "sale":
      return "sale";
    case "payment_failed":
      return "failed";
    default:
      return null;
  }
}
