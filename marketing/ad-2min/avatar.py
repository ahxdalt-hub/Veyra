"""
Veyra ad 2 — Amara, the animated avatar (desk edition).

Amara is the person IN the story: she sits at her desk with a laptop and
genuinely performs. Everything is parameterized:

  pose = {mode, tilt, worry, happy, talk, gasp, gaze:(gx,gy), screen, lid}

  mode    'type'       typing, both hands bobbing on the keyboard
          'stop'       hands frozen, staring (mid-realization)
          'slump'      shoulders drop, head sinks — overwhelmed
          'shock'      quick flinch (gasps at a late-stamp, a bill, ...)
          'happy'      smiling, light typing
          'rest'       hands off the keyboard, calm
  tilt    head rotation deg
  worry / happy / talk / gasp   0..1 face channels
  gaze    pupil direction −1..1 (0,-0.6 looks down at the laptop)
  screen  'chaos' | 'veyra' | 'win' — what her laptop shows
  lid     0..1 — how closed the laptop lid is (closing-the-laptop payoff)

Local coordinates: origin at torso center (chair), y down. The desk crops
the bust at the bottom, like a real seated framing.
"""
import math

from engine import AMBER, ACCENT, ACCENT_SOFT, CLAY, Canvas, _d2

SKIN = (201, 138, 98)
SKIN_SH = (176, 116, 78)
HAIR = (51, 38, 30)
HAIR_HI = (74, 55, 44)
BLOUSE = (184, 132, 42)
BLOUSE_SH = (148, 103, 31)
LIP = (138, 74, 56)
MOUTH_IN = (94, 46, 36)
EYE = (58, 42, 34)
BLUSH = (201, 111, 78)
LAPTOP = (58, 52, 44)
LAPTOP_SH = (44, 40, 34)
DESK = (233, 227, 214)
DESK_SH = (214, 206, 191)

PIV = (0.0, -130.0)          # neck top — head rotates around this


class _X:
    def __init__(self, cx, base_y, s, tilt):
        self.cx, self.by, self.s = cx, base_y, s
        th = math.radians(tilt)
        self.ct, self.st = math.cos(th), math.sin(th)

    def p(self, x, y, head=False):
        if head:
            dx, dy = x - PIV[0], y - PIV[1]
            x = PIV[0] + dx * self.ct - dy * self.st
            y = PIV[1] + dx * self.st + dy * self.ct
        return (self.cx + x * self.s, self.by + y * self.s)

    def box(self, x0, y0, x1, y1, head=False):
        a = self.p(x0, y0, head)
        b = self.p(x1, y1, head)
        return (min(a[0], b[0]), min(a[1], b[1]),
                max(a[0], b[0]), max(a[1], b[1]))

    def w(self, v):
        return v * self.s


def _rgba(col, a):
    a = max(0.0, min(1.0, a))
    return (col[0], col[1], col[2], int(round(255 * a)))


def _elli(c, xf, x0, y0, x1, y1, fill, head=False, a=1.0):
    b = xf.box(x0, y0, x1, y1, head)
    c.d.ellipse([_d2(b[0]), _d2(b[1]), _d2(b[2]), _d2(b[3])],
                fill=_rgba(fill, a))


def _rrect(c, xf, x0, y0, x1, y1, r, fill, head=False, a=1.0, outline=None,
           ow=1.0):
    b = xf.box(x0, y0, x1, y1, head)
    c.d.rounded_rectangle([_d2(b[0]), _d2(b[1]), _d2(b[2]), _d2(b[3])],
                          radius=max(1, _d2(r * xf.s)), fill=_rgba(fill, a),
                          outline=_rgba(outline, a) if outline else None,
                          width=max(1, _d2(ow * xf.s)) if outline else 0)


def _line(c, xf, p0, p1, col, w, head=False, a=1.0):
    a0 = xf.p(*p0, head)
    a1 = xf.p(*p1, head)
    c.d.line([_d2(a0[0]), _d2(a0[1]), _d2(a1[0]), _d2(a1[1])],
             fill=_rgba(col, a), width=max(1, _d2(xf.w(w))))


def _poly(c, xf, pts, col, w, head=False, a=1.0):
    pp = [(_d2(v[0]), _d2(v[1])) for v in
          (xf.p(x, y, head) for x, y in pts)]
    c.d.line(pp, fill=_rgba(col, a), width=max(1, _d2(xf.w(w))),
             joint="curve")


def _dot(c, xf, x, y, r, col, head=False, a=1.0):
    p = xf.p(x, y, head)
    rr = xf.w(r)
    c.d.ellipse([_d2(p[0] - rr), _d2(p[1] - rr), _d2(p[0] + rr),
                 _d2(p[1] + rr)], fill=_rgba(col, a))


def blink_amount(t):
    def wave(interval, phase0):
        ph = (t + phase0) % interval
        if ph < 0.14:
            return math.sin(math.pi * ph / 0.14)
        return 0.0
    return max(wave(3.4, 0.0), wave(5.9, 2.2))


def _typing_bob(t, active):
    """Alternate small hand bobs while typing."""
    if not active:
        return 0.0, 0.0
    return (max(0.0, math.sin(2 * math.pi * 4.6 * t)) * 3.4,
            max(0.0, math.sin(2 * math.pi * 4.6 * t + math.pi)) * 3.4)


def _screen_content(c, xf, state, t, a):
    """What her laptop shows, per story state."""
    sx0, sy0, sx1, sy1 = -93, 42, 93, 148
    if state == "chaos":
        for i in range(4):
            ph = (t * 0.6 + i * 0.31) % 1.0
            _line(c, xf, (sx0 + 16, sy0 + 16 + i * 22),
                  (sx0 + 16 + 130 * (0.35 + 0.5 * ph), sy0 + 16 + i * 22),
                  (210, 190, 170), 4, head=True, a=a)
        _rrect(c, xf, sx1 - 52, sy0 + 8, sx1 - 10, sy0 + 26, 8, CLAY,
               head=True, a=a * (0.75 + 0.25 * math.sin(t * 5)))
        text_chip = None
    elif state == "veyra":
        _rrect(c, xf, sx0 + 10, sy0 + 10, sx0 + 34, sy1 - 10, 5, AMBER,
               head=True, a=a * 0.9)
        for i in range(3):
            _line(c, xf, (sx0 + 46, sy0 + 18 + i * 24),
                  (sx0 + 46 + 60, sy0 + 18 + i * 24), (210, 190, 170), 4,
                  head=True, a=a)
        p = (math.sin(t * 2.2) + 1) / 2
        _dot(c, xf, sx0 + 78, sy0 + 92, 8 + 3 * p, AMBER, head=True, a=a)
        _line(c, xf, (sx0 + 46, sy0 + 92), (sx0 + 70, sy0 + 84), ACCENT, 3.5,
              head=True, a=a)
    else:  # win
        vals = (0.35, 0.55, 0.4, 0.8)
        for i, v in enumerate(vals):
            bx = sx0 + 24 + i * 34
            hh = 8 + 40 * v * min(1.0, 0.3 + ((t * 0.7 + i * 0.2) % 1.0))
            _rrect(c, xf, bx, sy1 - 10 - hh, bx + 20, sy1 - 10, 3, AMBER,
                   head=True, a=a * 0.9)
        _line(c, xf, (sx0 + 16, sy0 + 14), (sx1 - 16, sy0 + 14),
              (210, 190, 170), 4, head=True, a=a)


def draw_amara_desk(c: Canvas, x, base_y, s, t, pose):
    mode = pose.get("mode", "type")
    tilt = pose.get("tilt", 0.0)
    worry = pose.get("worry", 0.0)
    happy = pose.get("happy", 0.0)
    talk = pose.get("talk", 0.0)
    gasp = pose.get("gasp", 0.0)
    gx, gy = pose.get("gaze", (0.0, 0.55))
    screen = pose.get("screen", "chaos")
    lid = pose.get("lid", 0.0)
    typing = mode in ("type", "happy")
    slumping = mode == "slump"

    bob = 2.0 * math.sin(2 * math.pi * t / 3.8)
    slump = 12.0 if slumping else 0.0
    flinch = -6.0 * max(0.0, 1.0 - ((t * 1.7) % 2.0) / 0.25) \
        if mode == "shock" else 0.0
    xf = _X(x, base_y, s, tilt)

    # -------------------------------------------------- torso (she sits
    # behind the desk; desk + laptop draw over her, arms over the laptop)
    _rrect(c, xf, -150, -78 + bob + slump + flinch, 150,
           162 + bob + slump + flinch, 60, BLOUSE, a=1.0)
    _rrect(c, xf, 80, -78 + bob + slump + flinch, 150,
           162 + bob + slump + flinch, 60, BLOUSE_SH, a=0.5)
    _rrect(c, xf, -30, -178 + bob + slump + flinch, 30, -6 + bob + slump,
           14, SKIN, a=1.0)

    # -------------------------------------------------- desk + laptop
    _rrect(c, xf, -268, 148, 268, 172, 8, DESK, a=1.0)
    _rrect(c, xf, -252, 172, 252, 268, 10, DESK_SH, a=1.0)
    # laptop lid (screen) — height shrinks as it closes
    lh = (148 - 42) * (1.0 - lid)
    if lid < 0.98:
        _rrect(c, xf, -105, 148 - lh, 105, 148, 10, LAPTOP, a=1.0)
        if lid < 0.85:
            _rrect(c, xf, -95, 148 - lh + 10, 95, 140, 6, (247, 244, 238),
                   a=1.0)
            _screen_content(c, xf, screen, t, 1.0)
    # keyboard deck
    _rrect(c, xf, -132, 148, 132, 168, 6, LAPTOP_SH, a=1.0)

    # -------------------------------------------------- arms & hands
    sh_dy = bob + slump + flinch
    bobL, bobR = _typing_bob(t, typing)
    if mode == "rest":
        # hands folded on the desk, relaxed
        _line(c, xf, (-92, -34 + sh_dy), (-116, 120), BLOUSE, 34)
        _line(c, xf, (-116, 120), (-74, 150), SKIN, 26)
        _line(c, xf, (92, -34 + sh_dy), (116, 120), BLOUSE, 34)
        _line(c, xf, (116, 120), (74, 150), SKIN, 26)
        _dot(c, xf, -74, 152, 13, SKIN)
        _dot(c, xf, 74, 152, 13, SKIN)
    elif mode == "happy" and pose.get("arm_up", 0) > 0.01:
        p = pose["arm_up"]
        # right arm raised, swinging with joy
        ang = math.radians(-38 + 10 * math.sin(t * 6.5)) * p
        piv = (96, -30 + sh_dy)
        ex, ey = piv[0] + 120 * math.sin(ang), piv[1] - 120 * math.cos(ang) \
            * 1.0
        _line(c, xf, piv, (piv[0] + (ex - piv[0]) * 0.5,
                           piv[1] + (ey - piv[1]) * 0.5), BLOUSE, 34)
        _line(c, xf, (piv[0] + (ex - piv[0]) * 0.45,
                      piv[1] + (ey - piv[1]) * 0.45), (ex, ey), SKIN, 26)
        _dot(c, xf, ex, ey, 14, SKIN)
        # left hand stays down
        _line(c, xf, (-92, -34 + sh_dy), (-70, 140), BLOUSE, 34)
        _dot(c, xf, -68, 148, 13, SKIN)
    else:
        # forearms to the keyboard
        _line(c, xf, (-92, -34 + sh_dy), (-118, 92 + sh_dy), BLOUSE, 34)
        _line(c, xf, (-118, 92 + sh_dy), (-58, 140 + bobL), SKIN, 26)
        _dot(c, xf, -58, 142 + bobL, 13, SKIN)
        _line(c, xf, (92, -34 + sh_dy), (118, 92 + sh_dy), BLOUSE, 34)
        _line(c, xf, (118, 92 + sh_dy), (58, 140 + bobR), SKIN, 26)
        _dot(c, xf, 58, 142 + bobR, 13, SKIN)

    # -------------------------------------------------- head
    hb = bob + slump * 0.8 + flinch
    htilt = tilt + (2.5 if slumping else 0.0)
    xf2 = _X(x, base_y, s, htilt)

    _elli(c, xf2, -96, -352 + hb, 96, -128 + hb, HAIR, head=True)
    _elli(c, xf2, -100, -300 + hb, -44, -140 + hb, HAIR, head=True)
    _elli(c, xf2, 44, -300 + hb, 100, -140 + hb, HAIR, head=True)
    _dot(c, xf2, 0, -352 + hb, 46, HAIR, head=True)
    _dot(c, xf2, 14, -366 + hb, 20, HAIR_HI, head=True, a=0.7)
    _rrect(c, xf2, -20, -322 + hb, 20, -306 + hb, 8, ACCENT, head=True)

    _dot(c, xf2, -78, -228 + hb, 15, SKIN, head=True)
    _dot(c, xf2, 78, -228 + hb, 15, SKIN, head=True)
    _elli(c, xf2, -78, -324 + hb, 78, -148 + hb, SKIN, head=True)
    _elli(c, xf2, 58, -252 + hb, 84, -158 + hb, SKIN_SH, head=True, a=0.22)

    # fringe
    b = xf2.box(-86, -330 + hb, 86, -232 + hb, True)
    c.d.pieslice([_d2(b[0]), _d2(b[1]), _d2(b[2]), _d2(b[3])], 180, 360,
                 fill=_rgba(HAIR, 1.0))
    _elli(c, xf2, -86, -286 + hb, -56, -182 + hb, HAIR, head=True)
    _elli(c, xf2, 56, -286 + hb, 86, -182 + hb, HAIR, head=True)

    # brows
    brow_y = -254 + hb
    for sgn in (-1, 1):
        x_in = sgn * 18
        x_out = sgn * 54
        y_in = brow_y - worry * 9 + happy * 2
        y_out = brow_y - worry * 1 + happy * 3
        _line(c, xf2, (x_in, y_in), (x_out, y_out), HAIR, 8, head=True)

    # eyes — gaze is her own; she looks at the laptop by default
    blink = blink_amount(t)
    squint = 1.0 - 0.28 * happy
    eye_h = 13 * (1.0 - 0.94 * blink) * squint
    for sgn in (-1, 1):
        ex = sgn * 37
        cx_, cy_ = xf2.p(ex + gx * 4.5, -231 + gy * 3 + worry * 2 + hb,
                         True)
        rx = xf2.w(11.5)
        ry = max(xf2.w(1.4), xf2.w(eye_h))
        c.d.ellipse([_d2(cx_ - rx), _d2(cy_ - ry), _d2(cx_ + rx),
                     _d2(cy_ + ry)], fill=_rgba(EYE, 1.0))
        if blink < 0.5:
            _dot(c, xf2, ex + gx * 4.5 + sgn * 2.5,
                 -234 + gy * 3 + worry * 2 + hb, 2.6, (240, 232, 220),
                 head=True, a=0.9)
        else:
            _line(c, xf2, (ex - 11, -232 + hb), (ex + 11, -230 + hb), EYE,
                  3, head=True)

    # nose
    _poly(c, xf2, [(-4, -212 + hb), (5, -198 + hb), (-3, -193 + hb)],
          SKIN_SH, 4, head=True, a=0.9)
    # cheeks
    _dot(c, xf2, -55, -196 + hb, 13, BLUSH, head=True, a=0.16 + 0.2 * happy)
    _dot(c, xf2, 55, -196 + hb, 13, BLUSH, head=True, a=0.16 + 0.2 * happy)

    # mouth — smile/frown line, or open while talking / gasping
    my = -174 + hb
    mopen = max(talk, gasp)
    if mopen < 0.06:
        ctrl = my + 7 - 11 * happy + 6 * worry
        pts = []
        for i in range(9):
            q = i / 8
            px = -21 + 42 * q
            py = (1 - q) ** 2 * my + 2 * (1 - q) * q * ctrl + q * q * my
            pts.append((px, py))
        _poly(c, xf2, pts, LIP, 4.5, head=True)
    else:
        mw = (24 + 10 * mopen) / 2
        mh = (7 + 30 * mopen) / 2
        _elli(c, xf2, -mw, my - mh * 0.4, mw, my + mh * 1.6, MOUTH_IN,
              head=True)
        _line(c, xf2, (-mw * 0.7, my + mh * 1.6), (mw * 0.7, my + mh * 1.6),
              LIP, 3, head=True)

    # earrings
    _dot(c, xf2, -80, -206 + hb, 6.5, AMBER, head=True)
    _dot(c, xf2, 80, -206 + hb, 6.5, AMBER, head=True)


# facade so old imports still work (unused in the two-character film)
def draw_amara(c, x, base_y, s, t, pose):
    draw_amara_desk(c, x, base_y, s, t, pose)
