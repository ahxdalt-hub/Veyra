"""
Veyra ad 2 — renderer (80 s @ 30 fps -> frames2/).

Usage:
  python render2.py stills 4.0 12.0 ...   -> qa2/still_<t>.png
  python render2.py all                   -> all 2400 frames (parallel)
"""
import os
import sys
import time
from multiprocessing import Pool

import storyboard2


TOTAL = storyboard2.TOTAL
N_FRAMES = int(TOTAL * 30)


def render_frame(i: int) -> str:
    path = os.path.join("frames2", f"f_{i:05d}.png")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    img = storyboard2.render_frame(i)
    img.save(path, compress_level=1)
    return path


def render_still(t: float) -> str:
    os.makedirs("qa2", exist_ok=True)
    img = storyboard2.render_frame(int(t * 30))
    path = os.path.join("qa2", f"still_{t:06.2f}".replace(".", "_") + ".png")
    img.save(path)
    return path


if __name__ == "__main__":
    if sys.argv[1] == "stills":
        for t in [float(x) for x in sys.argv[2:]]:
            print("wrote", render_still(t), flush=True)
    else:
        os.makedirs("frames2", exist_ok=True)
        n = N_FRAMES
        done = 0
        t0 = time.time()
        with Pool(10) as pool:
            for _ in pool.imap_unordered(render_frame, range(n), chunksize=10):
                done += 1
                if done % 120 == 0 or done == n:
                    el = time.time() - t0
                    print(f"{done}/{n}  {el:.0f}s elapsed, "
                          f"~{el / done * (n - done):.0f}s left", flush=True)
