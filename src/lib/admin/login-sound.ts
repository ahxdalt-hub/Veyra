"use client";

/**
 * Sign-in sound cues — a small synthesized kit for the login sequence.
 * Everything is WebAudio (no asset files), tuned quiet and warm to sit
 * inside the command center's register:
 *
 *   intro   — low swell + faint shimmer, the room "powering on"
 *   key     — near-silent tick, one per typed character
 *   enter   — firmer mechanical press (thump + tick)
 *   success — two-note warm bell rising (granted)
 *   fail    — low pitch-drop thud (refused)
 *   dial    — metallic click per pin digit, pitch rising per step
 *   unlock  — the heavy clunk: bolts retracting, lock throwing open
 *   vault   — deep resolving swell as the door swings
 *
 * Autoplay policy: browsers won't emit audio before a user gesture, so
 * cues skip silently until unlock (first pointer/key event). The intro
 * chord defers to the first gesture if it fires before one happens.
 * Mute state is the command center's shared "cc:sound" preference.
 */

import { isSoundMuted } from "@/lib/admin/sound";

export type LoginCue =
  | "intro"
  | "key"
  | "enter"
  | "success"
  | "fail"
  | "dial"
  | "unlock"
  | "vault";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;
let introPending = false;
let introPlayed = false;

/** Create/resume the shared AudioContext. Idempotent. */
export function unlockLoginAudio(): void {
  if (typeof window === "undefined") return;
  unlocked = true;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    // The intro chord is the one cue that can fire before any gesture
    // (page load). If it was asked for and never played, play it now —
    // the reveal is still on screen during the first seconds.
    if (introPending && !introPlayed) {
      introPending = false;
      playLoginCue("intro");
    }
  } catch {
    ctx = null;
  }
}

/** Attach the gesture listeners that unlock audio. Returns a cleanup. */
export function attachLoginAudioUnlock(): () => void {
  if (typeof window === "undefined") return () => {};
  const onGesture = () => unlockLoginAudio();
  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
  return () => {
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  };
}

function strike(
  freq: number,
  at: number,
  gain: number,
  decay: number,
  type: OscillatorType = "sine"
) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(g);
  g.connect(master);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

function swell(freq: number, at: number, gain: number, attack: number, release: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
  osc.connect(g);
  g.connect(master);
  osc.start(at);
  osc.stop(at + attack + release + 0.1);
}

function tickBody(at: number, gain: number, freq = 2400) {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * 0.035);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = 1.6;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start(at);
}

function schedule(cue: LoginCue, step = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + 0.01;
  switch (cue) {
    case "intro":
      // Low room tone rising under a faint fifth, then a soft high shimmer.
      swell(98, t, 0.05, 0.55, 1.6); // G2
      swell(147, t + 0.12, 0.03, 0.6, 1.5); // D3
      strike(1174.7, t + 0.45, 0.02, 1.2); // D6 shimmer
      strike(1760, t + 0.55, 0.012, 1.0); // A6
      break;
    case "key":
      tickBody(t, 0.035, 3200);
      break;
    case "enter":
      tickBody(t, 0.06, 1800);
      strike(130.8, t, 0.09, 0.16, "triangle"); // C3 press
      break;
    case "success":
      // Warm rising third — resolution, not fanfare.
      strike(659.3, t, 0.09, 0.7); // E5
      strike(987.8, t + 0.12, 0.11, 1.1); // B5
      strike(1975.5, t + 0.12, 0.03, 0.7); // faint octave
      strike(130.8, t, 0.05, 0.5, "triangle"); // low bed
      break;
    case "fail":
      strike(196, t, 0.11, 0.28, "sine"); // G3 drop
      break;
    case "dial": {
      // Mechanism click: noise transient + short metallic ping, the
      // pitch climbing with each entered digit (0–3).
      tickBody(t, 0.05, 900 + step * 260);
      strike(660 + step * 110, t, 0.045, 0.09, "square");
      strike(110 + step * 30, t, 0.06, 0.1, "triangle"); // detent thump
      break;
    }
    case "unlock":
      // The clunk: a heavy low throw, then the bolt wheels rattling home.
      strike(65.4, t, 0.22, 0.3, "triangle"); // C2 body
      strike(98, t + 0.02, 0.1, 0.18); // G2
      strike(1244.5, t + 0.07, 0.05, 0.35); // D#6 ring
      strike(1864.7, t + 0.09, 0.035, 0.45); // A#6 shimmer
      tickBody(t + 0.06, 0.05, 700); // bolt scrape
      break;
    case "vault":
      // Door swing: deep air moving, then the room resolves warm.
      swell(65.4, t, 0.05, 0.35, 1.4); // C2 breath
      strike(261.6, t + 0.12, 0.06, 1.3); // C4
      strike(392, t + 0.2, 0.05, 1.5); // G4
      strike(1568, t + 0.3, 0.018, 1.1); // G6 air
      break;
  }
}

function pitchDrop() {
  if (!ctx || !master) return;
  const t = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(95, t + 0.24);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + 0.4);
}

/** Fire a cue. `step` (0–3) raises the dial click's pitch per digit.
 *  Skips silently when muted, locked (no gesture yet), or the context
 *  is dead — sound must never break the UI. */
export function playLoginCue(cue: LoginCue, step = 0): void {
  if (typeof window === "undefined" || isSoundMuted()) return;
  if (cue === "intro") {
    if (introPlayed) return;
    if (!unlocked) {
      introPending = true; // replay on the first gesture
      return;
    }
    introPlayed = true;
  }
  try {
    if (!ctx) {
      unlockLoginAudio();
      if (!ctx) return;
    }
    // Schedule even if the context is still briefly suspended — queued
    // events fire the moment it resumes, so the intro chord survives
    // the autoplay-policy handshake.
    if (cue === "fail") pitchDrop();
    else schedule(cue, step);
  } catch {
    /* audio must never break the UI */
  }
}
