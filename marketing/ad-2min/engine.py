"""
Veyra ad — motion engine.
Drawing primitives, easing, and typography on the Veyra brand system:
cream drafting paper, ink text, bronze accent, Fraunces / Inter / IBM Plex Mono.

All public draw helpers take coordinates in 1080p space; everything is
rendered at 2x supersample and downscaled for clean edges.
"""
from __future__ import annotations

import math
from functools import lru_cache

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
S = 2                      # supersample factor
FPS = 30
DUR = 120.0
N_FRAMES = int(DUR * FPS)

# ---------------------------------------------------------------- palette
PAPER = (251, 250, 248)
SURFACE = (255, 255, 255)
INK = (23, 21, 15)
INK2 = (62, 58, 48)
INK3 = (107, 102, 90)
INK4 = (161, 154, 140)
LINE = (230, 226, 217)
LINE2 = (210, 204, 192)
ACCENT = (138, 99, 32)       # champagne bronze
ACCENT_DEEP = (110, 78, 24)
ACCENT_SOFT = (247, 241, 226)
AMBER = (184, 132, 42)
AMBER_SOFT = (247, 239, 224)
CLAY = (163, 80, 46)
CLAY_SOFT = (247, 235, 228)

# ---------------------------------------------------------------- easing
def clamp01(x: float) -> float:
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def linear(p):
    return p


def ease_out_cubic(p):
    p = clamp01(p)
    return 1 - (1 - p) ** 3


def ease_in_cubic(p):
    p = clamp01(p)
    return p ** 3


def ease_in_out_cubic(p):
    p = clamp01(p)
    return 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def ease_out_quart(p):
    p = clamp01(p)
    return 1 - (1 - p) ** 4


def ease_out_expo(p):
    p = clamp01(p)
    return 1 if p >= 1 else 1 - 2 ** (-10 * p)


def ease_in_expo(p):
    p = clamp01(p)
    return 0 if p <= 0 else 2 ** (10 * p - 10)


def ease_out_back(p, s=1.70158):
    p = clamp01(p)
    c1 = s
    c3 = c1 + 1
    return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2


def ease_out_back_soft(p):
    return ease_out_back(p, 0.9)


def seg(t, t0, t1, fn=ease_out_cubic):
    """Eased progress of t through [t0, t1], clamped."""
    if t1 <= t0:
        return fn(1.0 if t >= t1 else 0.0)
    return fn(clamp01((t - t0) / (t1 - t0)))


def lerp(a, b, p):
    return a + (b - a) * p


def mix_col(c1, c2, p):
    return tuple(int(round(lerp(c1[i], c2[i], p))) for i in range(3))


def pulse(t, period=1.0, lo=0.0, hi=1.0):
    """Smooth 0..1..0 oscillation."""
    ph = (t / period) % 1.0
    v = 0.5 - 0.5 * math.cos(2 * math.pi * ph)
    return lo + (hi - lo) * v


# ---------------------------------------------------------------- fonts
FONT_DIR = "fonts/"


def _load(name, px):
    return ImageFont.truetype(FONT_DIR + name, int(px))


@lru_cache(maxsize=512)
def F(kind, size, weight=400):
    """kind: fraunces | fraunces_i | inter | mono | mono_m | mono_sb. size in 1080p units."""
    px = size * S
    if kind == "fraunces":
        f = _load("Fraunces-VF.ttf", px)
        opsz = 144 if size >= 58 else 40
        f.set_variation_by_axes([opsz, weight, 0, 0])
        return f
    if kind == "fraunces_i":
        f = _load("Fraunces-Italic-VF.ttf", px)
        opsz = 144 if size >= 58 else 40
        f.set_variation_by_axes([opsz, weight, 0, 0])
        return f
    if kind == "inter":
        f = _load("Inter-VF.ttf", px)
        f.set_variation_by_axes([16, weight])
        return f
    if kind == "mono":
        return _load("IBMPlexMono-Regular.ttf", px)
    if kind == "mono_m":
        return _load("IBMPlexMono-Medium.ttf", px)
    if kind == "mono_sb":
        return _load("IBMPlexMono-SemiBold.ttf", px)
    raise ValueError(kind)


def _d2(p):
    return int(round(p * S))


def rgba(col, a=1.0):
    a = max(0.0, min(1.0, a))
    return (col[0], col[1], col[2], int(round(255 * a)))


# ---------------------------------------------------------------- canvas
class Canvas:
    def __init__(self):
        # RGB base + 'RGBA' draw mode = Pillow alpha-blends every fill/text.
        self.img = Image.new("RGB", (W * S, H * S), PAPER)
        self.d = ImageDraw.Draw(self.img, "RGBA")

    def finish(self):
        return self.img.resize((W, H), Image.LANCZOS)


# ---------------------------------------------------------------- text
def twidth(s, kind, size, weight=400, tracking=0.0):
    f = F(kind, size, weight)
    if not s:
        return 0.0
    d = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    base = d.textlength(s, font=f) / S
    return base + tracking * max(0, len(s) - 1)


def text(c, xy, s, kind, size, fill, weight=400, a=1.0, tracking=0.0,
         anchor="la"):
    """anchor: Pillow-style 'xy' where x in l/m/r, y in a (top) / s (baseline)."""
    if a <= 0.003 or not s:
        return 0.0
    f = F(kind, size, weight)
    d = c.d
    col = rgba(fill, a)
    x, y = _d2(xy[0]), _d2(xy[1])
    if tracking == 0.0:
        d.text((x, y), s, font=f, fill=col, anchor=anchor)
        return d.textlength(s, font=f) / S
    # tracked draw: position chars by prefix advances (keeps kerning)
    ax = {"l": 0.0, "m": None, "r": None}[anchor[0]]
    total = twidth(s, kind, size, weight, tracking) * S
    d2 = ImageDraw.Draw(Image.new("RGBA", (8, 8)))
    adv = [d2.textlength(s[:i], font=f) for i in range(len(s))]
    if anchor[0] == "m":
        ax = -total / 2
    elif anchor[0] == "r":
        ax = -total
    tr = tracking * S
    for i, ch in enumerate(s):
        d.text((x + ax + adv[i] + tr * i, y), ch, font=f, fill=col,
               anchor="l" + anchor[1])
    return total / S


def text_h(kind, size, weight=400):
    """Approx cap-to-baseline height used for vertical centering."""
    f = F(kind, size, weight)
    bb = f.getbbox("Ag")
    return (bb[3] - bb[1]) / S


# ---------------------------------------------------------------- kinetic type
def kinetic(c, x, y, parts, t, t0, size, fill=INK, kind="fraunces", weight=620,
            dur=0.55, stagger=0.085, dy=16, tracking=0.0, anchor="l",
            space_w=None, a_global=1.0):
    """
    parts: list of items; each item is str or dict(text=..., kind=..., fill=...,
    weight=..., dy=..., t0=...). Words rise into place with fade.
    Returns total line width (1080p units). y is the baseline.
    """
    norm = []
    for p in parts:
        if isinstance(p, str):
            norm.append({"text": p})
        else:
            norm.append(dict(p))
    widths = []
    space = space_w if space_w is not None else twidth(" ", kind, size, weight)
    total = 0.0
    for i, p in enumerate(norm):
        w = twidth(p["text"], p.get("kind", kind), size, p.get("weight", weight))
        widths.append(w)
        total += w
    total += space * (len(norm) - 1)
    cur = 0.0
    for i, p in enumerate(norm):
        p_t0 = t0 + p.get("t0", i * stagger)
        pr = seg(t, p_t0, p_t0 + p.get("dur", dur))
        if pr > 0.001:
            a = a_global * pr
            off = (1 - pr) * p.get("dy", dy)
            k = p.get("kind", kind)
            wt = p.get("weight", weight)
            w = widths[i]
            if anchor == "m":
                xx = x - total / 2 + cur
            elif anchor == "r":
                xx = x - total + cur
            else:
                xx = x + cur
            text(c, (xx, y - off), p["text"], k, size,
                 p.get("fill", fill), weight=wt, a=a,
                 tracking=p.get("tracking", tracking), anchor="ls")
        cur += widths[i] + space
    return total


# ---------------------------------------------------------------- shapes
def rrect(c, box, r=16, fill=None, outline=None, ow=1.2, a=1.0, oa=1.0):
    x0, y0, x1, y1 = [_d2(v) for v in box]
    c.d.rounded_rectangle([x0, y0, x1, y1], radius=_d2(r),
                          fill=rgba(fill, a) if fill else None,
                          outline=rgba(outline, oa) if outline else None,
                          width=max(1, _d2(ow)))


def hline(c, x0, x1, y, fill, w=1.5, a=1.0):
    c.d.line([_d2(x0), _d2(y), _d2(x1), _d2(y)], fill=rgba(fill, a),
             width=max(1, _d2(w)))


def vline(c, x, y0, y1, fill, w=1.5, a=1.0):
    c.d.line([_d2(x), _d2(y0), _d2(x), _d2(y1)], fill=rgba(fill, a),
             width=max(1, _d2(w)))


def line(c, p0, p1, fill, w=1.5, a=1.0):
    c.d.line([_d2(p0[0]), _d2(p0[1]), _d2(p1[0]), _d2(p1[1])],
             fill=rgba(fill, a), width=max(1, _d2(w)))


def poly(c, pts, fill, w=2.0, a=1.0, close=False):
    pp = [(_d2(p[0]), _d2(p[1])) for p in pts]
    if close:
        c.d.polygon(pp, fill=rgba(fill, a))
    else:
        c.d.line(pp, fill=rgba(fill, a), width=max(1, _d2(w)), joint="curve")


def dot(c, xy, r, fill, a=1.0):
    x, y = _d2(xy[0]), _d2(xy[1])
    rr = _d2(r)
    c.d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=rgba(fill, a))


def circle_outline(c, xy, r, fill, w=2.0, a=1.0):
    x, y = _d2(xy[0]), _d2(xy[1])
    rr = _d2(r)
    c.d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=rgba(fill, a),
                width=max(1, _d2(w)))


def arc(c, xy, r, a0, a1, fill, w=2.0, a=1.0):
    x, y = _d2(xy[0]), _d2(xy[1])
    rr = _d2(r)
    c.d.arc([x - rr, y - rr, x + rr, y + rr], a0, a1, fill=rgba(fill, a),
            width=max(1, _d2(w)))


def crosshair(c, xy, r=7, fill=INK4, a=0.55, w=1.2):
    x, y = xy
    hline(c, x - r, x + r, y, fill, w, a)
    vline(c, x, y - r, y + r, fill, w, a)


def dashed_h(c, x0, x1, y, fill, dash=8, gap=6, w=1.5, a=1.0):
    x = x0
    while x < x1:
        x2 = min(x + dash, x1)
        hline(c, x, x2, y, fill, w, a)
        x += dash + gap


# ---------------------------------------------------------------- shadows
@lru_cache(maxsize=1024)
def _shadow_sprite(w, h, r, blur, alpha):
    pad = blur * 2
    img = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    dd = ImageDraw.Draw(img)
    dd.rounded_rectangle([pad, pad, pad + w, pad + h], radius=r,
                         fill=(30, 26, 18, alpha))
    return img.filter(ImageFilter.GaussianBlur(blur))


def card(c, box, r=18, fill=SURFACE, outline=LINE2, ow=1.2, a=1.0,
         sh=(0, 10, 34, 0.10), oa=1.0):
    """Soft-shadowed rounded card. sh=(dx, dy, blur, alpha) in 1080p units."""
    x0, y0, x1, y1 = box
    if sh:
        dx, dy, blur, alpha = sh
        w, h = _d2(x1 - x0), _d2(y1 - y0)
        spr = _shadow_sprite(w, h, _d2(r), _d2(blur), int(255 * alpha * a))
        c.img.paste(spr, (_d2(x0) + _d2(dx) - spr.width // 2 + w // 2,
                          _d2(y0) + _d2(dy) - spr.height // 2 + h // 2), spr)
    rrect(c, box, r, fill=fill, outline=outline, ow=ow, a=a * oa, oa=1.0)


# ---------------------------------------------------------------- patterns
@lru_cache(maxsize=1)
def grid_image():
    """Faint drafting grid, 4K. Returns (rgb, alpha_mask)."""
    img = Image.new("L", (W * S, H * S), 0)
    d = ImageDraw.Draw(img)
    minor = 48
    for gx in range(0, W + minor, minor):
        d.line([_d2(gx), 0, _d2(gx), H * S], fill=26 if gx % 240 == 0 else 13,
               width=1)
    for gy in range(0, H + minor, minor):
        d.line([0, _d2(gy), W * S, _d2(gy)], fill=26 if gy % 240 == 0 else 13,
               width=1)
    rgb = Image.new("RGB", (W * S, H * S), INK)
    return rgb, img


def paper_bg(c, t, grid_t0=0.0, grid_t1=1.2):
    ga = seg(t, grid_t0, grid_t1)
    if ga > 0:
        rgb, mask = grid_image()
        if ga < 1:
            mask = mask.point(lambda v: int(v * ga))
        c.img.paste(rgb, (0, 0), mask)


def overlay(c, col, a):
    if a > 0.002:
        c.d.rectangle([0, 0, W * S, H * S], fill=rgba(col, a))


def fade_to(c, col, t, t0, t1):
    a = seg(t, t0, t1, linear)
    overlay(c, col, a)


# ---------------------------------------------------------------- widgets
def eyebrow(c, x, y, s, t, t0, fill=INK3, a=1.0, tracking=4.2, size=21,
            tick=False, anchor="la"):
    """Mono eyebrow with per-character type-on. tick=True draws a leading amber square."""
    off = 0.0
    if tick:
        ta = seg(t, t0 - 0.25, t0 - 0.05)
        dot(c, (x + 7, y + 8), 5, AMBER, a=a * ta)
        off = 26
    chars = max(0, int(len(s) * seg(t, t0, t0 + len(s) * 0.032, linear)))
    if chars > 0:
        text(c, (x + off, y), s[:chars], "mono_m", size, fill, a=a,
             tracking=tracking, anchor=anchor)


def chip(c, x, y, s, t, t0, bg=AMBER_SOFT, fg=ACCENT_DEEP, kind="mono_sb",
         size=17, pad=(16, 9), a=1.0, outline=None, tracking=1.5):
    """Pill chip that pops in with a soft back-ease. (x, y) is top-left."""
    w = twidth(s, kind, size, 600, tracking) + pad[0] * 2
    h = size + pad[1] * 2
    p = seg(t, t0, t0 + 0.4, ease_out_back_soft)
    if p <= 0.001:
        return w
    aa = a * min(1.0, p * 1.6)
    box = (x, y - (1 - p) * 8, x + w, y + h - (1 - p) * 8)
    rrect(c, box, r=h / 2, fill=bg, outline=outline, ow=1.2, a=aa)
    text(c, (x + w / 2, y + h / 2 - (1 - p) * 8), s, kind, size, fg, a=aa,
         tracking=tracking, anchor="mm")
    return w


def check(c, xy, size, t, t0, col=ACCENT, w=3.0, a=1.0):
    """Animated checkmark; draws its two strokes sequentially."""
    p = seg(t, t0, t0 + 0.32, ease_out_cubic)
    if p <= 0:
        return
    x, y = xy
    pts_all = [(0, 0.55), (0.36, 0.92), (1.0, 0.08)]
    pts = []
    if p < 0.5:
        q = p / 0.5
        pts.append(pts_all[0])
        pts.append((lerp(pts_all[0][0], pts_all[1][0], q),
                    lerp(pts_all[0][1], pts_all[1][1], q)))
    else:
        q = (p - 0.5) / 0.5
        pts.append(pts_all[0])
        pts.append(pts_all[1])
        pts.append((lerp(pts_all[1][0], pts_all[2][0], q),
                    lerp(pts_all[1][1], pts_all[2][1], q)))
    poly(c, [(x + px * size, y + py * size) for px, py in pts], col, w=w, a=a)


def tick_marks(c, t, x=960, y=1050, n=120, span=1000, label_done=AMBER,
               label_todo=LINE2, a=1.0, dur=None):
    """Bottom progress: n tiny ticks fill left to right as the video plays."""
    dur = dur or DUR
    total_w = span
    step = total_w / (n - 1)
    x0 = x - total_w / 2
    done = int(clamp01(t / dur) * n + 0.0001)
    for i in range(n):
        xx = x0 + i * step
        col = label_done if i < done else label_todo
        aa = (0.85 if i < done else 0.9) * a
        c.d.rectangle([_d2(xx), _d2(y - 2.5), _d2(xx + 2.2), _d2(y + 2.5)],
                      fill=rgba(col, aa))


SHEET_LABELS = []


def footer(c, t, sheet=None, label=None, a=1.0, dur=None, n=120):
    fa = seg(t, 1.0, 1.8) * a
    if fa <= 0.01:
        return
    text(c, (96, 1044), "VEYRA — CLIENT GROWTH SYSTEM", "mono", 14.5, INK4,
         a=fa * 0.9, tracking=2.2, anchor="ls")
    if sheet:
        text(c, (1824, 1044), f"SHEET {sheet:02d} · {label}", "mono", 14.5, INK4,
             a=fa * 0.9, tracking=2.2, anchor="rs")
    tick_marks(c, t, a=fa, dur=dur, n=n)
    for cx, cy in ((44, 40), (1876, 40), (44, 1000), (1876, 1000)):
        crosshair(c, (cx, cy), r=7, a=0.45 * fa)


# ---------------------------------------------------------------- icons
def icon(c, kind, cx, cy, s, col, a=1.0, w=2.4):
    """Small line icons for the six phases, s = box size."""
    x0, y0 = cx - s / 2, cy - s / 2
    if kind == "build":          # square with inner corner
        rrect(c, (x0, y0, x0 + s, y0 + s), r=s * 0.12, outline=col, ow=w, a=a)
        hline(c, x0 + s * 0.28, x0 + s * 0.72, y0 + s * 0.62, col, w, a)
    elif kind == "acquire":      # dot pulled by arrow
        dot(c, (x0 + s * 0.2, y0 + s * 0.78), s * 0.10, col, a)
        poly(c, [(x0 + s * 0.3, y0 + s * 0.68), (x0 + s * 0.62, y0 + s * 0.38)],
             col, w, a)
        poly(c, [(x0 + s * 0.45, y0 + s * 0.36), (x0 + s * 0.62, y0 + s * 0.38),
                 (x0 + s * 0.60, y0 + s * 0.55)], col, w, a)
    elif kind == "sell":         # document
        rrect(c, (x0 + s * 0.14, y0 + s * 0.06, x0 + s * 0.86, y0 + s * 0.94),
              r=s * 0.1, outline=col, ow=w, a=a)
        hline(c, x0 + s * 0.3, x0 + s * 0.7, y0 + s * 0.36, col, w, a)
        hline(c, x0 + s * 0.3, x0 + s * 0.7, y0 + s * 0.56, col, w, a)
        hline(c, x0 + s * 0.3, x0 + s * 0.58, y0 + s * 0.76, col, w, a)
    elif kind == "deliver":      # box
        rrect(c, (x0 + s * 0.08, y0 + s * 0.24, x0 + s * 0.92, y0 + s * 0.9),
              r=s * 0.1, outline=col, ow=w, a=a)
        poly(c, [(x0 + s * 0.08, y0 + s * 0.24), (x0 + s * 0.5, y0 + s * 0.06),
                 (x0 + s * 0.92, y0 + s * 0.24)], col, w, a)
        hline(c, x0 + s * 0.5, x0 + s * 0.5, y0 + s * 0.06, col, w, a)
    elif kind == "retain":       # loop
        arc(c, (cx, cy), s * 0.36, -60, 200, col, w, a)
        arc(c, (cx, cy), s * 0.36, 120, 380, col, w, a)
    elif kind == "grow":         # bars
        bw = s * 0.16
        for i, hh in enumerate((0.3, 0.55, 0.85)):
            x = x0 + s * 0.12 + i * (bw + s * 0.13)
            c.d.rectangle([_d2(x), _d2(y0 + s * (1 - hh) - s * 0.05),
                           _d2(x + bw), _d2(y0 + s * 0.95)],
                          outline=rgba(col, a), width=max(1, _d2(w)))


def sparkline(c, box, vals, t, t0, t1, col=ACCENT, w=3.0, dot_r=5.0,
              a=1.0, dots_t=None):
    """Animated line through vals (0..1). Returns nothing."""
    x0, y0, x1, y1 = box
    p = seg(t, t0, t1, ease_in_out_cubic)
    if p <= 0:
        return
    n = len(vals)
    pts = []
    for i, v in enumerate(vals):
        fx = i / (n - 1)
        pts.append((lerp(x0, x1, fx), lerp(y1, y0, v)))
    # draw up to progress p of total path length
    segs = [math.dist(pts[i], pts[i + 1]) for i in range(n - 1)]
    total = sum(segs)
    remain = total * p
    draw = [pts[0]]
    for i in range(n - 1):
        if remain >= segs[i]:
            draw.append(pts[i + 1])
            remain -= segs[i]
        else:
            q = remain / segs[i] if segs[i] else 0
            draw.append((lerp(pts[i][0], pts[i + 1][0], q),
                         lerp(pts[i][1], pts[i + 1][1], q)))
            break
    poly(c, draw, col, w=w, a=a)
    if dots_t is not None:
        for i in range(n):
            if seg(t, dots_t + i * 0.12, dots_t + i * 0.12 + 0.25,
                   ease_out_back_soft) > 0.4:
                dot(c, pts[i], dot_r, col, a=a)


def bars(c, box, vals, t, t0, col=ACCENT, gap=0.35, a=1.0, labels=None,
         base_col=LINE2):
    x0, y0, x1, y1 = box
    n = len(vals)
    bw = (x1 - x0) / n
    for i, v in enumerate(vals):
        p = seg(t, t0 + i * 0.14, t0 + i * 0.14 + 0.5, ease_out_cubic)
        bx0 = x0 + i * bw + bw * gap / 2
        bx1 = x0 + (i + 1) * bw - bw * gap / 2
        c.d.rectangle([_d2(bx0), _d2(y1 - (y1 - y0) * v * p), _d2(bx1), _d2(y1)],
                      fill=rgba(mix_col(base_col, col, 0.25 + 0.75 * i / max(1, n - 1)), a))
        if labels:
            text(c, ((bx0 + bx1) / 2, y1 + 16), labels[i], "mono", 15, INK3,
                 a=a, anchor="ma")


def underline(c, x0, x1, y, t, t0, t1, col=AMBER, w=4.0, a=1.0):
    p = seg(t, t0, t1, ease_in_out_cubic)
    if p > 0:
        hline(c, x0, lerp(x0, x1, p), y, col, w, a)
