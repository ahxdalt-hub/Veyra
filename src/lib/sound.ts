/**
 * Sound — a tiny synthesizer for UI effects, via the Web Audio API.
 *
 * No audio files, no dependencies: every sound is generated from
 * oscillators at play time. Hover is a quiet sine tick; each answer pops
 * a pentatonic step HIGHER than the last, so completing the quiz walks an
 * ascending scale (the "level-up" feel); back is a descending blip; the
 * reveal is a short arpeggio.
 *
 * Preferences persist under `veyra:sfx` and default to ON. The AudioContext
 * is created lazily inside a user gesture (every play call happens in a
 * handler), so autoplay policy is never violated. All exports are safe to
 * import server-side: play is a no-op without `window`.
 */

export type SfxName =
  | "hover"
  | "select"
  | "back"
  | "reveal"
  | "unlock";

/** Pentatonic ladder (C major pentatonic) — any two steps sound pleasant. */
const SCALE_SEMITONES = [0, 2, 4, 7, 9];
const BASE_HZ = 523.25; // C5

function stepFreq(step: number): number {
  const clamped = Math.min(step, 14);
  const octave = 1 + Math.floor(clamped / SCALE_SEMITONES.length);
  const semitone = SCALE_SEMITONES[clamped % SCALE_SEMITONES.length];
  return BASE_HZ * octave * Math.pow(2, semitone / 12);
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Preference store (module singleton, mirrored into React via the     */
/* subscribe function — see components/audit/use-sounds.ts)            */
/* ------------------------------------------------------------------ */

const PREF_KEY = "veyra:sfx";
let enabled: boolean | null = null;
const listeners = new Set<() => void>();

function readPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return (window.localStorage.getItem(PREF_KEY) ?? "on") === "on";
  } catch {
    return true;
  }
}

/** Current on/off state (client) — never false during SSR/hydration. */
export function soundsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  if (enabled === null) enabled = readPref();
  return enabled;
}

export function setSoundsEnabled(next: boolean): void {
  enabled = next;
  try {
    window.localStorage.setItem(PREF_KEY, next ? "on" : "off");
  } catch {
    /* private mode — session-only preference */
  }
  listeners.forEach((l) => l());
}

export function subscribeSounds(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ------------------------------------------------------------------ */
/* Synthesis                                                           */
/* ------------------------------------------------------------------ */

type Tone = {
  freq: number;
  at: number;
  dur: number;
  gain: number;
  type?: OscillatorType;
  glideTo?: number;
};

function tone(ac: AudioContext, t: Tone): void {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = t.type ?? "sine";
  osc.frequency.setValueAtTime(t.freq, t.at);
  if (t.glideTo) {
    osc.frequency.exponentialRampToValueAtTime(t.glideTo, t.at + t.dur);
  }
  g.gain.setValueAtTime(0.0001, t.at);
  g.gain.exponentialRampToValueAtTime(t.gain, t.at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t.at + t.dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t.at);
  osc.stop(t.at + t.dur + 0.02);
}

/**
 * Play a named effect. `step` (for "select") is the question index — the
 * pentatonic ladder ascends with it, one rung per answered question.
 */
export function playSfx(name: SfxName, step = 0): void {
  if (!soundsEnabled()) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;

  switch (name) {
    case "hover":
      // A whisper-quiet tick — felt more than heard.
      tone(ac, { freq: 1150, at: t, dur: 0.045, gain: 0.012, type: "sine" });
      break;
    case "select": {
      // The main event: triangle pop + sine octave shimmer, rising per step.
      const f = stepFreq(step);
      tone(ac, { freq: f, at: t, dur: 0.11, gain: 0.05, type: "triangle" });
      tone(ac, { freq: f * 2, at: t, dur: 0.09, gain: 0.016, type: "sine" });
      break;
    }
    case "back":
      tone(ac, {
        freq: 700,
        at: t,
        dur: 0.09,
        gain: 0.03,
        type: "triangle",
        glideTo: 450,
      });
      break;
    case "reveal": {
      // C–E–G–C arpeggio — the score landing.
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        tone(ac, {
          freq,
          at: t + i * 0.07,
          dur: 0.34,
          gain: 0.032,
          type: "sine",
        });
      });
      break;
    }
    case "unlock":
      // Two-note sparkle — the gate opening.
      tone(ac, { freq: 783.99, at: t, dur: 0.16, gain: 0.035, type: "sine" });
      tone(ac, { freq: 1318.5, at: t + 0.09, dur: 0.3, gain: 0.03, type: "sine" });
      break;
  }
}
