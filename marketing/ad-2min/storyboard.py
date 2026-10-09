"""
Veyra ad — storyboard.
Ten scenes, 120 seconds, marketing arc:
hook -> problem -> reframe -> reveal -> product tour -> differentiators ->
how it works -> offer -> CTA -> logo.

All on-screen copy is Veyra's own site copy (or a close paraphrase of it).
The EVENTS list at the bottom is the shared cue sheet the audio engine
consumes, so every sound lands exactly on its visual.
"""
from __future__ import annotations

import math

from engine import *  # noqa: F401,F403 — brand system + primitives
from engine import _d2
import engine as E


# ------------------------------------------------------------------ helpers
def enter(t, t0, dur=0.6, dy=26.0, fn=ease_out_cubic):
    """Returns (alpha, offset_y) for a slide-and-fade entrance."""
    p = seg(t, t0, t0 + dur, fn)
    return p, (1 - p) * dy


def exit_f(t, t0, dur=0.4):
    """Returns alpha for an exit starting at t0."""
    return 1 - seg(t, t0, t0 + dur, ease_in_cubic)


def eyebrow_center(c, x, y, s, t, t0, fill=INK3, a=1.0, tracking=4.2, size=21):
    chars = max(0, int(len(s) * seg(t, t0, t0 + len(s) * 0.032, linear)))
    if chars:
        text(c, (x, y), s[:chars], "mono_m", size, fill, a=a,
             tracking=tracking, anchor="ms")


def wrap(s, kind, size, weight, max_w):
    """Greedy word wrap -> list of lines."""
    words, lines, cur = s.split(), [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if twidth(trial, kind, size, weight) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# ================================================================== SCENE 1
def s01_hook(c, t, T):
    a_out = exit_f(T, 5.55, 0.45)
    dy_out = -14 * seg(T, 5.55, 6.0, ease_in_cubic)
    if a_out <= 0:
        return

    eyebrow(c, 96, 270 + dy_out,
            "FOR FREELANCERS, CONSULTANTS & SMALL AGENCIES",
            t, 0.8, a=a_out, tick=True)

    p1 = seg(t, 2.5, 3.15)
    kinetic(c, 96, 480 + dy_out, ["You’re good at the work."], t, 2.5,
            88, fill=INK, weight=620, dur=0.62, stagger=0.075, a_global=a_out)

    # "The getting the work is what's improvised" — accent italic phrase
    kinetic(c, 96, 600 + dy_out,
            ["The", {"text": "getting the work", "kind": "fraunces_i",
                     "fill": ACCENT, "weight": 560},
             "is", "what’s", "improvised"],
            t, 3.15, 88, fill=INK, weight=620, dur=0.62, stagger=0.075,
            a_global=a_out)

    # amber dot lands as the sentence's period
    w2 = (twidth("The", "fraunces", 88, 620) + twidth(" ", "fraunces", 88)
          + twidth("getting the work", "fraunces_i", 88, 560)
          + twidth(" ", "fraunces", 88) + twidth("is", "fraunces", 88, 620)
          + twidth(" ", "fraunces", 88) + twidth("what’s", "fraunces", 88, 620)
          + twidth(" ", "fraunces", 88))
    pd = seg(t, 5.2, 5.5, ease_out_back)
    if pd > 0:
        dot(c, (96 + w2 + 16, 600 + dy_out - 10 + (1 - pd) * -22),
            7.5 * pd, AMBER, a=a_out * min(1, pd * 2))


# ================================================================== SCENE 2
CARDS = [
    ("01 · LEADS", "scatter",
     "Leads live in five places",
     "Inbox, DMs, a spreadsheet, a notebook — and the CRM trial you forgot about."),
    ("02 · FOLLOW-UP", "clock",
     "Follow-ups happen when you remember",
     "Warm prospects cool off while you’re busy doing the actual work."),
    ("03 · PROPOSALS", "doc",
     "Every proposal starts from scratch",
     "The same blank page, rebuilt line by line, every single time."),
    ("04 · SYSTEMS", "broken_loop",
     "Nothing is repeatable",
     "What worked last month lives in your head — until it doesn’t."),
]
CARD_T0 = (7.3, 10.5, 13.7, 16.9)
CARD_POS = ((96, 260), (956, 260), (96, 545), (956, 545))
CW, CH = 820, 230


def _symptom_icon(c, kind, cx, cy, s, col, a):
    if kind == "scatter":
        for dx, dy, r in ((-0.32, -0.25, 5), (0.05, -0.32, 4), (0.33, -0.12, 5),
                          (-0.12, 0.1, 4), (0.28, 0.3, 5)):
            dot(c, (cx + dx * s, cy + dy * s), r, col, a)
    elif kind == "clock":
        circle_outline(c, (cx, cy), s * 0.42, col, 2.4, a)
        line(c, (cx, cy), (cx, cy - s * 0.26), col, 2.4, a)
        line(c, (cx, cy), (cx + s * 0.18, cy + s * 0.08), col, 2.4, a)
        dashed_h(c, cx + s * 0.52, cx + s * 0.72, cy, col, 5, 4, 2, a * 0.7)
    elif kind == "doc":
        rrect(c, (cx - s * 0.32, cy - s * 0.42, cx + s * 0.32, cy + s * 0.42),
              r=5, outline=col, ow=2.4, a=a)
        for i, wd in enumerate((0.4, 0.4, 0.28)):
            hline(c, cx - s * 0.18, cx - s * 0.18 + s * wd,
                  cy - s * 0.2 + i * s * 0.2, col, 2.2, a)
    elif kind == "broken_loop":
        arc(c, (cx, cy), s * 0.34, -50, 150, col, 2.6, a)
        arc(c, (cx, cy), s * 0.34, 130, 330, col, 2.6, a)
        line(c, (cx + s * 0.3, cy - s * 0.3), (cx + s * 0.48, cy - s * 0.12),
             col, 2.6, a)
        line(c, (cx + s * 0.48, cy - s * 0.3), (cx + s * 0.3, cy - s * 0.12),
             col, 2.6, a)


def _draw_symptom_cards(c, t, a_scale=1.0, dim=False, sag=0.0, dy_extra=0.0):
    for i, (tag, icon_k, head, sub) in enumerate(CARDS):
        x, y = CARD_POS[i]
        t0 = CARD_T0[i]
        if t < t0:
            continue
        p, dyi = enter(t, t0, 0.65, dy=30)
        drift = 3.0 * math.sin(t * 1.1 + i * 1.73)
        dy = dyi + drift + sag + dy_extra
        a = p * a_scale
        if a <= 0.01:
            continue
        card(c, (x, y + dy, x + CW, y + CH + dy), r=18,
             fill=SURFACE if not dim else mix_col(SURFACE, PAPER, 0.5),
             sh=(0, 12, 36, 0.10), a=a)
        text(c, (x + 30, y + 30 + dy), tag, "mono_m", 15, CLAY, a=a,
             tracking=2.4)
        _symptom_icon(c, icon_k, x + CW - 62, y + 58 + dy, 44, CLAY, a * 0.9)
        lines = wrap(head, "inter", 29, 600, CW - 130)
        ty = y + 78 + dy
        for ln in lines:
            text(c, (x + 30, ty), ln, "inter", 29, INK, weight=600, a=a)
            ty += 38
        for ln in wrap(sub, "inter", 17.5, 400, CW - 90):
            text(c, (x + 30, ty + 8), ln, "inter", 17.5, INK3, a=a * 0.95)
            ty += 26


def s02_chaos(c, t, T):
    eyebrow(c, 96, 158, "THE DAILY REALITY", t, 6.3, tick=True)
    sag = 14 * seg(T, 12.4, 15.9, ease_in_cubic)
    _draw_symptom_cards(c, t, dim=False, sag=sag)
    # slow dim as the scene weighs on you
    overlay(c, INK, 0.10 * seg(T, 12.6, 15.9, linear))


# ================================================================== SCENE 3
def s03_reframe(c, t, T):
    # the chaos is swept away: cards drop out of frame
    sweep = 1150 * seg(T, 0.05, 0.95, ease_in_cubic)
    a_cards = 1 - seg(T, 0.05, 0.6)
    if a_cards > 0.01:
        _draw_symptom_cards(c, t, a_scale=a_cards, dim=True, dy_extra=sweep)
    overlay(c, INK, 0.07 * seg(T, 0.4, 1.2, linear))

    kinetic(c, 960, 400, ["None of this is a talent problem."], t, 23.1,
            62, fill=INK, weight=600, dur=0.6, stagger=0.06, anchor="m")
    kinetic(c, 960, 505,
            ["It’s a", {"text": "systems problem.", "fill": ACCENT}], t, 25.3,
            62, fill=INK, weight=660, dur=0.6, stagger=0.06, anchor="m")
    parts = ["And", "systems", "can", "be", "downloaded."]
    kinetic(c, 960, 610, parts, t, 27.5, 62, fill=INK, weight=660,
            dur=0.6, stagger=0.06, anchor="m")
    # amber underline draws beneath "downloaded."
    w_pre = (twidth("And ", "fraunces", 62, 660)
             + twidth("systems ", "fraunces", 62, 660)
             + twidth("can ", "fraunces", 62, 660)
             + twidth("be ", "fraunces", 62, 660))
    w_w = twidth("downloaded.", "fraunces", 62, 660)
    x_start = 960 - (w_pre + w_w) / 2 + w_pre
    underline(c, x_start, x_start + w_w, 628, t, 28.1, 28.9, AMBER, 4.5)


# ================================================================== SCENE 4
def s04_reveal(c, t, T):
    # wipe band sweeps across
    if T < 0.75:
        px = lerp(-300, 2280, seg(T, 0.0, 0.65, ease_in_out_cubic))
        rrect(c, (px - 130, -20, px + 130, 1100), r=0, fill=ACCENT_SOFT, a=0.95)
        vline(c, px + 130, 0, 1080, ACCENT, 3, 0.75)

    a1 = seg(T, 0.7, 1.3)
    eyebrow_center(c, 960, 262, "MEET THE FLAGSHIP", t, 31.0, a=a1)

    # wordmark lands
    p = seg(T, 1.9, 2.7, ease_out_cubic)
    if p > 0:
        text(c, (960, 500 - (1 - p) * 26), "Veyra", "fraunces", 150, INK,
             weight=620, a=p, tracking=-3.0, anchor="ms")
    pd = seg(T, 3.0, 3.32, ease_out_back)
    if pd > 0 and p > 0.2:
        wv = twidth("Veyra", "fraunces", 150, 620, -3.0)
        dot(c, (960 + wv / 2 + 22, 500 - 10 - (1 - pd) * -24),
            13 * pd, AMBER, a=p * min(1, pd * 2))

    a3 = seg(T, 3.7, 4.3)
    if a3 > 0:
        text(c, (960, 588), "The complete operating system for the client-growth journey.",
             "inter", 25, INK3, weight=420, a=a3, anchor="ma")

    chips = ["12 MODULES", "6 PHASES", "ONE SYSTEM"]
    widths = [twidth(s2, "mono_sb", 17, 600, 1.5) + 32 for s2 in chips]
    gap = 18
    x = 960 - (sum(widths) + gap * 2) / 2
    for i, s2 in enumerate(chips):
        chip(c, x, 660, s2, t, 34.9 + i * 0.14)
        x += widths[i] + gap


# ================================================================== SCENE 5
PHASES = [
    ("Build", "build", "01", "Business Foundation · Positioning · Offer"),
    ("Acquire", "acquire", "02", "Ideal Client · Outreach · Follow-up"),
    ("Sell", "sell", "03", "Sales · Proposals"),
    ("Deliver", "deliver", "04", "Client Onboarding"),
    ("Retain", "retain", "05", "Retention"),
    ("Grow", "grow", "06", "Growth Review"),
]
BEAT0 = 41.2
BEAT = 5.2
WIN = (250, 210, 1670, 990)


def _window_chrome(c, t, t_in, idx_f, act_idx):
    """Desktop-app window: chrome + sidebar. Returns content rect."""
    x0, y0, x1, y1 = WIN
    p, dy = enter(t, t_in, 0.7, dy=42)
    if p <= 0.01:
        return None
    yo = y0 + dy
    card(c, (x0, yo, x1, y1 + dy), r=16, fill=SURFACE, sh=(0, 24, 60, 0.14),
         outline=LINE2)
    # title bar
    hline(c, x0, x1, yo + 52, LINE, 1.2)
    for i in range(3):
        dot(c, (x0 + 34 + i * 26, yo + 26), 5.5, INK4, a=0.55)
    text(c, ((x0 + x1) / 2, yo + 26), "CLIENT GROWTH SYSTEM", "mono_m", 15,
         INK3, tracking=2.6, anchor="mm")
    dot(c, (x1 - 40, yo + 26), 5.5, AMBER)

    # sidebar
    sb_w = 250
    rrect(c, (x0 + 1.2, yo + 53.2, x0 + sb_w, y1 + dy - 1.2), r=0,
          fill=mix_col(PAPER, LINE, 0.35))
    vline(c, x0 + sb_w, yo + 53, y1 + dy, LINE, 1.2)
    item_h = 78
    for i, (name, icon_k, num, _m) in enumerate(PHASES):
        iy = yo + 78 + i * item_h
        act = i == act_idx
        if act:
            rrect(c, (x0 + 10, iy - 6, x0 + sb_w - 10, iy + item_h - 26),
                  r=10, fill=ACCENT_SOFT, a=0.9)
        bar_y = y0 + 78 + idx_f * item_h + dy  # smooth sliding active bar
        if 0 <= idx_f <= 5 and t > t_in + 0.8:
            vline(c, x0 + 10, bar_y - 4, bar_y + 40, AMBER, 3.5)
        ic_col = ACCENT if act else INK4
        icon(c, icon_k, x0 + 44, iy + 22, 26, ic_col, a=0.95)
        text(c, (x0 + 68, iy + 12), num, "mono", 12.5,
             ACCENT if act else INK4, a=0.9)
        text(c, (x0 + 68, iy + 30), name, "inter", 20,
             INK if act else INK3, weight=560 if act else 460, anchor="la")
    text(c, (x0 + sb_w / 2, y1 - 26 + dy), "V1.0 · PERPETUAL LICENCE", "mono",
         11.5, INK4, a=0.75, tracking=1.5, anchor="ms")
    return (x0 + sb_w, yo, x1, y1 + dy)


def _phase_header(c, cr, k, a, dx):
    name, icon_k, num, mods = PHASES[k]
    cx0, cy0, cx1, cy1 = cr
    x = cx0 + 40 + dx
    w = twidth(f"PHASE {num} — {name.upper()}", "mono_sb", 15, 600, 2.0) + 28
    rrect(c, (x, cy0 + 34, x + w, cy0 + 62), r=14, fill=AMBER_SOFT, a=a)
    text(c, (x + 14, cy0 + 48), f"PHASE {num} — {name.upper()}", "mono_sb",
         15, ACCENT_DEEP, a=a, tracking=2.0, anchor="lm")
    text(c, (x, cy0 + 108), mods, "fraunces", 37, INK, weight=600, a=a,
         anchor="ls")


def _content_intro(c, cr, t, T, a, dx):
    cx0, cy0, cx1, cy1 = cr
    for i, (num, lab) in enumerate((("12", "MODULES"), ("6", "PHASES"),
                                    ("1", "SYSTEM"))):
        x = cx0 + 180 + i * 330
        p = seg(t, 39.05 + i * 0.16, 39.65 + i * 0.16, ease_out_cubic)
        text(c, (x, 660 - (1 - p) * 20 + 0), num, "fraunces", 130, INK,
             weight=620, a=a * p, anchor="ls")
        text(c, (x, 700), lab, "mono_m", 17, ACCENT, a=a * p, tracking=3.0,
             anchor="ls")
    for xv in (cx0 + 320, cx0 + 650):
        vline(c, xv, 520, 680, LINE2, 1.2, a)


def _content_build(c, cr, t, a, dx):
    _phase_header(c, cr, 0, a, dx)
    # 12 module dots fill in
    for i in range(12):
        gx, gy = i % 4, i // 4
        x = 560 + gx * 118 + dx
        y = 470 + gy * 118
        p = seg(t, 41.9 + i * 0.22, 42.12 + i * 0.22, ease_out_back)
        if p <= 0:
            circle_outline(c, (x, y), 26, LINE2, 1.6, a)
            continue
        dot(c, (x, y), 26 * p, AMBER, a=a)
        text(c, (x, y), str(i + 1), "mono_m", 17, PAPER, a=a * p, anchor="mm")
    text(c, (560 + dx, 850), "ONE CONNECTED SYSTEM — EVERY MODULE LINKED",
         "mono", 15, INK3, a=a, tracking=2.0)
    # sample worksheet card
    bx0, bx1 = 1120 + dx, 1630 + dx
    card(c, (bx0, 440, bx1, 880), r=14, fill=SURFACE, outline=LINE,
         sh=None, a=a)
    text(c, (bx0 + 26, 470), "POSITIONING — WORKING DRAFT", "mono_m", 13.5,
         INK3, a=a, tracking=1.8)
    text(c, (bx0 + 26, 560), "\u201CPractical systems for independent",
         "fraunces_i", 27, INK, weight=500, a=a, anchor="ls")
    text(c, (bx0 + 26, 604), "consultants — bought once, run daily.\u201D",
         "fraunces_i", 27, INK, weight=500, a=a, anchor="ls")
    hline(c, bx0 + 26, bx1 - 26, 700, LINE, 1.2, a)
    text(c, (bx0 + 26, 750), "FOR: solo consultants & 2–5 person studios",
         "inter", 17, INK3, a=a)
    chip(c, bx1 - 150, 812, "DRAFT SAVED", t, 44.8, a=a)


def _content_acquire(c, cr, t, a, dx):
    _phase_header(c, cr, 1, a, dx)
    heads = ("TO CONTACT", "CONTACTED", "REPLIED")
    for i, hd in enumerate(heads):
        x = 540 + i * 370 + dx
        text(c, (x + 16, 452), hd, "mono_m", 14.5, INK3, a=a, tracking=1.8)
        rrect(c, (x, 472, x + 330, 852), r=12, fill=mix_col(SURFACE, PAPER, 0.4),
              outline=LINE, ow=1.2, a=a)
    # card A travels col0 -> col1 -> col2
    def lead_card(cx, cy, aa):
        card(c, (cx, cy, cx + 300, cy + 92), r=10, fill=SURFACE,
             outline=LINE2, sh=None, a=aa)
        text(c, (cx + 18, cy + 30), "R. Alvarez — referral", "inter", 18,
             INK, weight=560, a=aa)
        text(c, (cx + 18, cy + 62), "DAY 0 · INTRO SENT", "mono", 12.5,
             INK4, a=aa, tracking=1.5)
    p1 = seg(t, 48.2, 48.85, ease_in_out_cubic)
    p2 = seg(t, 49.7, 50.35, ease_in_out_cubic)
    cx = 556 + (p1 + p2) * 370 + dx
    lead_card(cx, 505, a)
    card(c, (926 + dx + p2 * 370, 620, 1226 + dx + p2 * 370, 712),
         r=10, fill=SURFACE, outline=LINE2, sh=None,
         a=a * seg(t, 46.6, 47.2))
    text(c, (944 + dx + p2 * 370, 650), "Dental group — cold list",
         "inter", 18, INK, weight=560, a=a * seg(t, 46.6, 47.2))
    text(c, (944 + dx + p2 * 370, 682), "DAY 1 · SEQUENCED",
         "mono", 12.5, INK4, a=a * seg(t, 46.6, 47.2), tracking=1.5)
    chip(c, 926 + dx, 880, "FOLLOW-UP: DAY 3 — QUEUED", t, 50.6, a=a)


def _content_sell(c, cr, t, a, dx):
    _phase_header(c, cr, 2, a, dx)
    bx0, bx1 = 760 + dx, 1240 + dx
    card(c, (bx0, 430, bx1, 900), r=14, fill=SURFACE, outline=LINE, sh=None,
         a=a)
    text(c, (bx0 + 28, 462), "PROPOSAL — R. ALVAREZ", "mono_m", 13.5, INK3,
         a=a, tracking=1.8)
    widths = (0.92, 0.78, 0.86, 0.6, 0.84)
    for i, wd in enumerate(widths):
        p = seg(t, 52.4 + i * 0.22, 52.62 + i * 0.22)
        if p > 0:
            hline(c, bx0 + 28, bx0 + 28 + (bx1 - bx0 - 56) * wd * p,
                  530 + i * 44, LINE2, 7, a)
    pp = seg(t, 54.6, 54.9, ease_out_back)
    if pp > 0:
        text(c, (bx1 - 28, 856), "$4,800", "mono_sb", 34, ACCENT, a=a * pp,
             anchor="rs")
    chip(c, bx0 + 28, 806, "FROM TEMPLATE · 20 MIN", t, 55.2, a=a)


def _content_deliver(c, cr, t, a, dx):
    _phase_header(c, cr, 3, a, dx)
    bx0, bx1 = 700 + dx, 1470 + dx
    card(c, (bx0, 430, bx1, 880), r=14, fill=SURFACE, outline=LINE, sh=None,
         a=a)
    text(c, (bx0 + 28, 462), "CLIENT ONBOARDING", "mono_m", 13.5, INK3, a=a,
         tracking=1.8)
    items = ("Kickoff call scheduled", "Assets & access collected",
             "Scope confirmed in writing", "First milestone booked")
    times = (58.6, 59.2, 59.8, 60.4)
    for i, it in enumerate(items):
        iy = 530 + i * 72
        done = t >= times[i]
        circle_outline(c, (bx0 + 54, iy + 8), 15, AMBER if done else LINE2,
                       2.2, a)
        check(c, (bx0 + 45, iy - 1), 18, t, times[i], ACCENT, 3.2, a)
        text(c, (bx0 + 90, iy), it, "inter", 21, INK2 if done else INK3,
             weight=540 if done else 440, a=a)
    # progress bar
    pb = sum(1 for tt in times if t >= tt) / 4
    rrect(c, (bx0 + 28, 806, bx1 - 28, 822), r=8, fill=LINE, a=a)
    if pb > 0:
        rrect(c, (bx0 + 28, 806, bx0 + 28 + (bx1 - bx0 - 56) * pb, 822), r=8,
              fill=AMBER, a=a)


def _content_retain(c, cr, t, a, dx):
    _phase_header(c, cr, 4, a, dx)
    vals = (0.16, 0.24, 0.31, 0.42, 0.5, 0.63, 0.72, 0.86)
    for i in range(3):
        yy = 480 + i * 120
        dashed_h(c, 580 + dx, 1450 + dx, yy, LINE, 6, 8, 1.2, a * 0.8)
    text(c, (580 + dx, 440), "CHECK-INS LOGGED", "mono_m", 14, INK3, a=a,
         tracking=1.8)
    sparkline(c, (580 + dx, 480, 1450 + dx, 840), vals, t, 62.5, 64.6,
              ACCENT, 3.5, 6, a, dots_t=64.8)
    text(c, (1450 + dx, 872), "WEEK 1 → WEEK 8", "mono", 14.5, INK3, a=a,
         tracking=1.5, anchor="rs")
    chip(c, 580 + dx, 890, "REVIEW BOOKED — NO CLIENT SLIPS", t, 65.2, a=a)


def _content_grow(c, cr, t, a, dx):
    _phase_header(c, cr, 5, a, dx)
    bars(c, (620 + dx, 490, 1180 + dx, 830), (0.35, 0.5, 0.62, 0.85), t,
         67.9, ACCENT, 0.4, a, labels=("Q1", "Q2", "Q3", "Q4"))
    bx0, bx1 = 1260 + dx, 1630 + dx
    card(c, (bx0, 440, bx1, 800), r=14, fill=SURFACE, outline=LINE, sh=None,
         a=a)
    text(c, (bx0 + 24, 470), "GROWTH REVIEW — NEXT QUARTER", "mono_m", 13,
         INK3, a=a, tracking=1.5)
    for i, bl in enumerate(("Double down on referrals",
                            "Systemize the pipeline")):
        by = 550 + i * 84
        dot(c, (bx0 + 34, by - 6), 4.5, AMBER, a=a)
        text(c, (bx0 + 54, by), bl, "inter", 18.5, INK2, a=a)


CONTENT_FN = (_content_build, _content_acquire, _content_sell,
              _content_deliver, _content_retain, _content_grow)


def s05_tour(c, t, T):
    eyebrow(c, 250, 118, "THE CLIENT GROWTH SYSTEM", t, 38.5, tick=True)
    kinetic(c, 250, 182,
            ["Twelve", "connected", "modules.", "Six", "phases.", "One",
             "system."], t, 38.9, 44, fill=INK, weight=620, dur=0.5,
            stagger=0.05)

    if t < 39.0:
        idx_f, act_idx = -1.0, -1
    elif t < BEAT0:
        idx_f, act_idx = 0.0, 0
    else:
        k = min(5, int((t - BEAT0) / BEAT))
        # the amber bar glides to the new phase during the first 1.2s of a beat
        frac = seg(t, BEAT0 + k * BEAT, BEAT0 + k * BEAT + 1.2,
                   ease_in_out_cubic)
        idx_f = min(5.0, (k - 1) + frac)
        act_idx = k
    cr = _window_chrome(c, t, 38.25, idx_f, act_idx)
    if cr is None:
        return

    if t < BEAT0:
        _content_intro(c, cr, t, T, a=seg(t, 38.6, 39.2), dx=0)
        return

    k = min(5, int((t - BEAT0) / BEAT))
    t_k = BEAT0 + k * BEAT
    # outgoing panel slides left and fades, incoming rises from the right
    a_in = seg(t, t_k, t_k + 0.45)
    dx_in = (1 - a_in) * 46
    a_out = 1 - seg(t, t_k, t_k + 0.3)
    if a_out > 0.01 and k > 0:
        CONTENT_FN[k - 1](c, cr, t, a_out, -34 * seg(t, t_k, t_k + 0.3,
                                                    ease_in_cubic))
    if a_in > 0.01:
        CONTENT_FN[k](c, cr, t, a_in, dx_in)


# ================================================================== SCENE 6
WHY = [
    ("Ready to run, not ready to assemble.",
     "Structured systems with steps, templates and checkpoints —\nnot another course to decode."),
    ("The whole journey, connected.",
     "Positioning to growth review — one system holds the thread\nfrom first hello to long-term client."),
    ("Yours after one payment.",
     "A licence, not a lease. No subscription pretending\nto be infrastructure."),
]


def s06_why(c, t, T):
    eyebrow(c, 250, 128, "WHY VEYRA", t, 72.5, tick=True)
    for i, (big, sub) in enumerate(WHY):
        t0 = 73.4 + i * 2.5
        p, dy = enter(t, t0, 0.6, dy=28)
        if p <= 0.01:
            continue
        y = 240 + i * 190
        card(c, (250, y + dy, 1670, y + 158 + dy), r=16, fill=SURFACE,
             sh=(0, 10, 30, 0.08), a=p)
        if p > 0.5:
            vline(c, 252, y + dy + 18, y + dy + 140, AMBER, 4,
                  a=(p - 0.5) * 2)
        text(c, (300, y + 62 + dy), big, "fraunces", 37, INK, weight=620,
             a=p, anchor="ls")
        for j, ln in enumerate(sub.split("\n")):
            text(c, (1620, y + 52 + dy + j * 28), ln, "inter", 18, INK3,
                 a=p * 0.95, anchor="ra")
    text(c, (960, 852), "BUILT FOR CONSISTENT EXECUTION — NOT ONE-TIME MOTIVATION",
         "mono", 16, INK3, a=seg(t, 80.8, 81.4), tracking=3.2,
         anchor="ms")


# ================================================================== SCENE 7
STEPS = [
    ("01", "Get the system", "Checkout takes minutes.\nOne-time, no account gymnastics."),
    ("02", "Receive it instantly", "Download links and a licence key\narrive the moment you pay."),
    ("03", "Put it to work", "Follow the modules — most people\nare running it in an afternoon."),
]


def s07_how(c, t, T):
    eyebrow(c, 250, 128, "HOW IT WORKS", t, 82.5, tick=True)
    kinetic(c, 250, 190, ["From", "download", "to", "running", "in", "an",
                          "afternoon."], t, 82.9, 46, fill=INK, weight=620,
            dur=0.5, stagger=0.05)
    for i, (num, title, sub) in enumerate(STEPS):
        t0 = 84.0 + i * 1.6
        p, dy = enter(t, t0, 0.55, dy=26)
        if p <= 0.01:
            continue
        x = 250 + i * 470
        card(c, (x, 300 + dy, x + 440, 540 + dy), r=16, fill=SURFACE,
             sh=(0, 10, 30, 0.08), a=p)
        text(c, (x + 30, 330 + dy), num, "mono_sb", 16, ACCENT, a=p,
             tracking=2)
        text(c, (x + 30, 388 + dy), title, "fraunces", 31, INK, weight=620,
             a=p, anchor="ls")
        for j, ln in enumerate(sub.split("\n")):
            text(c, (x + 30, 432 + dy + j * 26), ln, "inter", 16.5, INK3,
                 a=p)
        if i < 2:
            pa = seg(t, t0 + 1.25, t0 + 1.6)
            if pa > 0:
                x_end = lerp(x + 448, x + 462, pa)
                line(c, (x + 448, 420), (x_end, 420), ACCENT, 2.5, pa)
                poly(c, [(x_end - 8, 412), (x_end, 420), (x_end - 8, 428)],
                     ACCENT, 2.5, pa)

    # licence key box — typing
    key = "VY-7K3M-QP9X-2RDT"
    kx0, kx1 = 610, 1310
    box_t0 = 85.7
    p_box = seg(t, box_t0, box_t0 + 0.4)
    if p_box > 0:
        n = int(len(key) * seg(t, 85.9, 87.9, linear))
        done = n >= len(key)
        rrect(c, (kx0, 640, kx1, 712), r=14, fill=SURFACE,
              outline=AMBER if done else LINE2, ow=2.0 if done else 1.4,
              a=p_box)
        text(c, (kx0 + 22, 616), "YOUR LICENCE KEY", "mono", 13, INK4,
             a=p_box, tracking=2)
        shown = key[:n]
        w_shown = twidth(shown, "mono_sb", 30, 600)
        text(c, ((kx0 + kx1) / 2 - w_shown / 2, 676), shown, "mono_sb", 30,
             INK, a=p_box, anchor="ls")
        if not done and (t * 2.6) % 1 < 0.55:
            cx = (kx0 + kx1) / 2 - w_shown / 2 + w_shown + 4
            c.d.rectangle([_d2(cx), _d2(652), _d2(cx + 14), _d2(700)],
                          fill=rgba(AMBER, 0.85 * p_box))
        if done:
            chip(c, kx1 + 26, 646, "ACTIVATED", t, 88.5)
    text(c, (960, 775), "ONE LICENCE · ACTIVATES ON WINDOWS OR MACOS",
         "mono", 15.5, INK3, a=seg(t, 89.4, 89.9), tracking=2.6, anchor="ms")


# ================================================================== SCENE 8
def s08_offer(c, t, T):
    eyebrow(c, 250, 128, "FOUNDING RELEASE", t, 92.5, tick=True)
    kinetic(c, 250, 196, ["The", "first", "30", "customers", "set", "the",
                          "price."], t, 92.9, 50, fill=INK, weight=620,
            dur=0.5, stagger=0.055)

    # $149 struck out
    a149 = seg(t, 94.5, 95.1)
    if a149 > 0:
        text(c, (700, 560), "$149", "fraunces", 84, INK4, weight=560,
             a=a149 * 0.85, anchor="ls")
    underline(c, 700, 700 + twidth("$149", "fraunces", 84, 560), 532, t,
              95.3, 95.95, CLAY, 5.0)

    # $79 lands
    p79 = seg(t, 95.9, 96.5, ease_out_cubic)
    if p79 > 0:
        text(c, (920, 596 - (1 - p79) * 24), "$79", "fraunces", 170, INK,
             weight=660, a=p79, anchor="ls")
    chip(c, 925, 420, "FOUNDING PRICE", t, 96.1)

    # right column: terms chips
    terms = ("ONE-TIME PAYMENT", "UPDATES INCLUDED", "4-DAY REFUND WINDOW",
             "WINDOWS + MACOS")
    for i, tm in enumerate(terms):
        chip(c, 1330, 440 + i * 66, tm, t, 97.2 + i * 0.18)

    hline(c, 250, 1670, 790, LINE, 1.2, a=seg(t, 98.8, 99.3))
    a2 = seg(t, 99.4, 100.0)
    if a2 > 0:
        text(c, (250, 858), "Not ready yet?", "fraunces", 31, INK, weight=620,
             a=a2, anchor="ls")
        text(c, (250, 902), "Take the free Growth Audit — 18 questions. A score for every phase. A fix-first list.",
             "inter", 19.5, INK3, a=a2, anchor="ls")
        chip(c, 1552, 876, "FREE", t, 100.2)


# ================================================================== SCENE 9
def s09_cta(c, t, T):
    a_out = exit_f(T, 11.3, 0.5)
    kinetic(c, 960, 420, ["Build", "a", "better", "system"], t, 103.0, 74,
            fill=INK, weight=620, dur=0.55, stagger=0.06, anchor="m",
            a_global=a_out)
    kinetic(c, 960, 516, ["for", "growing", "your", "business."], t, 103.45,
            74, fill=INK, weight=620, dur=0.55, stagger=0.06, anchor="m",
            a_global=a_out)

    url = "veyra.caelmont.in"
    n = int(len(url) * seg(t, 105.6, 107.2, linear))
    p_url = seg(t, 105.5, 105.9)
    if p_url > 0 and n > 0:
        shown = url[:n]
        w_sh = twidth(shown, "mono_sb", 54, 600, 1.0)
        text(c, (960 - twidth(url, "mono_sb", 54, 600, 1.0) / 2, 648), shown,
             "mono_sb", 54, ACCENT_DEEP, a=p_url * a_out, tracking=1.0,
             anchor="ls")
        if n < len(url) and (t * 2.6) % 1 < 0.55:
            cx = 960 - twidth(url, "mono_sb", 54, 600, 1.0) / 2 + w_sh + 5
            c.d.rectangle([_d2(cx), _d2(600), _d2(cx + 16), _d2(656)],
                          fill=rgba(AMBER, 0.85 * p_url))
    underline(c, 960 - twidth(url, "mono_sb", 54, 600, 1.0) / 2,
              960 + twidth(url, "mono_sb", 54, 600, 1.0) / 2, 672, t, 107.6,
              108.3, AMBER, 3.5, a=a_out)

    text(c, (960, 726),
         "CLIENT GROWTH SYSTEM · $79 FOUNDING · ONE-TIME · INSTANT DELIVERY",
         "mono", 16.5, INK3, a=seg(t, 108.6, 109.2) * a_out, tracking=2.6,
         anchor="ms")

    # final CTA pill
    p = seg(t, 110.0, 110.45, ease_out_back_soft)
    if p > 0.01:
        bw, bh = 620, 70
        bx, by = 960 - bw / 2, 790 - (1 - p) * 10
        rrect(c, (bx, by, bx + bw, by + bh), r=bh / 2, fill=INK,
              a=a_out * min(1, p * 2))
        text(c, (960, by + bh / 2), "START WITH THE CLIENT GROWTH SYSTEM",
             "mono_sb", 18.5, PAPER, a=a_out * min(1, p * 2), tracking=2.2,
             anchor="mm")


# ================================================================= SCENE 10
def s10_logo(c, t, T):
    p = seg(T, 1.1, 1.85, ease_out_cubic)
    if p > 0:
        text(c, (960, 540 - (1 - p) * 24), "Veyra", "fraunces", 176, INK,
             weight=640, a=p, tracking=-3.5, anchor="ms")
    pd = seg(T, 1.75, 2.1, ease_out_back)
    if pd > 0 and p > 0.2:
        wv = twidth("Veyra", "fraunces", 176, 640, -3.5)
        dot(c, (960 + wv / 2 + 26, 540 - 12 - (1 - pd) * -26),
            15 * pd, AMBER, a=p * min(1, pd * 2))
    a2 = seg(T, 2.7, 3.3)
    if a2 > 0:
        s2 = "A CAELMONT BRAND"
        tw2 = twidth(s2, "mono", 16, 400, 5.0)
        text(c, (960, 640), s2, "mono", 16, INK3, a=a2, tracking=5.0,
             anchor="ms")
        hline(c, 960 - tw2 / 2 - 130, 960 - tw2 / 2 - 40, 634, LINE2, 1.5, a2)
        hline(c, 960 + tw2 / 2 + 40, 960 + tw2 / 2 + 130, 634, LINE2, 1.5, a2)


# ------------------------------------------------------------------ registry
SCENES = (
    (0.0,   1,  "THE HOOK",      s01_hook),
    (6.0,   2,  "THE REALITY",  s02_chaos),
    (22.0,  3,  "THE REFRAME",  s03_reframe),
    (30.0,  4,  "MEET VEYRA",   s04_reveal),
    (38.0,  5,  "THE SYSTEM",   s05_tour),
    (72.0,  6,  "WHY VEYRA",    s06_why),
    (82.0,  7,  "HOW IT WORKS", s07_how),
    (92.0,  8,  "THE OFFER",    s08_offer),
    (102.0, 9,  "START TODAY",  s09_cta),
    (114.0, 10, "VEYRA",        s10_logo),
)


def scene_at(t):
    cur = SCENES[0]
    for s in SCENES:
        if t >= s[0]:
            cur = s
        else:
            break
    return cur


# ------------------------------------------------------------------ cue sheet
EVENTS = []


def _E(t, kind, **kw):
    EVENTS.append(dict(t=round(t, 3), kind=kind, **kw))


# S1 — typewriter + dot
for _i in range(45):
    _E(0.8 + _i * 0.032, "type", vol=0.5)
_E(5.2, "dot")
# S2 — cards
for _tt in CARD_T0:
    _E(_tt, "pop", vol=1.0)
    _E(_tt + 0.2, "tag")
_E(19.6, "sag")
# S3 — lines + underline
_E(23.1, "line")
_E(25.3, "line")
_E(27.5, "line")
_E(28.1, "swish")
# S4 — reveal
_E(30.0, "whoosh", dur=0.85, big=True)
_E(32.6, "impact")
_E(33.0, "dot")
_E(33.8, "line")
for _i in range(3):
    _E(34.9 + _i * 0.14, "pop", vol=0.7)
# S5 — window + beats
_E(38.2, "whoosh", dur=0.5)
_E(38.9, "pop", vol=0.8)
_E(39.05, "pop", vol=0.8)
_E(39.2, "pop", vol=0.8)
for _k in range(6):
    _E(BEAT0 + _k * BEAT, "phase")
for _i in range(12):
    _E(41.9 + _i * 0.22, "tick_s", vol=0.5)
_E(44.8, "pop", vol=0.7)
_E(48.2, "swish", pan=0.45)
_E(49.7, "swish", pan=-0.4)
_E(50.6, "pop", vol=0.7)
for _i in range(5):
    _E(52.4 + _i * 0.22, "tick_s", vol=0.5)
_E(54.6, "pop", vol=0.7)
_E(55.2, "pop", vol=0.7)
for _i, _tt in enumerate((58.6, 59.2, 59.8, 60.4)):
    _E(_tt, "ding2" if _i == 3 else "ding")
_E(62.5, "sweep")
_E(65.2, "pop", vol=0.7)
for _i in range(4):
    _E(67.9 + _i * 0.14, "tick_s", vol=0.6)
# S6
_E(72.0, "whoosh", dur=0.55)
for _i in range(3):
    _E(73.4 + _i * 2.5, "line")
_E(80.8, "tick")
# S7
_E(82.0, "whoosh", dur=0.55)
for _i in range(3):
    _E(84.0 + _i * 1.6, "pop", vol=0.8)
_E(85.4, "swish", pan=0.4)
_E(87.0, "swish", pan=0.4)
for _i in range(len("VY-7K3M-QP9X-2RDT")):
    _E(85.9 + _i * (2.0 / 17), "key", vol=0.75)
_E(88.5, "ding2")
_E(88.6, "pop", vol=0.7)
_E(89.5, "tick")
# S8
_E(92.0, "whoosh", dur=0.55)
_E(92.9, "line")
_E(94.5, "tick")
_E(95.3, "swish")
_E(95.9, "impact_soft")
_E(96.1, "ding2")
for _i in range(4):
    _E(97.2 + _i * 0.18, "tick")
_E(98.8, "tick")
_E(99.4, "line")
_E(100.2, "pop", vol=0.7)
# S9
_E(102.0, "whoosh", dur=0.6)
_E(103.0, "line")
for _i in range(len("veyra.caelmont.in")):
    _E(105.6 + _i * (1.6 / 17), "key", vol=0.6)
_E(107.6, "swish")
_E(108.6, "tick")
_E(110.0, "pop", vol=1.0)
# S10
_E(114.0, "whoosh", dur=0.7)
_E(115.2, "impact", big=True)
_E(115.75, "dot")
_E(116.7, "tick")
EVENTS.sort(key=lambda e: e["t"])
