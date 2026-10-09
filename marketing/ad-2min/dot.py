"""
Veyra ad 2 — Dot, the pet narrator.

Dot is the little amber creature that *tells* Amara's story (the narrator's
voice is Dot's voice — it lip-syncs to it). It swings in and out on a rope
from the top of frame, sometimes bounces in, gestures with a stubby arm,
wags its tail, changes eye direction, and can hold up a tiny sign.

  pose = {talk, gx, gy, arm, tilt, squash, alpha, sign, wave}

  talk    0..1 mouth open (driven by the narrator waveform)
  gx/gy   pupil direction −1..1
  arm     right-arm angle in degrees (screen: 0 = pointing right,
          180 = pointing left, −90 = straight up). None = resting.
  tilt    body tilt deg (the swing supplies this)
  squash  0..1 landing squash
  alpha   overall opacity
  sign    None or str — a little placard held up beside Dot
"""
import math

from engine import AMBER, ACCENT, CLAY, Canvas, _d2, lerp

BODY = (184, 132, 42)        # brand amber
BODY_SH = (158, 111, 34)
BELLY = (247, 239, 224)
INKC = (58, 42, 34)
MOUTH_IN = (94, 46, 36)
CHEEK = (201, 111, 78)


def _rgba(col, a):
    a = max(0.0, min(1.0, a))
    return (col[0], col[1], col[2], int(round(255 * a)))


class DotCue:
    """Choreography for one on-screen visit.

    enter 'swing'  swings in on the rope from `side`, settles over ~1.6 s
    enter 'bounce' hops in from the side with two decaying bounces
    exit           swings/slides out and fades
    """

    def __init__(self, t_in, t_out, spot, side=1, enter="swing",
                 out_dur=1.0, in_dur=1.6):
        self.t_in, self.t_out = t_in, t_out
        self.spot = spot
        self.side = side
        self.enter = enter
        self.out_dur = out_dur
        self.in_dur = in_dur
        self.phase = t_in * 1.7

    def at(self, t):
        """Returns (x, y, tilt_deg, squash, alpha, rope_top) or None."""
        if t < self.t_in or t > self.t_out + self.out_dur:
            return None
        sx, sy = self.spot
        if t <= self.t_out:
            tau = t - self.t_in
            if self.enter == "swing":
                # anchor slides in from off-screen while the pendulum decays
                q = min(1.0, tau / (self.in_dur * 0.8))
                ease = 1 - (1 - q) ** 3
                ax = sx + self.side * (1 - ease) * 640
                theta = self.side * 1.05 * math.exp(-2.3 * tau) \
                    * math.cos(2 * math.pi * 0.75 * tau)
                idle = 0.045 * math.sin(2 * math.pi * 0.4 * (t + self.phase))
                th = theta + idle * min(1.0, tau)
                L = sy + 80
                x = ax + L * math.sin(th)
                y = -80 + L * math.cos(th)
                tilt = math.degrees(th) * 0.8
                # landing squash right after the swing settles
                tl = max(0.0, tau - 1.45)
                squash = 0.16 * math.exp(-tl * 7) * abs(
                    math.sin(tl * 14)) if tl > 0 else 0.0
                rope = (ax, -80)
                return (x, y, tilt, squash, 1.0, rope)
            else:  # bounce — two decaying hops in from the side
                q = min(1.0, tau / self.in_dur)
                hops = 2
                seg = min(int(q * hops), hops - 1)
                lq = q * hops - seg
                x0 = sx + self.side * (1 - seg / hops) * 520
                x1 = sx + self.side * (1 - (seg + 1) / hops) * 520
                x = lerp(x0, x1, lq)
                hop_h = 190 * (0.55 ** seg)
                y = sy - hop_h * 4 * lq * (1 - lq)
                tilt = self.side * 14 * math.sin(math.pi * lq) * (1 - seg)
                tl = tau - self.in_dur
                squash = 0.18 * math.exp(-tl * 8) * abs(
                    math.sin(tl * 15)) if tl > 0 else 0.0
                return (x, y, tilt, squash, 1.0, None)
        # exit — swings away and fades
        q = min(1.0, (t - self.t_out) / self.out_dur)
        e = q * q * (3 - 2 * q)
        x = sx + self.side * e * 760
        y = sy - 320 * math.sin(math.pi * min(1.0, q * 1.1)) * 0.55
        tilt = self.side * 26 * e
        alpha = 1.0 - max(0.0, (q - 0.6) / 0.4)
        return (x, y, tilt, 0.0, alpha, None)


def draw_dot(c: Canvas, x, y, s, t, pose):
    talk = pose.get("talk", 0.0)
    gx, gy = pose.get("gaze", (0.0, 0.0))
    arm = pose.get("arm", None)
    tilt = pose.get("tilt", 0.0)
    squash = pose.get("squash", 0.0)
    alpha = pose.get("alpha", 1.0)
    sign = pose.get("sign", None)
    if alpha <= 0.01:
        return

    # squash around the bottom of the body
    cy = y - 0 * s            # pivot at body center
    sy = s * (1.0 - 0.5 * squash)
    sx = s * (1.0 + 0.35 * squash)

    def P(px, py):
        """local (0,0)=body center, y down -> device px, with tilt+squash."""
        th = math.radians(tilt)
        rx = px * sx
        ry = py * sy
        return (x + rx * math.cos(th) - ry * math.sin(th),
                cy + rx * math.sin(th) + ry * math.cos(th))

    def ell(px0, py0, px1, py1, fill, a=1.0, outline=None, ow=2.0):
        a0, b0 = P(px0, py0)
        a1, b1 = P(px1, py1)
        c.d.ellipse([_d2(min(a0, a1)), _d2(min(b0, b1)), _d2(max(a0, a1)),
                     _d2(max(b0, b1))], fill=_rgba(fill, alpha * a),
                    outline=_rgba(outline, alpha * a) if outline else None,
                    width=max(1, _d2(ow * s)) if outline else 0)

    def rr(px0, py0, px1, py1, r, fill, a=1.0, outline=None, ow=2.0):
        a0, b0 = P(px0, py0)
        a1, b1 = P(px1, py1)
        c.d.rounded_rectangle([_d2(min(a0, a1)), _d2(min(b0, b1)),
                               _d2(max(a0, a1)), _d2(max(b0, b1))],
                              radius=max(1, _d2(r * s)),
                              fill=_rgba(fill, alpha * a),
                              outline=_rgba(outline, alpha * a)
                              if outline else None,
                              width=max(1, _d2(ow * s)) if outline else 0)

    def ln(p0, p1, col, w, a=1.0):
        a0, b0 = P(*p0)
        a1, b1 = P(*p1)
        c.d.line([_d2(a0), _d2(b0), _d2(a1), _d2(b1)], fill=_rgba(col,
                                                                 alpha * a),
                 width=max(1, _d2(w * s)))

    def dotp(px, py, r, col, a=1.0):
        p = P(px, py)
        rr_ = s * r
        c.d.ellipse([_d2(p[0] - rr_), _d2(p[1] - rr_), _d2(p[0] + rr_),
                     _d2(p[1] + rr_)], fill=_rgba(col, alpha * a))

    # tail — wags constantly
    wag = math.sin(t * 5.2) * 16
    tail = [(46, 26), (78, 40 + wag * 0.4), (96, 18 + wag)]
    pp = [P(*p) for p in tail]
    c.d.line([(_d2(p[0]), _d2(p[1])) for p in pp], fill=_rgba(BODY, alpha),
             width=max(2, _d2(11 * s)), joint="curve")
    dotp(96, 18 + wag, 7, BODY_SH, a=1.0)

    # feet
    ell(-30, 44, -6, 58, BODY_SH)
    ell(6, 44, 30, 58, BODY_SH)

    # body + belly
    ell(-54, -54, 54, 50, BODY)
    ell(-30, 12, 30, 48, BELLY, a=0.95)

    # ears
    for sgn in (-1, 1):
        tip = P(sgn * 30, -78)
        l_ = P(sgn * 12, -40)
        r_ = P(sgn * 48, -38)
        c.d.polygon([(_d2(tip[0]), _d2(tip[1])), (_d2(l_[0]), _d2(l_[1])),
                     (_d2(r_[0]), _d2(r_[1]))], fill=_rgba(BODY, alpha))
        tip2 = P(sgn * 30, -68)
        l2 = P(sgn * 19, -46)
        r2 = P(sgn * 40, -44)
        c.d.polygon([(_d2(tip2[0]), _d2(tip2[1])), (_d2(l2[0]), _d2(l2[1])),
                     (_d2(r2[0]), _d2(r2[1]))],
                    fill=_rgba(BELLY, alpha * 0.9))

    # eyes with direction
    for sgn in (-1, 1):
        ex, ey = sgn * 19, -24
        ell(ex - 9, ey - 10, ex + 9, ey + 10, (247, 244, 238), outline=INKC,
            ow=2.2)
        dotp(ex + gx * 3.5, ey + 1 + gy * 3, 4.6, INKC)
        dotp(ex + gx * 3.5 - 1.5, ey - 1 + gy * 3 - 1.5, 1.6,
             (240, 232, 220), a=0.95)

    # cheeks
    dotp(-36, -6, 6, CHEEK, a=0.4)
    dotp(36, -6, 6, CHEEK, a=0.4)

    # nose + mouth (lip-synced)
    dotp(0, -8, 3.4, MOUTH_IN)
    if talk < 0.08:
        # little cat "ω"
        p1 = P(-9, -2)
        p2 = P(-4, 3)
        p3 = P(0, -2)
        p4 = P(4, 3)
        p5 = P(9, -2)
        c.d.line([(_d2(p1[0]), _d2(p1[1])), (_d2(p2[0]), _d2(p2[1])),
                  (_d2(p3[0]), _d2(p3[1])), (_d2(p4[0]), _d2(p4[1])),
                  (_d2(p5[0]), _d2(p5[1]))], fill=_rgba(INKC, alpha),
                 width=max(2, _d2(3.2 * s)), joint="curve")
    else:
        mw = (10 + 16 * talk)
        mh = (4 + 16 * talk)
        ell(-mw, -4, mw, -4 + mh, MOUTH_IN)

    # whiskers
    for sgn in (-1, 1):
        ln((sgn * 24, -6), (sgn * 54, -10 + math.sin(t * 3) * 2), INKC, 2,
           a=0.75)
        ln((sgn * 24, -1), (sgn * 54, 1 + math.cos(t * 2.6) * 2), INKC, 2,
           a=0.75)

    # arms — left idles, right gestures on cue
    la = 12 * math.sin(t * 2.1)
    lang = math.radians(64 + la)
    lx0, ly0 = -48, 6
    lx1 = lx0 - 30 * math.cos(lang)
    ly1 = ly0 + 30 * math.sin(lang)
    ln((lx0, ly0), (lx1, ly1), BODY, 15)
    dotp(lx1, ly1, 8, BODY_SH)

    if arm is not None:
        a_ = math.radians(arm)
        hx = 48 + 40 * math.cos(a_)
        hy = 6 - 40 * math.sin(a_)
        pmx, pmy = 48 + 20 * math.cos(a_), 6 - 20 * math.sin(a_)
        p0 = P(48, 6)
        pm = P(pmx, pmy)
        p1 = P(hx, hy)
        c.d.line([(_d2(p0[0]), _d2(p0[1])), (_d2(pm[0]), _d2(pm[1])),
                  (_d2(p1[0]), _d2(p1[1]))], fill=_rgba(BODY, alpha),
                 width=max(2, _d2(15 * s)), joint="curve")
        dotp(hx, hy, 9, BODY_SH)

    # little placard held up beside Dot
    if sign:
        from engine import text as _text
        sw, sh = 132, 74
        sx0, sy0 = 64, -132
        pop = pose.get("sign_pop", 1.0)
        dyo = (1 - pop) * 14
        rr(sx0, sy0 + dyo, sx0 + sw, sy0 + sh + dyo, 10,
           (247, 244, 238), outline=AMBER, ow=3)
        ln((sx0 + 6, sy0 + sh + dyo), (sx0 + 22, 6), AMBER, 3)
        sp = P(sx0 + sw / 2, sy0 + sh / 2 + dyo)
        _text(c, (sp[0], sp[1]), sign, "mono_sb", 24 * s, ACCENT,
              a=alpha * pop, tracking=1.5, anchor="mm")
