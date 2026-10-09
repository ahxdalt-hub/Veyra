"""
Veyra ad — soundtrack engine.
Synthesizes the full 120 s audio bed with numpy/scipy:

  music  — ambient-electronic score at 96 BPM: warm detuned pads, sub bass,
           soft four-on-the-floor kick, offbeat hats, plucked arpeggios and a
           bell motif. Minor/pad-only while the problem is on screen, rises
           into the reveal at 30 s, strips back for the "how it works" scene,
           bells for the offer, pads out under the CTA, final swell at 112 s.
  sfx    — every cue from storyboard.EVENTS (typewriter ticks, card pops,
           whooshes on cuts, dings on checkmarks, impacts on the logo, ...).

Both stems read the same timeline, so music hits and picture cuts agree.
Output: audio/track.wav (stereo 44.1 kHz, 120.000 s).
"""
import math
import wave

import numpy as np
from scipy import signal
from scipy.io import wavfile

import storyboard

SR = 44100
DUR = 120.0
N = int(SR * DUR)
BPM = 96.0
BEAT = 60.0 / BPM          # 0.625 s
BAR = 4 * BEAT             # 2.5 s

rng = np.random.default_rng(7)

# ------------------------------------------------------------------ dsp utils
def t_axis(n, sr=SR):
    return np.arange(n) / sr


def midi2f(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def butter_filt(x, fc, btype="low", order=2, fs=SR):
    if btype == "band":
        wn = (max(20.0, fc / 2.0), min(fc * 2.0, fs / 2.0 - 200.0))
    else:
        wn = min(fc, fs / 2.0 - 200.0)
    sos = signal.butter(order, wn, btype, fs=fs, output="sos")
    return signal.sosfilt(sos, x)


def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, sr=SR):
    na, nd, nr = int(a * sr), int(d * sr), int(r * sr)
    ns = max(0, n - na - nd - nr)
    e = np.concatenate([
        np.linspace(0, 1, max(1, na), endpoint=False),
        np.linspace(1, s, max(1, nd), endpoint=False),
        np.full(ns, s),
        np.linspace(s, 0, max(1, nr)),
    ])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))


def place(bus, snd, t0, gain=1.0, pan=0.0):
    """Add mono signal into stereo bus at time t0 with constant-power pan."""
    if len(snd) == 0:
        return
    i0 = int(t0 * SR)
    if i0 >= N:
        return
    snd = snd[: max(0, N - i0)]
    l = math.cos((pan + 1) * math.pi / 4)
    r = math.sin((pan + 1) * math.pi / 4)
    bus[0, i0:i0 + len(snd)] += snd * gain * l
    bus[1, i0:i0 + len(snd)] += snd * gain * r


# ------------------------------------------------------------------ instruments
def osc_saw(f, n, detune=0.0, sr=SR):
    ph = f * (1 + detune / 1200.0) * t_axis(n, sr)
    return 2.0 * (ph % 1.0) - 1.0


def pad_chord(freqs, dur, bright=1.0):
    """Warm detuned-saw pad with slow attack, lowpassed."""
    n = int(dur * SR)
    out = np.zeros(n)
    for f in freqs:
        for dt, w in ((-7, 0.5), (7, 0.5), (0, 0.25)):
            out += w * osc_saw(f, n, dt)
    cutoff = 950 * bright
    out = butter_filt(out, cutoff, "low", 2)
    e = env_adsr(n, a=1.1, d=0.3, s=0.85, r=1.6)
    return out * e * 0.11


def bass_note(f, dur):
    n = int(dur * SR)
    x = np.sin(2 * np.pi * f * t_axis(n)) + 0.35 * osc_saw(f, n)
    x = butter_filt(x, 320, "low", 2)
    e = np.minimum(t_axis(n) / 0.012, 1.0) * np.exp(-t_axis(n) * 1.4)
    e *= np.minimum(np.maximum((dur - t_axis(n)) / 0.06, 0), 1)
    return x * e * 0.5


def kick():
    n = int(0.30 * SR)
    t = t_axis(n)
    f = 110 * np.exp(-t * 22) + 42
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 13)
    click = butter_filt(rng.standard_normal(int(0.004 * SR)), 2500, "high") \
        * np.linspace(1, 0, int(0.004 * SR))
    x[: len(click)] += click * 0.5
    return x * 0.9


def hat(open=False):
    n = int((0.09 if open else 0.035) * SR)
    x = rng.standard_normal(n)
    x = butter_filt(x, 7000, "high", 2)
    return x * np.exp(-t_axis(n) * (22 if open else 70)) * 0.24


def shaker():
    n = int(0.07 * SR)
    x = rng.standard_normal(n)
    x = butter_filt(x, 5000, "band", 2)
    return x * np.exp(-t_axis(n) * 40) * 0.2


def pluck(f, dur=0.5, bright=2400.0):
    n = int(dur * SR)
    x = osc_saw(f, n) * 0.7 + 0.3 * np.sin(2 * np.pi * f * t_axis(n))
    # decaying brightness
    segs = 8
    out = np.zeros(n)
    for i in range(segs):
        a, b = i * n // segs, (i + 1) * n // segs
        fc = bright * np.exp(-i * 0.55)
        out[a:b] = butter_filt(x[a:b], max(200, fc), "low", 2)
    return out * np.exp(-t_axis(n) * 5.5) * 0.5


def bell(f, dur=1.6):
    n = int(dur * SR)
    out = np.zeros(n)
    for ratio, amp, tau in ((1.0, 1.0, 0.9), (2.76, 0.45, 0.45),
                            (5.40, 0.22, 0.25), (8.93, 0.10, 0.15)):
        out += amp * np.sin(2 * np.pi * f * ratio * t_axis(n)
                            + rng.uniform(0, 6.28)) * np.exp(-t_axis(n) / tau)
    return out * 0.28


# ------------------------------------------------------------------ sfx
def sfx_type():
    n = int(0.02 * SR)
    x = butter_filt(rng.standard_normal(n), 3000, "high") * 0.7
    x += 0.5 * np.sin(2 * np.pi * 900 * t_axis(n)) * np.exp(-t_axis(n) * 250)
    return x * np.exp(-t_axis(n) * 160) * 0.5


def sfx_key():
    n = int(0.03 * SR)
    x = butter_filt(rng.standard_normal(n), 1800, "band") * 0.6
    x += 0.4 * np.sin(2 * np.pi * 620 * t_axis(n)) * np.exp(-t_axis(n) * 150)
    return x * np.exp(-t_axis(n) * 110) * 0.55


def sfx_pop():
    n = int(0.09 * SR)
    t = t_axis(n)
    f = 620 * np.exp(-t * 26) + 190
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 34)
    x += 0.15 * butter_filt(rng.standard_normal(n), 2000, "high") \
        * np.exp(-t * 90)
    return x * 0.6


def sfx_tick():
    n = int(0.025 * SR)
    x = np.sin(2 * np.pi * 1250 * t_axis(n)) * np.exp(-t_axis(n) * 180)
    return x * 0.4


def sfx_tag():
    n = int(0.04 * SR)
    x = np.sin(2 * np.pi * 1660 * t_axis(n)) * np.exp(-t_axis(n) * 110)
    x += 0.3 * butter_filt(rng.standard_normal(n), 5000, "high") \
        * np.exp(-t_axis(n) * 200)
    return x * 0.33


def sfx_line():
    n = int(0.28 * SR)
    x = pluck(midi2f(57), 0.28, 1400) * 0.8
    return x * 0.5


def sfx_swish(dur=0.3):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    segs = 6
    out = np.zeros(n)
    for i in range(segs):
        a, b = i * n // segs, (i + 1) * n // segs
        fc = 700 + 2600 * (i / (segs - 1)) ** 1.4
        out[a:b] = butter_filt(x[a:b], fc, "band", 2)
    e = np.sin(np.pi * t_axis(n) / dur) ** 1.6
    return out * e * 0.5


def sfx_whoosh(dur=0.6, big=False):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    segs = 8
    out = np.zeros(n)
    for i in range(segs):
        a, b = i * n // segs, (i + 1) * n // segs
        fc = 320 + 2900 * math.sin(math.pi * i / (segs - 1)) ** 1.5
        out[a:b] = butter_filt(x[a:b], fc, "band", 2)
    e = np.sin(np.pi * t_axis(n) / dur) ** 1.3
    sub = np.sin(2 * np.pi * (60 + 50 * np.sin(math.pi * t_axis(n) / dur))
                 * t_axis(n)) * e * (0.5 if big else 0.22)
    out = butter_filt(out, 4500, "low") * e * (1.0 if big else 0.8) + sub
    return out * (0.85 if big else 0.6)


def sfx_ding(big=False):
    if big:
        a = bell(midi2f(88), 1.8) + 0.6 * bell(midi2f(93), 1.8)
        return a * 0.8
    return bell(midi2f(88), 1.3) * 0.62


def sfx_impact(big=True):
    n = int(0.9 * SR if big else 0.5 * SR)
    t = t_axis(n)
    f = (95 if big else 80) * np.exp(-t * 7) + 30
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    nz = butter_filt(rng.standard_normal(n), 900, "low") * np.exp(-t * 16)
    x = x * 1.05 + nz * 0.5
    return np.tanh(x * 1.4) * (1.0 if big else 0.62)


def sfx_sweep():
    n = int(0.9 * SR)
    t = t_axis(n)
    f = 340 * 2 ** (t / 0.9 * 2.0)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.9) ** 1.4
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    for i in range(5):
        a, b = i * n // 5, (i + 1) * n // 5
        out[a:b] = butter_filt(nz[a:b], 900 + 3800 * i / 4, "band", 2)
    out *= np.sin(np.pi * t / 0.9) ** 2
    return (x * 0.5 + out * 0.5) * 0.4


def sfx_sag():
    n = int(0.7 * SR)
    t = t_axis(n)
    f = 130 * np.exp(-t * 1.6) + 55
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.7)
    return butter_filt(x, 500, "low") * 0.4


def mix_snds(*snds):
    n = max(len(s) for s in snds)
    out = np.zeros(n)
    for s in snds:
        out[: len(s)] += s
    return out


SFX_FN = {
    "type": lambda e: (sfx_type(), 0.10 * e.get("vol", 1), e.get("pan", 0.0)),
    "key": lambda e: (sfx_key(), 0.13 * e.get("vol", 1), e.get("pan", 0.0)),
    "tick": lambda e: (sfx_tick(), 0.30, e.get("pan", 0.0)),
    "tick_s": lambda e: (sfx_tick(), 0.17 * e.get("vol", 1), e.get("pan", 0.0)),
    "tag": lambda e: (sfx_tag(), 0.30, e.get("pan", 0.0)),
    "pop": lambda e: (sfx_pop(), 0.34 * e.get("vol", 1), e.get("pan", 0.0)),
    "dot": lambda e: (sfx_pop(), 0.30, e.get("pan", 0.0)),
    "phase": lambda e: (mix_snds(sfx_whoosh(0.32) * 0.5, sfx_pop() * 0.6),
                        0.30, 0.0),
    "line": lambda e: (sfx_line(), 0.34, e.get("pan", 0.0)),
    "swish": lambda e: (sfx_swish(), 0.30, e.get("pan", 0.0)),
    "whoosh": lambda e: (sfx_whoosh(e.get("dur", 0.6), e.get("big", False)),
                         0.52, e.get("pan", 0.0)),
    "ding": lambda e: (sfx_ding(), 0.5, 0.0),
    "ding2": lambda e: (sfx_ding(True), 0.5, 0.0),
    "impact": lambda e: (sfx_impact(e.get("big", True)), 0.85, 0.0),
    "impact_soft": lambda e: (sfx_impact(False), 0.6, 0.0),
    "sweep": lambda e: (sfx_sweep(), 0.34, 0.0),
    "sag": lambda e: (sfx_sag(), 0.4, 0.0),
}

# ------------------------------------------------------------------ music
def section_envelope():
    """Per-instrument intensity over time (breakpoint curves)."""
    bp = lambda pts: (lambda tt: np.interp(tt, [p[0] for p in pts],
                                           [p[1] for p in pts]))
    kick = bp([(0, 0), (29.5, 0), (30, 1), (71.5, 1), (72, 0.8), (81.5, 0.8),
               (82, 0), (91.5, 0), (92, 1), (101.5, 1), (102, 0), (120, 0)])
    hats = bp([(0, 0), (22.5, 0.25), (29.5, 0.25), (30, 1), (81.5, 1),
               (82, 0.15), (91.5, 0.15), (92, 1), (101.5, 1), (102, 0),
               (120, 0)])
    bass = bp([(0, 0.5), (22.5, 0.5), (29.5, 0.5), (30, 1), (81.5, 0.9),
               (82, 0.5), (91.5, 0.6), (92, 1), (101.5, 0.9), (102, 0.45),
               (112, 0.5), (113.5, 0.5), (116, 0.3), (120, 0.3)])
    arp = bp([(0, 0), (22.5, 0.4), (29.5, 0.4), (30, 1), (81.5, 1),
              (82, 0.75), (101.5, 0.75), (102, 0.55), (111, 0.55), (112.5, 0),
              (120, 0)])
    pad = bp([(0, 0.85), (22.5, 0.8), (30, 1), (101.5, 1), (102, 0.8),
              (110, 0.8), (112, 0.9), (114, 0.7), (118.5, 0.5), (119.9, 0)])
    bellv = bp([(0, 0), (91.9, 0), (92, 1), (101.5, 1), (102, 0), (120, 0)])
    shk = bp([(0, 0), (54.9, 0), (55, 1), (81.5, 1), (82, 0), (120, 0)])
    return kick, hats, bass, arp, pad, bellv, shk


# chord chart: (start, midi notes) — two-bar feel, voiced low-mid
def chord_chart():
    def ch(root, *ivls):
        return [root] + [root + i for i in ivls]
    Am9 = ch(45, 7, 10, 14, 15)       # A2 E3 G3 B3 C4
    Fmaj7 = ch(41, 7, 11, 14)         # F2 C3 E3 A3
    Cmaj7 = ch(48, 7, 11, 16)         # C3 G3 B3 E4
    G6 = ch(43, 7, 16, 21)            # G2 D3 B3 E4
    Gadd9 = ch(43, 7, 14, 16)         # G2 D3 A3 B3
    chart = []
    # intro 0–22.5 (9 bars)
    intro = [Am9, Fmaj7, Cmaj7, G6, Am9, Fmaj7, Cmaj7, Gadd9, Gadd9]
    for i, c in enumerate(intro):
        chart.append((i * BAR, BAR + 0.6, c))
    # 22.5–30 tension
    for i, c in enumerate((Fmaj7, Gadd9, Gadd9)):
        chart.append((22.5 + i * BAR, BAR + 0.6, c))
    # 30–102: loop [C, G, Am, F] over the whole product story
    loop = ([48, 55, 64, 62], [43, 50, 59, 62], [45, 52, 60, 64],
            [41, 48, 57, 60])
    t = 30.0
    i = 0
    while t < 102.0 - 0.01:
        chart.append((t, BAR + 0.6, loop[i % 4]))
        t += BAR
        i += 1
    # 102–112 outro pads (Am9, Fmaj7, Cmaj7, G6)
    for i, c in enumerate((Am9, Fmaj7, Cmaj7, G6)):
        chart.append((102.0 + i * BAR, BAR + 1.2, c))
    # 112–120 final Cmaj9 ring
    chart.append((112.0, 8.0, [36, 48, 55, 59, 62, 64]))
    return chart


def build_music():
    bus = np.zeros((2, N))
    kick_v, hats_v, bass_v, arp_v, pad_v, bell_v, shk_v = section_envelope()

    # pads
    for (t0, dur, notes) in chord_chart():
        freqs = [midi2f(m) for m in notes[1:]]  # root handled by bass
        snd = pad_chord(freqs, dur, bright=1.0 if t0 < 30 else 1.15)
        for k in range(2):
            i0 = int(t0 * SR)
            seg = snd[: max(0, N - i0)]
            g = pad_v(np.arange(i0, i0 + len(seg)) / SR)
            bus[k, i0:i0 + len(seg)] += seg * g * (1.0 if k == 0 else 0.92)

    # bass — eighth notes on chord roots
    for (t0, dur, notes) in chord_chart():
        root = midi2f(notes[0])
        if t0 >= 112.0:
            continue
        for b in range(8):
            tb = t0 + b * BEAT / 2
            if tb >= 102.0 and b % 2 == 1:
                continue  # half-time after 102
            f = root * (2 if (b == 3 and bass_v(tb) > 0.8) else 1)
            n = int(BEAT / 2 * SR)
            snd = bass_note(f, BEAT / 2)
            i0 = int(tb * SR)
            seg = snd[: max(0, N - i0)]
            g = bass_v(np.arange(i0, i0 + len(seg)) / SR)
            bus[0, i0:i0 + len(seg)] += seg * g
            bus[1, i0:i0 + len(seg)] += seg * g

    # drums — kick from the drop at 30, hats from the tension at 22.5
    t = 29.5
    while t < 102.0:
        g = kick_v(np.array([t]))[0]
        if g > 0.01:
            place(bus, kick(), t, g * 0.85)
        t += BEAT
    t = 22.5
    while t < 102.0:
        g = hats_v(np.array([t + BEAT / 2]))[0]
        if g > 0.01:
            place(bus, hat(), t + BEAT / 2, g, pan=0.12)
        t += BEAT
    # shaker 16ths in the mid section
    t = 55.0
    while t < 82.0:
        g = shk_v(np.array([t]))[0]
        if g > 0.01:
            place(bus, shaker(), t, g * 0.6, pan=0.25)
        t += BEAT / 2

    # arpeggios — 8th-note chord tones, ping-pong delay
    arp_bus = np.zeros((2, N))
    for (t0, dur, notes) in chord_chart():
        if t0 >= 112.0:
            continue
        tones = notes[1:] + [notes[1] + 12]
        pattern = [tones[0], tones[2], tones[1], tones[3],
                   tones[0] + 12, tones[2], tones[3], tones[1]]
        for b, m in enumerate(pattern):
            tb = t0 + b * BEAT / 2
            if tb >= 111.5:
                break
            n = int(0.42 * SR)
            f = midi2f(m + 12)
            snd = pluck(f, 0.42, 2600) * 0.6
            i0 = int(tb * SR)
            seg = snd[: max(0, N - i0)]
            g = arp_v(np.arange(i0, i0 + len(seg)) / SR)
            pan = 0.3 if b % 2 else -0.3
            place(arp_bus, seg, tb, g, pan)

    # dotted-eighth delay on arps
    d = int(0.375 * SR)  # dotted 8th
    dl = np.zeros_like(arp_bus)
    src = arp_bus.copy()
    for rep, g in ((1, 0.42), (2, 0.18), (3, 0.08)):
        sh = d * rep
        dl[:, sh:] += src[:, :-sh] * g
    arp_bus = arp_bus + dl
    bus += arp_bus * 0.9

    # bell motif 92–102 (two phrases)
    motif = [
        (92.0, 79), (92.625, 84), (93.25, 88), (93.875, 86), (94.5, 84),
        (95.0, 81), (95.625, 79),
        (97.5, 76), (98.125, 81), (98.75, 84), (99.375, 88), (100.0, 86),
        (100.625, 84),
    ]
    for tb, m in motif:
        place(bus, bell(midi2f(m), 1.8), tb, bell_v(np.array([tb]))[0],
              pan=0.12)

    # riser 26–30
    nr = int(4.0 * SR)
    tr = t_axis(nr)
    f = midi2f(52) * 2 ** (tr / 4.0 * 2.0)
    rs = np.sin(2 * np.pi * np.cumsum(f) / SR) * (tr / 4.0) ** 2.2 * 0.20
    rs += butter_filt(rng.standard_normal(nr), 1400, "band") \
        * (tr / 4.0) ** 2.6 * 0.24
    place(bus, rs, 26.0, 0.9)

    # final chord already in chart via pad; add deep bell + sub swell at 112
    place(bus, bell(midi2f(72), 4.0), 112.0, 0.8)
    nsw = int(1.8 * SR)
    sw = np.sin(2 * np.pi * 65.41 * t_axis(nsw)) \
        * env_adsr(nsw, 0.6, 0.2, 0.7, 1.0)
    place(bus, sw, 112.0, 0.35)

    return bus


def build_sfx():
    bus = np.zeros((2, N))
    for e in storyboard.EVENTS:
        fn = SFX_FN.get(e["kind"])
        if fn is None:
            continue
        snd, g, pan = fn(e)
        place(bus, snd, e["t"], g, pan)
    return bus


# ------------------------------------------------------------------ reverb + master
def reverb(x, decay=1.7, level=1.0):
    """FFT-convolution reverb with an exponentially decaying noise IR."""
    n_ir = int(decay * SR)
    ir = rng.standard_normal((2, n_ir)) * np.exp(-np.arange(n_ir) / (SR * 0.42))
    ir[:, : int(0.02 * SR)] = 0.0  # predelay
    ir /= np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))
    out = np.zeros_like(x)
    for k in (0, 1):
        out[k] = signal.fftconvolve(x[k], ir[k])[: len(x[k])]
    return out * level


def main():
    print("building music...", flush=True)
    music = build_music()
    print("building sfx...", flush=True)
    sfx = build_sfx()

    print("reverb...", flush=True)
    rev = reverb(0.30 * music + 0.55 * sfx)
    mix = music + sfx + rev * 0.5

    # gentle highpass to keep it clean
    mix[0] = butter_filt(mix[0], 28, "high", 2)
    mix[1] = butter_filt(mix[1], 28, "high", 2)

    # master: soft clip, fades, normalize
    mix = np.tanh(mix * 1.15) / 1.15
    t = np.arange(N) / SR
    fade_in = np.clip(t / 0.06, 0, 1)
    fade_out = np.clip((119.85 - t) / 1.25, 0, 1)
    mix *= fade_in * fade_out
    peak = np.max(np.abs(mix))
    mix = mix / peak * 0.89
    print(f"peak pre-norm {peak:.3f}", flush=True)

    data = (mix.T * 32767).astype(np.int16)
    wavfile.write("audio/track.wav", SR, data)
    print("wrote audio/track.wav", data.shape, flush=True)


if __name__ == "__main__":
    main()
