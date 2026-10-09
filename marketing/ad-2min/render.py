"""
Veyra ad — renderer.

Usage:
  python render.py stills 3.4 9.8 33.2 ...   -> qa/still_<t>.png
  python render.py range 0 3599              -> frames/f_%05d.png
  python render.py all                       -> all 3600 frames (parallel)
"""
import os
import sys
import time
from multiprocessing import Pool

import engine
from engine import Canvas, N_FRAMES, FPS
import storyboard


def render_frame(i: int) -> str:
    path = os.path.join("frames", f"f_{i:05d}.png")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    t = i / FPS
    start, sheet, label, fn = storyboard.scene_at(t)
    c = Canvas()
    engine.paper_bg(c, t, 0.1, 1.4)
    fn(c, t, t - start)
    fa = 1.0 - engine.seg(t, 118.2, 119.2)
    if fa > 0.01:
        storyboard.footer(c, t, sheet=sheet, label=label, a=fa)
    engine.fade_to(c, engine.PAPER, t, 118.6, 119.9)
    img = c.finish()
    path = os.path.join("frames", f"f_{i:05d}.png")
    img.save(path, compress_level=1)
    return path


def render_still(t: float) -> str:
    start, sheet, label, fn = storyboard.scene_at(t)
    c = Canvas()
    engine.paper_bg(c, t, 0.1, 1.4)
    fn(c, t, t - start)
    engine.footer(c, t, sheet=sheet, label=label)
    img = c.finish()
    path = os.path.join("qa", f"still_{t:06.2f}".replace(".", "_") + ".png")
    img.save(path)
    return path


def _stills(ts):
    for t in ts:
        p = render_still(t)
        print("wrote", p, flush=True)


def _range(a, b, workers):
    os.makedirs("frames", exist_ok=True)
    n = b - a
    done = 0
    t0 = time.time()
    with Pool(workers) as pool:
        for _ in pool.imap_unordered(render_frame, range(a, b), chunksize=12):
            done += 1
            if done % 120 == 0 or done == n:
                el = time.time() - t0
                eta = el / done * (n - done)
                print(f"{done}/{n}  {el:.0f}s elapsed, ~{eta:.0f}s left",
                      flush=True)


if __name__ == "__main__":
    if sys.argv[1] == "stills":
        _stills([float(x) for x in sys.argv[2:]])
    elif sys.argv[1] == "range":
        _range(int(sys.argv[2]), int(sys.argv[3]),
               int(sys.argv[4]) if len(sys.argv) > 4 else 10)
    elif sys.argv[1] == "all":
        _range(0, N_FRAMES, 10)
