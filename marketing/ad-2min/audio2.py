"""
Veyra ad 2 — soundtrack: narrator + score + SFX in one 80 s master.

  vo     — the 16 neural-voice lines placed at their measured times
  music  — 100 BPM score in F major that follows the story: curious pads
           (hook) -> uneasy pulse (chaos) -> subscription tension -> ticking
           math -> full bright release at the switch -> warm payoff -> CTA.
           Ducked ~4.5 dB under every narrator line.
  sfx    — every cue from storyboard2.EVENTS.

Output: audio/track2.wav (stereo 44.1 kHz, exactly 80.0 s).
"""
import importlib.util
import math
import wave

import numpy as np
from scipy import signal
from scipy.io import wavfile

import audio as A  # ad-1 synthesis toolkit (instruments, sfx, reverb)
import storyboard2

SR = A.SR
TOTAL = storyboard2.TOTAL
N = int(SR * TOTAL)
BPM = 100.0
BEAT = 60.0 / BPM      # 0.6 s
BAR = 4 * BEAT         # 2.4 s

_spec = importlib.util.spec_from_file_location("timings", "vo2/timings.py")
TL = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(TL)
LINES = TL.LINES
S = storyboard2.S
T = storyboard2.T


# ------------------------------------------------------------------ vo bus
def build_vo():
    bus = np.zeros((2, N))
    for lid, t0, _d in LINES:
        with wave.open(f"vo2/{lid}.wav", "rb") as w:
            x = np.frombuffer(w.readframes(w.getnframes()),
                              dtype=np.int16).astype(np.float64) / 32768.0
            x = x.reshape(-1, 2).T
        x[0] = A.butter_filt(x[0], 75, "high", 2)
        x[1] = A.butter_filt(x[1], 75, "high", 2)
        peak = np.max(np.abs(x)) + 1e-9
        x *= 0.62 / peak
        i0 = int(t0 * SR)
        m = min(x.shape[1], N - i0)
        bus[:, i0:i0 + m] += x[:, :m]
    return bus


# ------------------------------------------------------------------ music
def chord_chart():
    F = [41, 48, 52, 57, 60]       # Fmaj7
    Dm = [38, 45, 53, 57, 60]      # Dm7
    Bb = [46, 53, 57, 62]          # Bb maj
    C = [36, 48, 55, 64]           # C
    chart = []
    sections = [
        (0.0, 8.7, [F, Dm, F, Dm], "pad"),
        (8.7, 17.8, [Dm, Bb, Dm, Bb], "pulse"),
        (17.8, 33.2, [Dm, Bb, F, C], "tension"),
        (33.2, 40.0, [Dm, Bb], "math"),
        (40.0, 56.1, [F, C, Dm, Bb], "full"),
        (56.1, 68.7, [Bb, F, C, Dm], "warm"),
        (68.7, 76.8, [F, Dm, Bb], "sparse"),
    ]
    for (sec_t0, sec_t1, chords, kind) in sections:
        i = 0
        t = sec_t0
        while t < sec_t1 - 0.2:
            dur = min(BAR + 0.5, sec_t1 - t + 0.4)
            chart.append((t, dur, chords[i % len(chords)], kind))
            t += BAR
            i += 1
    chart.append((76.8, TOTAL - 76.8 + 0.6, [41, 48, 55, 60, 64], "final"))
    return chart


def section_env():
    bp = lambda pts: (lambda tt: np.interp(tt, [p[0] for p in pts],
                                           [p[1] for p in pts]))
    kick = bp([(0, 0), (24.9, 0), (25, 0.5), (29.9, 0.5), (30, 0),
               (33.2, 0), (39.9, 0), (40, 1), (68.5, 1), (68.7, 0),
               (80, 0)])
    hats = bp([(0, 0), (8.7, 0.3), (17.7, 0.3), (17.8, 0.9), (33.2, 0.9),
               (33.3, 0.35), (39.9, 0.35), (40, 1), (68.5, 1), (68.7, 0.25),
               (75, 0.25), (76, 0), (80, 0)])
    bass = bp([(0, 0.35), (8.7, 0.5), (17.8, 0.85), (33.2, 0.8), (40, 1),
               (68.5, 1), (68.7, 0.5), (76, 0.4), (80, 0.4)])
    arp = bp([(0, 0.5), (8.7, 0.55), (17.8, 0.7), (33.2, 0.25), (39.9, 0.25),
              (40, 1), (68.5, 1), (68.7, 0.6), (78, 0.6), (79.4, 0),
              (80, 0)])
    pad = bp([(0, 0.8), (17.8, 0.75), (33.2, 0.6), (39.9, 0.6), (40, 0.9),
              (68.5, 0.9), (68.7, 0.8), (76, 0.8), (78.2, 0.7), (79.9, 0)])
    shk = bp([(0, 0), (40, 0), (48, 0.8), (56, 0.8), (68.5, 0.8), (68.7, 0),
              (80, 0)])
    bell = bp([(0, 0), (55.9, 0), (56.1, 1), (68.5, 1), (68.7, 0), (80, 0)])
    return kick, hats, bass, arp, pad, shk, bell


BASS_ROOT = {41: 29, 38: 26, 46: 34, 36: 36}  # chord root -> bass octave


def build_music():
    bus = np.zeros((2, N))
    kick_v, hats_v, bass_v, arp_v, pad_v, shk_v, bell_v = section_env()
    chart = chord_chart()
    tt_grid = np.arange(N) / SR

    # pads
    for (t0, dur, notes, kind) in chart:
        freqs = [A.midi2f(m) for m in notes[1:]]
        bright = 1.0 if kind in ("pad", "sparse", "final") else 1.2
        snd = A.pad_chord(freqs, dur, bright=bright)
        i0 = int(t0 * SR)
        seg = snd[: max(0, N - i0)]
        g = pad_v(tt_grid[i0:i0 + len(seg)])
        vol = {"pad": 1.0, "pulse": 0.85, "tension": 0.8, "math": 0.7,
               "full": 1.0, "warm": 1.0, "sparse": 1.0, "final": 1.1}[kind]
        bus[0, i0:i0 + len(seg)] += seg * g * vol
        bus[1, i0:i0 + len(seg)] += seg * g * vol * 0.92

    # bass eighths
    for (t0, dur, notes, kind) in chart:
        root = BASS_ROOT.get(notes[0], notes[0])
        f = A.midi2f(root)
        b = 0
        tb = t0
        while tb < t0 + dur - 0.55 and tb < TOTAL - 0.3:
            snd = A.bass_note(f, BEAT / 2)
            i0 = int(tb * SR)
            m = min(len(snd), N - i0)
            g = bass_v(tt_grid[i0:i0 + m])
            bus[0, i0:i0 + m] += snd[:m] * g
            bus[1, i0:i0 + m] += snd[:m] * g
            b += 1
            tb += BEAT / 2

    # kick + hats
    t = 24.9
    while t < 68.6:
        g = kick_v(np.array([t]))[0]
        if g > 0.02:
            A.place(bus, A.kick(), t, g * 0.8)
        t += BEAT
    t = 8.7
    while t < 76.0:
        g = hats_v(np.array([t + BEAT / 2]))[0]
        if g > 0.02:
            A.place(bus, A.hat(), t + BEAT / 2, g, pan=0.12)
        t += BEAT
    t = 48.0
    while t < 68.5:
        g = shk_v(np.array([t]))[0]
        if g > 0.02:
            A.place(bus, A.shaker(), t, g * 0.55, pan=0.25)
        t += BEAT / 2

    # arpeggios with dotted-eighth delay
    arp_bus = np.zeros((2, N))
    for (t0, dur, notes, kind) in chart:
        if kind in ("pad",):
            continue
        tones = notes[1:] + [notes[1] + 12]
        pattern = [tones[0], tones[2], tones[1], tones[3],
                   tones[0] + 12, tones[2], tones[3], tones[1]]
        b = 0
        tb = t0
        while tb < t0 + dur - 0.4 and tb < TOTAL - 0.4:
            m = pattern[b % 8]
            snd = A.pluck(A.midi2f(m + 12), 0.4, 2600) * 0.55
            i0 = int(tb * SR)
            m2 = min(len(snd), N - i0)
            g = arp_v(tt_grid[i0:i0 + m2])
            A.place(arp_bus, snd[:m2], tb, g, pan=0.3 if b % 2 else -0.3)
            b += 1
            tb += BEAT / 2
    d = int(0.45 * SR)
    dl = np.zeros_like(arp_bus)
    src = arp_bus.copy()
    for rep, g in ((1, 0.4), (2, 0.16)):
        dl[:, d * rep:] += src[:, :-d * rep] * g
    bus += (arp_bus + dl) * 0.85

    # tick-tock stabs during the math scene
    t = T["L05"] - 0.3
    while t < S["S5_switch"] - 0.3:
        A.place(bus, A.pluck(A.midi2f(72), 0.3, 1800) * 0.5, t, 0.5)
        t += BEAT

    # bell motif over the payoff
    motif = [(57.4, 81), (58.0, 84), (58.6, 89), (59.2, 86), (59.8, 84),
             (60.4, 81), (61.6, 79), (62.2, 84), (62.8, 86), (63.4, 84),
             (64.6, 81), (65.2, 77), (66.4, 79)]
    for tb, m in motif:
        A.place(bus, A.bell(A.midi2f(m), 1.6), tb,
                bell_v(np.array([tb]))[0] * 0.85, pan=0.1)

    # riser into the switch (36.6 -> 40.0)
    nr = int(3.4 * SR)
    tr = A.t_axis(nr)
    f = A.midi2f(57) * 2 ** (tr / 3.4 * 1.8)
    rs = np.sin(2 * np.pi * np.cumsum(f) / SR) * (tr / 3.4) ** 2.2 * 0.16
    rs += A.butter_filt(np.random.default_rng(3).standard_normal(nr), 1500,
                        "band") * (tr / 3.4) ** 2.6 * 0.2
    A.place(bus, rs, 36.6, 0.85)

    return bus


# ------------------------------------------------------------------ sfx
def sfx_thud():
    n = int(0.3 * SR)
    t = A.t_axis(n)
    f = 120 * np.exp(-t * 16) + 45
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)
    nz = A.butter_filt(np.random.default_rng(5).standard_normal(n), 600,
                       "low") * np.exp(-t * 30)
    return (x * 0.9 + nz * 0.4) * 0.8


def sfx_blip():
    n = int(0.09 * SR)
    x = np.sin(2 * np.pi * 1560 * A.t_axis(n)) * np.exp(-A.t_axis(n) * 60)
    return x * 0.35


def sfx_boing():
    """Springy landing: pitch springs up with a wobble, then settles."""
    n = int(0.45 * SR)
    t = A.t_axis(n)
    f = 500 - 260 * np.exp(-t * 9) * np.cos(2 * np.pi * 8 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    click = A.butter_filt(np.random.default_rng(9).standard_normal(
        int(0.005 * SR)), 2000, "high") * np.linspace(1, 0,
                                                      int(0.005 * SR))
    x[: len(click)] += click * 0.4
    return x * 0.5


SFX_FN = {
    "whoosh": lambda e: (A.sfx_whoosh(e.get("dur", 0.6), e.get("big", False)),
                         0.5, e.get("pan", 0.0)),
    "pop": lambda e: (A.sfx_pop(), 0.32 * e.get("vol", 1), e.get("pan", 0.0)),
    "dot": lambda e: (A.sfx_pop(), 0.28, 0.0),
    "tick": lambda e: (A.sfx_tick(), 0.28, e.get("pan", 0.0)),
    "tick_s": lambda e: (A.sfx_tick(), 0.16 * e.get("vol", 1),
                         e.get("pan", 0.0)),
    "line": lambda e: (A.sfx_line(), 0.3, 0.0),
    "swish": lambda e: (A.sfx_swish(), 0.28, e.get("pan", 0.0)),
    "key": lambda e: (A.sfx_key(), 0.12 * e.get("vol", 1), 0.0),
    "ding": lambda e: (A.sfx_ding(), 0.45, 0.0),
    "ding2": lambda e: (A.sfx_ding(True), 0.45, 0.0),
    "impact": lambda e: (A.sfx_impact(e.get("big", True)), 0.8, 0.0),
    "impact_soft": lambda e: (A.sfx_impact(False), 0.55, 0.0),
    "thud": lambda e: (sfx_thud(), 0.5, 0.0),
    "blip": lambda e: (sfx_blip(), 0.4 * e.get("vol", 1), 0.0),
    "boing": lambda e: (sfx_boing(), 0.42, e.get("pan", 0.0)),
    "sweep": lambda e: (A.sfx_sweep(), 0.3, 0.0),
    "sag": lambda e: (A.sfx_sag(), 0.35, 0.0),
}


def build_sfx():
    bus = np.zeros((2, N))
    for e in storyboard2.EVENTS:
        if e["kind"] == "vo_start":
            continue
        fn = SFX_FN.get(e["kind"])
        if fn is None:
            print("missing sfx:", e["kind"])
            continue
        snd, g, pan = fn(e)
        A.place(bus, snd, e["t"], g, pan)
    return bus


def duck_envelope():
    """1.0 when no narration, 0.55 under lines (0.25 s ramps)."""
    t = np.arange(N) / SR
    duck = np.zeros(N)
    for _lid, t0, d in LINES:
        a0, a1 = t0 - 0.22, t0 + d + 0.22
        duck += np.clip((t - a0) / 0.25, 0, 1) * np.clip((a1 - t) / 0.25, 0, 1)
    return 1.0 - 0.45 * np.clip(duck, 0, 1)


def main():
    print("vo...", flush=True)
    vo = build_vo()
    print("music...", flush=True)
    music = build_music()
    print("sfx...", flush=True)
    sfx = build_sfx()

    music *= duck_envelope()
    print("reverb...", flush=True)
    rev = A.reverb(0.25 * music + 0.45 * sfx)
    mix = music * 0.95 + sfx * 0.95 + vo * 1.0 + rev * 0.4

    t = np.arange(N) / SR
    mix *= np.clip(t / 0.08, 0, 1)
    mix *= np.clip((79.9 - t) / 1.3, 0, 1)
    mix = np.tanh(mix * 1.12) / 1.12
    peak = np.max(np.abs(mix))
    mix = mix / peak * 0.89
    print(f"peak pre-norm {peak:.3f}", flush=True)
    wavfile.write("audio/track2.wav", SR, (mix.T * 32767).astype(np.int16))
    print("wrote audio/track2.wav", flush=True)


if __name__ == "__main__":
    main()
