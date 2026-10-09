"""
Veyra ad 2 — pure motion-graphics cut (80 s, narrator-led).

No character rigs: Amara appears as a clean circle portrait, and a virtual
CAMERA carries the energy — slow push-ins, hard punch-in cuts on beats,
pull-back reveals on the wordmark, and hit-zooms on impacts.

  CAM      keyframed (t, zoom, focus_x, focus_y, cut) — eased between keys,
           instant jumps on `cut`
  PUNCHES  (t, amp, focus, dur) — instant zoom bump that eases back

Scene boundaries come from vo2/timings.py (generated from the real
narrator audio), so every camera beat lands on the voice.
"""
from __future__ import annotations

import importlib.util
import math

from PIL import Image

from engine import *  # noqa: F401,F403
from engine import _d2
import engine as E
import storyboard as sb1  # enter/exit_f/eyebrow_center + window chrome
from storyboard import enter, exit_f, eyebrow_center  # noqa: F401

_spec = importlib.util.spec_from_file_location("timings", "vo2/timings.py")
TL = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(TL)

TOTAL = TL.TOTAL
S = {k: v for k, v in TL.SCENES.items()}
T = {lid: t for lid, t, _d in TL.LINES}
D = {lid: d for lid, _t, d in TL.LINES}

SCENE_SHEET = [
    (S["S1_hook"], 1, "MEET AMARA"),
    (S["S2_problem"], 2, "THE CHAOS"),
    (S["S3_subs"], 3, "THE SUBSCRIPTION TRAP"),
    (S["S4_math"], 4, "THE MATH"),
    (S["S5_switch"], 5, "THE SWITCH"),
    (S["S6_wins"], 6, "THE PAYOFF"),
    (S["S7_cta"], 7, "START TODAY"),
]


def scene_at(t):
    cur = SCENE_SHEET[0]
    for s in SCENE_SHEET:
        if t >= s[0]:
            cur = s
        else:
            break
    return cur


# ------------------------------------------------------------------ camera
# (t, zoom, focus_x, focus_y, cut)
CAM = [
    (0.0, 1.02, 860, 540, False),
    (3.4, 1.10, 780, 520, False),
    (5.8, 1.06, 800, 530, False),
    (6.2, 1.55, 620, 430, True),
    (8.55, 1.55, 620, 430, False),
    (S["S2_problem"], 1.12, 1340, 450, True),
    (11.40, 1.14, 1340, 460, False),
    (11.45, 1.12, 1340, 450, True),
    (T["L02c"], 1.10, 1340, 430, True),
    (17.60, 1.20, 1340, 450, False),
    (S["S3_subs"], 1.00, 960, 540, True),
    (25.0, 1.12, 1285, 500, False),
    (29.6, 1.28, 1330, 480, True),
    (33.1, 1.28, 1330, 480, False),
    (S["S4_math"], 1.05, 960, 540, True),
    (33.6, 1.08, 960, 540, False),
    (37.2, 1.32, 625, 520, False),
    (37.5, 1.30, 1295, 520, True),
    (40.0, 1.30, 1295, 520, False),
    (S["S5_switch"], 1.30, 960, 480, True),
    (41.5, 1.00, 960, 540, False),
    (42.6, 1.12, 960, 580, False),
    (48.0, 1.12, 960, 580, False),
    (T["L07a"], 1.00, 960, 540, True),
    (52.1, 1.00, 960, 540, False),
    (T["L07b"], 1.28, 960, 470, True),
    (56.0, 1.28, 960, 470, False),
    (S["S6_wins"], 1.00, 960, 540, True),
    (61.5, 1.10, 1345, 700, False),
    (68.5, 1.18, 1345, 760, False),
    (S["S7_cta"], 1.00, 960, 500, True),
    (72.4, 1.00, 960, 500, False),
    (72.5, 1.15, 960, 545, True),
    (75.0, 1.15, 960, 545, False),
    (78.9, 1.26, 960, 620, False),
]

# (t, zoom_amp, focus_x, focus_y, dur) — instant bump, eases back
PUNCHES = [
    (13.0, 0.38, 1340, 470, 0.9),
    (T["L04b"] + 1.75, 0.30, 1330, 560, 0.8),
    (T["L06"] + 0.9, 0.05, 960, 480, 0.5),
    (T["L07a"] + 0.9, 0.42, 1330, 198, 1.0),
    (T["L08a"] + 0.4, 0.30, 1350, 305, 0.9),
    (T["L08a"] + 2.4, 0.30, 1350, 525, 0.9),
    (T["L08b"] + D["L08b"] - 0.5, 0.22, 1345, 880, 0.8),
    (T["L09"] + 0.25, 0.18, 960, 450, 0.8),
    (T["L05"] + 4.15, 0.12, 1295, 620, 0.7),
]


def camera_at(t):
    """Returns (zoom, cx, cy) for time t."""
    z, cx, cy = CAM[0][1], CAM[0][2], CAM[0][3]
    for i in range(len(CAM) - 1):
        t0, z0, x0, y0, cut0 = CAM[i]
        t1, z1, x1, y1, _ = CAM[i + 1]
        if t0 <= t < t1:
            if cut0:
                z, cx, cy = z0, x0, y0
            else:
                p = ease_in_out_cubic(clamp01((t - t0) / max(1e-6, t1 - t0)))
                z = lerp(z0, z1, p)
                cx = lerp(x0, x1, p)
                cy = lerp(y0, y1, p)
            break
    else:
        z, cx, cy = CAM[-1][1], CAM[-1][2], CAM[-1][3]
    for (pt, amp, px, py, dur) in PUNCHES:
        if pt <= t < pt + dur:
            tau = (t - pt) / dur
            bump = (1 - tau) ** 1.6
            z += amp * bump
            cx = lerp(cx, px, min(1.0, bump * 1.4))
            cy = lerp(cy, py, min(1.0, bump * 1.4))
    z = max(1.0, z)
    half_w, half_h = W / (2 * z), H / (2 * z)
    cx = min(max(cx, half_w), W - half_w)
    cy = min(max(cy, half_h), H - half_h)
    return z, cx, cy


def apply_camera(img):
    z, cx, cy = camera_at(_cam_t[0])
    half_w, half_h = W / (2 * z), H / (2 * z)
    box = ((cx - half_w) * E.S, (cy - half_h) * E.S,
           (cx + half_w) * E.S, (cy + half_h) * E.S)
    return img.resize((W, H), Image.LANCZOS, box=box)


_cam_t = [0.0]

# ------------------------------------------------------------------ events
EVENTS = []


def _E(t, kind, **kw):
    EVENTS.append(dict(t=round(t, 3), kind=kind, **kw))


for _lid in ("L01", "L02a", "L02b", "L02c", "L03a", "L03b", "L04a", "L04b",
             "L05", "L06", "L06b", "L07a", "L07b", "L08a", "L08b", "L09"):
    _E(T[_lid], "vo_start", lid=_lid)

_E(S["S2_problem"], "whoosh", dur=0.5)
_E(S["S3_subs"], "whoosh", dur=0.55)
_E(S["S4_math"], "whoosh", dur=0.55)
_E(S["S5_switch"], "whoosh", dur=0.8, big=True)
_E(S["S6_wins"], "whoosh", dur=0.5)
_E(S["S7_cta"], "whoosh", dur=0.6)
# S1
_E(T["L01"] + 1.35, "line")
_E(T["L01"] + 1.9, "tick")
for _i in range(4):
    _E(T["L01"] + 4.9 + _i * 0.4, "pop", vol=0.8)
_E(T["L01"] + 5.7, "sag")
# S2
for _tt in (T["L02a"], T["L02b"], T["L02c"]):
    _E(_tt, "whoosh", dur=0.35)
for _i in range(5):
    _E(T["L02a"] + 0.35 + _i * 0.33, "tick_s", vol=0.8)
_E(T["L02b"] + 1.55, "thud")
_E(T["L02b"] + 1.58, "sag")
for _i in range(4):
    _E(T["L02c"] + 0.35 + _i * 0.3, "tick_s", vol=0.6)
# S3
for _i in range(4):
    _E(T["L03b"] + D["L03b"] * (0.18 + _i) / 4, "pop", vol=0.9)
for _i in range(8):
    _E(T["L04a"] + 0.5 + _i * 0.48, "tick_s", vol=0.55)
_E(T["L04b"] + 0.35, "swish", pan=-0.3)
_E(T["L04b"] + 1.75, "thud")
_E(T["L04b"] + 1.78, "sag")
# S4
for _i in range(16):
    _E(T["L05"] + 1.0 + _i * 0.16, "tick_s", vol=0.5)
_E(T["L05"] + 4.15, "ding2")
_E(T["L05"] + 4.2, "pop", vol=0.9)
# S5
_E(T["L06"] + 0.9, "impact")
_E(T["L06"] + 1.35, "dot")
_E(T["L06b"] + 1.2, "swish")
for _i in range(6):
    _E(T["L06b"] + 1.5 + _i * 0.5, "tick_s", vol=0.6)
_E(T["L06b"] + 4.6, "ding2")
_E(T["L07a"], "whoosh", dur=0.45)
_E(T["L07a"] + 0.9, "impact_soft")
for _i in range(4):
    _E(T["L07a"] + 0.6 + _i * 0.8, "blip", vol=0.5)
_E(T["L07b"] + 0.55, "impact_soft")
_E(T["L07b"] + 0.6, "ding2")
for _i in range(3):
    _E(T["L07b"] + 1.1 + _i * 0.22, "tick")
# S6
_E(T["L08a"] + 0.4, "pop", vol=0.9)
_E(T["L08a"] + 0.55, "ding2")
_E(T["L08a"] + 2.4, "pop", vol=0.8)
_E(T["L08a"] + 2.55, "ding")
for _i in range(6):
    _E(T["L08b"] + 0.8 + _i * (D["L08b"] - 1.6) / 5, "tick_s", vol=0.7)
_E(T["L08b"] + D["L08b"] - 0.4, "pop", vol=0.8)
# S7
_E(T["L09"] + 0.25, "line")
_E(T["L09"] + 1.1, "line")
_E(T["L09"] + 3.55, "impact")
_E(T["L09"] + 3.95, "dot")
for _i in range(17):
    _E(T["L09"] + 4.45 + _i * 0.085, "key", vol=0.6)
_E(T["L09"] + 6.0, "swish")
EVENTS.sort(key=lambda e: e["t"])


# ------------------------------------------------------------------ portrait
def portrait(c, x, y, r, t, worried=False, a=1.0):
    """Amara as a clean circle portrait — no rig, just presence."""
    p, dy = enter(t, 0.35, 0.7, dy=26) if t < 3 else (1.0, 0.0)
    aa = a * p
    if aa <= 0.01:
        return
    bob = 3.0 * math.sin(t * 1.2)
    cy = y + dy + bob
    E.card(c, (x - r, cy - r, x + r, cy + r), r=r, fill=SURFACE,
           outline=LINE2, sh=(0, 14, 40, 0.12), a=aa)

    def P(px, py):
        return (x + px * r / 100.0, cy + py * r / 100.0)

    def ell(px0, py0, px1, py1, fill, al=1.0):
        x0, y0 = P(px0, py0)
        x1, y1 = P(px1, py1)
        c.d.ellipse([_d2(min(x0, x1)), _d2(min(y0, y1)), _d2(max(x0, x1)),
                     _d2(max(y0, y1))], fill=rgba(fill, aa * al))

    def ln(p0, p1, col, w):
        x0, y0 = P(*p0)
        x1, y1 = P(*p1)
        c.d.line([_d2(x0), _d2(y0), _d2(x1), _d2(y1)], fill=rgba(col, aa),
                 width=max(1, _d2(w * r / 100.0)))

    # hair back + bun
    ell(-58, -86, 58, 26, (51, 38, 30))
    dot_px, dot_py = P(0, -76)
    rr_ = 24 * r / 100.0
    c.d.ellipse([_d2(dot_px - rr_), _d2(dot_py - rr_), _d2(dot_px + rr_),
                 _d2(dot_py + rr_)], fill=rgba((51, 38, 30), aa))
    # face
    ell(-46, -44, 46, 72, (201, 138, 98))
    # fringe + curtains
    b0x, b0y = P(-60, -92)
    b1x, b1y = P(60, -18)
    c.d.pieslice([_d2(min(b0x, b1x)), _d2(min(b0y, b1y)), _d2(max(b0x, b1x)),
                  _d2(max(b0y, b1y))], 180, 360,
                 fill=rgba((51, 38, 30), aa))
    ell(-58, -60, -34, 26, (51, 38, 30))
    ell(34, -60, 58, 26, (51, 38, 30))
    # earrings
    ell(-50, 26, -38, 38, AMBER)
    ell(38, 26, 50, 38, AMBER)
    # brows — worry lifts the inner ends
    for sgn in (-1, 1):
        y_in = -20 - (7 if worried else 0) + (-2 if not worried else 0)
        y_out = -14 + (3 if worried else 0)
        ln((sgn * 11, y_in), (sgn * 34, y_out), (51, 38, 30), 4.5)
    # eyes
    for sgn in (-1, 1):
        ell(sgn * 21 - 8, -6, sgn * 21 + 8, 10, (58, 42, 34))
        px, py = P(sgn * 21 - 2, -2)
        c.d.ellipse([_d2(px - 2.5), _d2(py - 2.5), _d2(px + 2.5),
                     _d2(py + 2.5)], fill=rgba((240, 232, 220), aa * 0.95))
    # nose + mouth
    ln((0, 8), (4, 18), (176, 116, 78), 3)
    if worried:
        ln((-13, 40), (0, 34), (138, 74, 56), 4)
        ln((0, 34), (13, 40), (138, 74, 56), 4)
    else:
        ln((-17, 34), (0, 44), (138, 74, 56), 4)
        ln((0, 44), (17, 34), (138, 74, 56), 4)
    # blush
    ell(-40, 8, -26, 20, (201, 111, 78), al=0.3)
    ell(26, 8, 40, 20, (201, 111, 78), al=0.3)


# ================================================================== SCENE 1
CHAOS_CHIPS = ["INBOX — 47 UNREAD", "FOLLOW-UP??", "PROPOSAL_v6_FINAL",
               "WHERE IS THAT FILE?"]


def s01_hook(c, t, Tt):
    a_out = exit_f(Tt, 8.32, 0.42)
    if a_out <= 0.01:
        return

    worried = t >= 6.2
    portrait(c, 620, 430, 185, t, worried=worried, a=a_out)

    # name card (fades out before the punch-in shot)
    aa = seg(t, 1.35, 2.0) * exit_f(t, 5.9, 0.4) * a_out
    eyebrow(c, 1020, 250, "MEET AMARA", t, 1.45, a=aa, tick=True)
    kinetic(c, 1020, 362, ["Amara"], t, 1.95, 92, fill=INK, weight=640,
            dur=0.6, a_global=aa)
    text(c, (1020, 404), "FREELANCE BRAND DESIGNER", "mono_m", 17, INK3,
         a=seg(t, 2.6, 3.1) * a_out, tracking=2.6)
    a2 = seg(t, 4.4, 5.0) * a_out
    if a2 > 0.01:
        text(c, (1020, 490), "Brilliant with her clients.", "inter", 26,
             INK2, weight=520, a=a2)
        text(c, (1020, 532), "Drowning in everything around it.", "inter",
             26, CLAY, weight=560, a=seg(t, 5.6, 6.1) * a_out)

    # chaos chips close in on the portrait
    spots = ((300, 240), (1000, 240), (300, 640), (1000, 640))
    for i, s_ in enumerate(CHAOS_CHIPS):
        t0 = T["L01"] + 4.9 + i * 0.4
        pp = seg(t, t0, t0 + 0.35, ease_out_back_soft)
        if pp <= 0.01:
            continue
        wob = 4 * math.sin(t * 2.1 + i * 2.1)
        w = twidth(s_, "mono_m", 16, 500, 1.2) + 30
        bx, by = spots[i][0] - w / 2, spots[i][1] + wob
        rrect(c, (bx, by, bx + w, by + 40), r=20, fill=CLAY_SOFT,
              outline=CLAY, ow=1.4, a=min(1, pp * 1.5) * a_out)
        text(c, (bx + w / 2, by + 20), s_, "mono_m", 16, CLAY,
             a=min(1, pp * 1.5) * a_out, tracking=1.2, anchor="mm")


# ================================================================== SCENE 2
def _card_head(c, x, y, num, line, t, t0, a=1.0):
    eyebrow(c, x, y, f"SYMPTOM {num}", t, t0, fill=CLAY, a=a, tick=True)
    kinetic(c, x, y + 74, line, t, t0 + 0.15, 46, fill=INK, weight=620,
            dur=0.5, stagger=0.05, a_global=a)


def _vig1(c, t, a, x0=880):
    _card_head(c, x0, 210, "01",
               ["Leads", "live", "in", "five", "places"], t,
               T["L02a"], a)
    apps = ((1100, 430), (1340, 390), (1580, 440), (1200, 610), (1500, 615))
    labels = ("@", "IN", "XM", "SH", "DB")
    cx, cy = 1340, 505
    dot(c, (cx, cy), 13, INK, a=a)
    text(c, (cx, cy + 34), "AMARA", "mono_m", 13, INK3, a=a, tracking=2,
         anchor="ma")
    for i, (ax, ay) in enumerate(apps):
        rrect(c, (ax - 34, ay - 34, ax + 34, ay + 34), r=12, fill=SURFACE,
              outline=LINE2, ow=1.4, a=a)
        text(c, (ax, ay), labels[i], "mono_sb", 17, INK2, a=a, anchor="mm")
        cyc = (t - T["L02a"] - 0.3 - i * 0.33) % 1.65
        if 0 <= cyc <= 0.8 and t > T["L02a"] + 0.3 + i * 0.33:
            q = math.sin(math.pi * cyc / 0.8)
            px, py = lerp(cx, ax, q), lerp(cy, ay, q)
            dot(c, (px, py), 7, ACCENT, a=a * min(1, q * 3))
    text(c, (x0, 680), "INBOX · DMS · SPREADSHEET · NOTEBOOK · CRM TRIAL",
         "mono", 14.5, INK3, a=a * seg(t, T["L02a"] + 1.4, T["L02a"] + 1.9),
         tracking=1.6)


def _vig2(c, t, a, x0=880):
    _card_head(c, x0, 210, "02",
               ["Follow-ups", "happen", "when", "you", "remember"], t,
               T["L02b"], a)
    gx0, gy0 = x0 + 40, 330
    for r in range(4):
        for col in range(7):
            day = r * 7 + col + 1
            dot(c, (gx0 + col * 46, gy0 + r * 46), 3, LINE2, a=a)
            if day == 12:
                circle_outline(c, (gx0 + col * 46, gy0 + r * 46), 19, CLAY,
                               2.5, a)
                text(c, (gx0 + col * 46, gy0 + r * 46 + 34), "FOLLOW-UP?",
                     "mono_m", 14, CLAY, a=a, anchor="ma")
    ps = seg(t, T["L02b"] + 1.55, T["L02b"] + 1.9, ease_out_back_soft)
    if ps > 0.01:
        sx, sy = x0 + 560, 470
        w, h = 330, 62
        rrect(c, (sx - w / 2, sy - h / 2, sx + w / 2, sy + h / 2), r=8,
              fill=None, outline=CLAY, ow=3, a=min(1, ps * 1.4) * a)
        text(c, (sx, sy), "SENT 6 DAYS LATE", "mono_sb", 22, CLAY,
             a=min(1, ps * 1.4) * a, tracking=2.5, anchor="mm")


def _vig3(c, t, a, x0=880):
    _card_head(c, x0, 210, "03",
               ["Every", "proposal", "starts", "from", "scratch"], t,
               T["L02c"], a)
    for i in range(4):
        pa = seg(t, T["L02c"] + 0.3 + i * 0.3, T["L02c"] + 0.55 + i * 0.3)
        ox, oy = i * 22, -i * 16
        rrect(c, (x0 + 60 + ox, 330 + oy, x0 + 60 + ox + 330,
                  330 + oy + 210), r=12, fill=SURFACE, outline=LINE2,
              ow=1.4, a=pa * (0.35 + 0.16 * i) * a)
    lx0, ly = x0 + 90, 470
    cyc = (t - T["L02c"]) % 1.6
    if 0 <= cyc < 1.0:
        hline(c, lx0, lx0 + 240 * ease_out_cubic(cyc / 1.0), ly, LINE2, 7, a)
    chip(c, x0 + 420, 560, "FROM SCRATCH — AGAIN", t, T["L02c"] + 1.35,
         bg=CLAY_SOFT, fg=CLAY, a=a)


def s02_problem(c, t, Tt):
    p, dy = enter(t, 0.2, 0.5, dy=30)
    if p <= 0.01:
        return
    a_out = exit_f(Tt, 8.98, 0.35)
    if a_out <= 0.01:
        return
    if t < T["L02b"] - 0.05:
        _vig1(c, t, p * a_out)
    elif t < T["L02c"] - 0.1:
        _vig2(c, t, p * a_out)
    else:
        _vig3(c, t, p * a_out)


# ================================================================== SCENE 3
TOOLS = [
    ("HoneyBook", (232, 93, 74)),
    ("Dubsado", (62, 124, 143)),
    ("Bonsai", (18, 166, 123)),
    ("ClickUp", (123, 104, 238)),
]
TOOL_POS = ((760, 260), (1330, 260), (760, 600), (1330, 600))


def _tool_cards(c, t, a):
    for i, (name, col) in enumerate(TOOLS):
        t0 = T["L03b"] + D["L03b"] * (0.18 + i) / 4
        p, dy = enter(t, t0, 0.5, dy=26)
        if p <= 0.01:
            continue
        x, y = TOOL_POS[i]
        aa = p * a
        card(c, (x, y + dy, x + 480, y + 290 + dy), r=18, fill=SURFACE,
             sh=(0, 12, 34, 0.10), a=aa)
        dot(c, (x + 46, y + 64 + dy), 9, col, a=aa)
        text(c, (x + 74, y + 66 + dy), name, "inter", 33, INK, weight=640,
             a=aa, anchor="lm")
        chip(c, x + 40, y + 116 + dy, "CLOUD · SUBSCRIPTION", t, t0 + 0.25,
             a=aa)
        if t > T["L04a"] + 0.4:
            period = 1.9
            ph = (t - T["L04a"] - 0.4 - i * 0.35) % period
            fill = ease_in_out_cubic(min(1.0, ph / (period * 0.62)))
            rrect(c, (x + 40, y + 196 + dy, x + 440, y + 220 + dy), r=12,
                  fill=LINE, a=aa)
            if fill > 0.01:
                rrect(c, (x + 40, y + 196 + dy, x + 40 + 400 * fill,
                          y + 220 + dy), r=12, fill=CLAY, a=aa)
            flash = max(0.0, 1.0 - ph / 0.18)
            text(c, (x + 440, y + 178 + dy), "$ / MO", "mono_sb", 15, CLAY,
                 a=aa * (0.55 + 0.45 * flash), anchor="rs")


def _privacy_visual(c, t, a):
    lx, ly = 1330, 880
    cx_, cy_ = 1330, 300
    pa = seg(t, T["L04b"] + 0.25, T["L04b"] + 0.7)
    if pa > 0.01:
        for dx, dy_, r in ((-70, 0, 44), (0, -26, 58), (74, 0, 44),
                           (-34, 18, 40), (36, 18, 40)):
            c.d.ellipse([_d2(cx_ + dx - r), _d2(cy_ + dy_ - r),
                         _d2(cx_ + dx + r), _d2(cy_ + dy_ + r)],
                        fill=rgba(mix_col(SURFACE, INK4, 0.55), a * pa))
        c.d.rectangle([_d2(cx_ - 92), _d2(cy_ + 14), _d2(cx_ + 92),
                       _d2(cy_ + 44)],
                      fill=rgba(mix_col(SURFACE, INK4, 0.55), a * pa))
        text(c, (cx_, cy_ + 96), "SOMEBODY ELSE'S CLOUD", "mono_m", 16,
             INK2, a=a * pa, tracking=1.8, anchor="ma")
        rrect(c, (lx - 90, ly - 54, lx + 90, ly + 6), r=8, fill=SURFACE,
              outline=INK2, ow=2.2, a=a * pa)
        poly(c, [(lx - 110, ly + 10), (lx + 110, ly + 10),
                 (lx + 128, ly + 34), (lx - 128, ly + 34)], INK2, 2.2,
             a=a * pa, close=True)
        dot(c, (lx, ly - 24), 8, AMBER, a=a * pa)
        for k in range(3):
            ph = ((t - T["L04b"]) * 0.55 + k / 3) % 1.0
            x0, y0 = lx + (k - 1) * 46, ly - 58
            x1, y1 = cx_ + (k - 1) * 52, cy_ + 50
            mx, my = (x0 + x1) / 2 + (k - 1) * 90, min(y0, y1) - 90
            for s_ in (0.0, 0.34, 0.67):
                q = (ph + s_) % 1.0
                bx = (1 - q) ** 2 * x0 + 2 * (1 - q) * q * mx + q * q * x1
                by = (1 - q) ** 2 * y0 + 2 * (1 - q) * q * my + q * q * y1
                dot(c, (bx, by), 6, CLAY, a=a * pa * math.sin(math.pi * q))
    ps = seg(t, T["L04b"] + 1.75, T["L04b"] + 2.1, ease_out_back_soft)
    if ps > 0.01:
        w, h = 430, 68
        sx, sy = 1330, 560
        rrect(c, (sx - w / 2, sy - h / 2, sx + w / 2, sy + h / 2), r=10,
              outline=CLAY, ow=3.5, a=min(1, ps * 1.4) * a)
        text(c, (sx, sy), "NOT YOUR CLOUD", "mono_sb", 26, CLAY,
             a=min(1, ps * 1.4) * a, tracking=3, anchor="mm")


def s03_subs(c, t, Tt):
    p, dy = enter(t, 0.2, 0.5, dy=30)
    if p <= 0.01:
        return
    card_a = p * (1.0 - 0.72 * seg(t, T["L04b"] - 0.1, T["L04b"] + 0.4))
    eyebrow(c, 760, 176, "THE “FIXES” SHE TRIED", t, T["L03a"] - 0.15,
            tick=True, a=card_a)
    _tool_cards(c, t, card_a)
    if t > T["L04a"] + 0.6 and t < T["L04b"]:
        text(c, (1330, 948), "BILLED AGAIN. AND AGAIN. AND AGAIN.",
             "mono_m", 15.5, CLAY, a=p * seg(t, T["L04a"] + 0.6,
                                            T["L04a"] + 1.0),
             tracking=2.2, anchor="ms")
    if t > T["L04b"] - 0.1:
        _privacy_visual(c, t, p)


# ================================================================== SCENE 4
def s04_math(c, t, Tt):
    a_out = exit_f(Tt, 6.45, 0.4)
    if a_out <= 0.01:
        return
    p, dy = enter(t, 0.25, 0.5, dy=26)
    if p <= 0.01:
        return

    card(c, (300, 270 + dy, 950, 810 + dy), r=20, fill=SURFACE,
         sh=(0, 14, 40, 0.10), a=p * a_out)
    eyebrow(c, 350, 330 + dy, "FIVE YEARS OF CLOUD TOOLS", t,
            T["L05"] - 0.1, a=p * a_out, tick=True)
    prog = seg(t, T["L05"] + 1.0, T["L05"] + 3.56, ease_in_out_cubic)
    val = int(round(2400 * prog / 100.0) * 100)
    if prog >= 1.0:
        val = 2400
    text(c, (350, 560 + dy), f"${val:,}", "fraunces", 148, CLAY, weight=640,
         a=p * a_out, anchor="ls")
    hline(c, 350, 900, 600 + dy, LINE, 1.4, a=p * a_out)
    text(c, (350, 648 + dy), "ABOUT $40 / MO — EVERY MONTH, FOREVER",
         "mono", 16.5, INK3, a=p * a_out, tracking=1.8)
    rrect(c, (350, 690 + dy, 900, 714 + dy), r=12, fill=LINE, a=p * a_out)
    rrect(c, (350, 690 + dy, 350 + 550 * prog, 714 + dy), r=12, fill=CLAY,
          a=p * a_out)
    text(c, (900, 758 + dy), "60 MONTHS", "mono", 14.5, INK4, a=p * a_out,
         tracking=2, anchor="rs")

    card(c, (970, 270 + dy, 1620, 810 + dy), r=20, fill=ACCENT_SOFT,
         sh=(0, 14, 40, 0.10), a=p * a_out)
    eyebrow(c, 1020, 330 + dy, "VEYRA — CLIENT GROWTH SYSTEM", t,
            T["L05"] - 0.1, a=p * a_out, tick=True)
    p79 = seg(t, T["L05"] + 0.6, T["L05"] + 1.15, ease_out_cubic)
    if p79 > 0:
        text(c, (1020, 560 + dy - (1 - p79) * 20), "$79", "fraunces", 148,
             INK, weight=660, a=p79 * a_out, anchor="ls")
    chip(c, 1020, 596 + dy, "ONE PAYMENT — THAT'S THE WHOLE INVOICE", t,
         T["L05"] + 1.35, a=p79 * a_out)
    text(c, (1020, 690 + dy), "RUNS ON YOUR COMPUTER. NO MONTH ROLLS OVER.",
         "mono", 16, ACCENT_DEEP, a=p * a_out, tracking=1.4)
    psv = seg(t, T["L05"] + 4.15, T["L05"] + 4.55, ease_out_back_soft)
    if psv > 0.01:
        w = 300
        rrect(c, (1020, 742 + dy - (1 - psv) * 10, 1020 + w,
                  742 + 56 + dy - (1 - psv) * 10), r=28, fill=AMBER,
              a=min(1, psv * 1.5) * a_out)
        text(c, (1020 + w / 2, 770 + dy - (1 - psv) * 10), "KEEP $2,321",
             "mono_sb", 22, PAPER, a=min(1, psv * 1.5) * a_out,
             tracking=2, anchor="mm")

    dot(c, (960, 540 + dy), 34, PAPER, a=p * a_out)
    circle_outline(c, (960, 540 + dy), 34, LINE2, 1.6, a=p * a_out)
    text(c, (960, 540 + dy), "VS", "mono_sb", 20, INK2, a=p * a_out,
         anchor="mm")


# ================================================================== SCENE 5
def s05_switch(c, t, Tt):
    # A — wordmark + download (L06, L06b); camera pulls back on the land
    if t < T["L07a"] - 0.05:
        eyebrow_center(c, 960, 250, "ONE TUESDAY, SHE FOUND IT", t,
                       T["L06"] - 0.2, a=seg(t, T["L06"] - 0.2,
                                             T["L06"] + 0.3))
        pw = seg(t, T["L06"] + 0.55, T["L06"] + 1.35, ease_out_cubic)
        if pw > 0:
            text(c, (960, 480 - (1 - pw) * 26), "Veyra", "fraunces", 150,
                 INK, weight=620, a=pw, tracking=-3.0, anchor="ms")
        pd = seg(t, T["L06"] + 1.35, T["L06"] + 1.67, ease_out_back)
        if pd > 0 and pw > 0.2:
            wv = twidth("Veyra", "fraunces", 150, 620, -3.0)
            dot(c, (960 + wv / 2 + 22, 480 - 10 - (1 - pd) * -24),
                13 * pd, AMBER, a=pw * min(1, pd * 2))
        pdl = seg(t, T["L06b"] + 1.2, T["L06b"] + 4.55, ease_in_out_cubic)
        if pdl > 0:
            bx0, bx1, by = 610, 1310, 620
            rrect(c, (bx0, by, bx1, by + 54), r=14, fill=SURFACE,
                  outline=LINE2, ow=1.4, a=1.0)
            rrect(c, (bx0 + 8, by + 8, bx0 + 8 + (bx1 - bx0 - 16) * pdl,
                      by + 46), r=9, fill=AMBER)
            text(c, (bx0 + 22, by + 27), "VEYRA-CGS-SETUP", "mono_m", 17,
                 INK2, a=1.0, anchor="lm")
            text(c, (bx1 - 22, by + 27), f"{int(pdl * 100)}%", "mono_sb",
                 17, ACCENT_DEEP, a=1.0, anchor="rm")
            ay = lerp(by - 66, by - 12, (math.sin((t - T["L06b"]) * 5) + 1)
                      / 2) if t > T["L06b"] + 1.0 else by - 66
            poly(c, [(948, ay), (972, ay), (960, ay + 18)], ACCENT, 3)
        if t > T["L06b"] + 4.6:
            chip(c, 880, 700, "DOWNLOADED — AND OWNED", t, T["L06b"] + 4.6)
        return

    # B — the system on her machine (L07a)
    if t < T["L07b"] - 0.1:
        p, dy2 = enter(t, T["L07a"], 0.6, dy=40)
        if p <= 0.01:
            return
        idx_f = max(0.0, min(5.0, (t - T["L07a"] - 0.3) / 2.9))
        cr = sb1._window_chrome(c, t, T["L07a"], idx_f,
                                int(min(5, idx_f + 0.4)))
        if cr:
            sb1._content_intro(c, cr, t, 0, a=seg(t, T["L07a"] + 0.5,
                                                  T["L07a"] + 1.1), dx=0)
        a2 = seg(t, T["L07a"] + 0.9, T["L07a"] + 1.4)
        if a2 > 0:
            bx, by = 1150, 150
            rrect(c, (bx, by, bx + 500, by + 96), r=16, fill=SURFACE,
                  outline=AMBER, ow=2, a=a2)
            circle_outline(c, (bx + 52, by + 48), 26, AMBER, 3, a=a2)
            rrect(c, (bx + 41, by + 46, bx + 63, by + 66), r=4, fill=AMBER,
                  a=a2)
            arc(c, (bx + 52, by + 44), 7, 180, 360, AMBER, 3, a=a2)
            text(c, (bx + 96, by + 38), "RUNS ON HER MACHINE", "mono_sb",
                 19, INK, a=a2, tracking=1.6)
            text(c, (bx + 96, by + 68), "DATA SENT TO ANY CLOUD: 0 BYTES",
                 "mono", 14.5, INK3, a=a2, tracking=1.2)
        text(c, (960, 1004), "HER LAPTOP. HER RULES.", "mono_m", 15,
             ACCENT_DEEP, a=seg(t, T["L07a"] + 1.2, T["L07a"] + 1.7),
             tracking=2)
        return

    # C — one payment (L07b)
    a_out = exit_f(Tt, 15.7, 0.4)
    if a_out <= 0.01:
        return
    eyebrow_center(c, 960, 300, "THE INVOICE, IN FULL", t, T["L07b"] - 0.15,
                   a=seg(t, T["L07b"] - 0.15, T["L07b"] + 0.3) * a_out)
    p79 = seg(t, T["L07b"] + 0.5, T["L07b"] + 1.1, ease_out_cubic)
    if p79 > 0:
        text(c, (960, 560 - (1 - p79) * 24), "$79", "fraunces", 170, INK,
             weight=660, a=p79 * a_out, anchor="ms")
    chips = ("ONE PAYMENT", "YOURS FOREVER", "NO SUBSCRIPTION")
    widths = [twidth(s2, "mono_sb", 17, 600, 1.5) + 32 for s2 in chips]
    x = 960 - (sum(widths) + 36) / 2
    for i, s2 in enumerate(chips):
        chip(c, x, 640, s2, t, T["L07b"] + 1.1 + i * 0.22, a=a_out)
        x += widths[i] + 18
    text(c, (960, 756), "WINDOWS + MACOS · UPDATES INCLUDED · 4-DAY REFUND",
         "mono", 15.5, INK3, a=seg(t, T["L07b"] + 1.9, T["L07b"] + 2.3)
         * a_out, tracking=2, anchor="ms")


# ================================================================== SCENE 6
PHASES6 = (("Build", "build"), ("Acquire", "acquire"), ("Sell", "sell"),
           ("Deliver", "deliver"), ("Retain", "retain"), ("Grow", "grow"))


def s06_wins(c, t, Tt):
    p, dy = enter(t, 0.2, 0.5, dy=30)
    if p <= 0.01:
        return
    a_out = exit_f(Tt, 12.1, 0.4)
    if a_out <= 0.01:
        return

    p1, _ = enter(t, T["L08a"] + 0.35, 0.5, dy=24)
    if p1 > 0.01:
        card(c, (900, 210, 1800, 400), r=18, fill=SURFACE,
             sh=(0, 10, 30, 0.08), a=p1 * a_out)
        circle_outline(c, (960, 305), 22, AMBER, 3, a=p1 * a_out)
        check(c, (949, 294), 22, t, T["L08a"] + 0.5, ACCENT, 4, a=p1 * a_out)
        text(c, (1010, 282), "FOLLOW-UPS", "mono_sb", 18, ACCENT_DEEP,
             a=p1 * a_out, tracking=2.4)
        text(c, (1010, 322), "Go out on time — every time.", "inter", 24,
             INK, weight=560, a=p1 * a_out)
        chip(c, 1640, 262, "AUTOMATIC", t, T["L08a"] + 1.2, a=p1 * a_out)

    p2, _ = enter(t, T["L08a"] + 2.35, 0.5, dy=24)
    if p2 > 0.01:
        card(c, (900, 430, 1800, 620), r=18, fill=SURFACE,
             sh=(0, 10, 30, 0.08), a=p2 * a_out)
        circle_outline(c, (960, 525), 22, AMBER, 3, a=p2 * a_out)
        check(c, (949, 514), 22, t, T["L08a"] + 2.5, ACCENT, 4, a=p2 * a_out)
        text(c, (1010, 502), "PROPOSALS", "mono_sb", 18, ACCENT_DEEP,
             a=p2 * a_out, tracking=2.4)
        text(c, (1010, 542), "From a system, not a blank page.", "inter",
             24, INK, weight=560, a=p2 * a_out)
        chip(c, 1660, 482, "20 MIN", t, T["L08a"] + 3.2, a=p2 * a_out)

    strip_a = seg(t, T["L08b"] + 0.5, T["L08b"] + 1.0)
    if strip_a > 0.01:
        y = 780
        x0, x1 = 900, 1800
        hline(c, x0 + 20, x1 - 20, y, LINE2, 1.6, a=strip_a * a_out)
        step = (x1 - x0 - 40) / 5
        span = max(0.4, D["L08b"] - 1.6)
        for i, (name, ic) in enumerate(PHASES6):
            xx = x0 + 20 + i * step
            lit = t >= T["L08b"] + 0.8 + i * span / 5
            la = strip_a * (1.0 if lit else 0.45) * a_out
            circle_outline(c, (xx, y), 26, AMBER if lit else LINE2,
                           2.6 if lit else 1.8, a=la)
            if lit:
                dot(c, (xx, y), 7, AMBER, a=la)
            icon(c, ic, xx, y + 62, 30, ACCENT if lit else INK4, a=la)
            text(c, (xx, y + 108), name.upper(), "mono_m", 14.5,
                 INK if lit else INK4, a=la, tracking=1.6, anchor="ma")
        pa = seg(t, T["L08b"] + D["L08b"] - 0.5, T["L08b"] + D["L08b"] - 0.1)
        if pa > 0.01:
            chip(c, 1180, 906, "THE WHOLE JOURNEY — ONE SYSTEM", t,
                 T["L08b"] + D["L08b"] - 0.5, a=pa * a_out)


# ================================================================== SCENE 7
def s07_cta(c, t, Tt):
    a1 = seg(t, T["L09"] + 0.15, T["L09"] + 0.6)
    fade1 = 1 - seg(t, T["L09"] + 2.9, T["L09"] + 3.3)
    a1 *= fade1
    if a1 > 0.01:
        portrait(c, 300, 420, 120, t, worried=False, a=a1)
        kinetic(c, 620, 400, ["Amara", "didn't", "get", "more", "hours."],
                t, T["L09"] + 0.2, 62, fill=INK, weight=620, dur=0.5,
                stagger=0.06, anchor="l", a_global=a1)
        kinetic(c, 620, 486, ["She", {"text": "got", "fill": ACCENT},
                              {"text": "a", "fill": ACCENT},
                              {"text": "system.", "fill": ACCENT}],
                t, T["L09"] + 1.05, 62, fill=INK, weight=660, dur=0.5,
                stagger=0.06, anchor="l", a_global=a1)

    pw = seg(t, T["L09"] + 3.3, T["L09"] + 4.0, ease_out_cubic)
    if pw > 0:
        text(c, (960, 600 - (1 - pw) * 20), "Veyra", "fraunces", 128, INK,
             weight=640, a=pw, tracking=-2.6, anchor="ms")
    pd = seg(t, T["L09"] + 3.9, T["L09"] + 4.2, ease_out_back)
    if pd > 0 and pw > 0.2:
        wv = twidth("Veyra", "fraunces", 128, 640, -2.6)
        dot(c, (960 + wv / 2 + 19, 600 - 9 - (1 - pd) * -20), 11 * pd,
            AMBER, a=pw * min(1, pd * 2))

    url = "veyra.caelmont.in"
    n = int(len(url) * seg(t, T["L09"] + 4.45, T["L09"] + 5.9, linear))
    if n > 0:
        shown = url[:n]
        full_w = twidth(url, "mono_sb", 44, 600, 1.0)
        text(c, (960 - full_w / 2, 706), shown, "mono_sb", 44, ACCENT_DEEP,
             tracking=1.0, anchor="ls")
        if n < len(url) and (t * 2.6) % 1 < 0.55:
            cx_ = 960 - full_w / 2 + twidth(shown, "mono_sb", 44, 600,
                                            1.0) + 5
            c.d.rectangle([_d2(cx_), _d2(668), _d2(cx_ + 13), _d2(714)],
                          fill=rgba(AMBER, 0.85))
    underline(c, 960 - twidth(url, "mono_sb", 44, 600, 1.0) / 2,
              960 + twidth(url, "mono_sb", 44, 600, 1.0) / 2, 728, t,
              T["L09"] + 6.0, T["L09"] + 6.5, AMBER, 3.5)
    chip(c, 760, 776, "FOUNDING PRICE $79 — FIRST 30 CUSTOMERS", t,
         T["L09"] + 6.2)
    text(c, (960, 872), "A CAELMONT BRAND", "mono", 14.5, INK4,
         a=seg(t, T["L09"] + 6.8, T["L09"] + 7.2), tracking=4.5,
         anchor="ms")


# ------------------------------------------------------------------ output
def render_frame(i: int):
    t = i / 30
    _cam_t[0] = t
    start, sheet, label = scene_at(t)
    c = Canvas()
    E.paper_bg(c, t, 0.1, 1.2)
    fn = {1: s01_hook, 2: s02_problem, 3: s03_subs, 4: s04_math,
          5: s05_switch, 6: s06_wins, 7: s07_cta}[sheet]
    fn(c, t, t - start)
    cam_img = apply_camera(c.img)
    # static UI layer (footer) above the camera, like a broadcast frame
    c2 = Canvas.__new__(Canvas)
    c2.img = cam_img.convert("RGBA")
    c2.d = ImageDraw.Draw(c2.img, "RGBA")
    fa = 1.0 - seg(t, 78.3, 79.2)
    if fa > 0.01:
        footer(c2, t, sheet=sheet, label=label, a=fa, n=80, dur=TOTAL)
    fade_to(c2, PAPER, t, 78.6, 79.9)
    return c2.img.convert("RGB")
