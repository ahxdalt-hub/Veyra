/**
 * Sound — a tiny synthesizer for UI effects, via the Web Audio API.
 *
 * No audio files, no dependencies: every sound is generated from
 * oscillators at play time. Hover is a quiet sine tick; every answer pops
 * the same steady, satisfying click; back is a descending blip; the
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
  | "unlock"
  | "lock"
  | "teammate";

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
 * Play a named effect. Every answer click sounds identical, regardless of
 * position in the flow.
 */
export function playSfx(name: SfxName): void {
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
      // The main event: triangle pop + sine octave shimmer — identical
      // every time, a steady satisfying click rather than a rising scale.
      const f = 587.33; // D5
      tone(ac, { freq: f, at: t, dur: 0.1, gain: 0.05, type: "triangle" });
      tone(ac, { freq: f * 2, at: t, dur: 0.08, gain: 0.014, type: "sine" });
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
    case "lock":
      // Soft muted tap — a gentle "not here", never an error sound.
      tone(ac, { freq: 320, at: t, dur: 0.07, gain: 0.028, type: "sine" });
      tone(ac, { freq: 240, at: t + 0.055, dur: 0.1, gain: 0.02, type: "sine" });
      break;
    case "teammate":
      // A quiet, warm two-note "someone joined / said something" cue —
      // deliberately softer than "reveal" so live team activity never
      // startles or dominates the room.
      tone(ac, { freq: 659.25, at: t, dur: 0.13, gain: 0.026, type: "sine" });
      tone(ac, { freq: 987.77, at: t + 0.085, dur: 0.22, gain: 0.022, type: "sine" });
      break;
  }
}
