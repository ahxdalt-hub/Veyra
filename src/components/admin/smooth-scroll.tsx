"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import Lenis from "lenis";

/**
 * Smooth-scroll primitives for the command center.
 *
 * Lenis gives wheel scrolling its momentum curve — the "butter" feel:
 * wheel deltas are eased into scrollTop over ~0.6s instead of stepping
 * natively. It's applied to the shell's MAIN content scroller only;
 * every nested scroller (drawer, sidebar, popovers) carries
 * `data-lenis-prevent-wheel` so Lenis never fights them, and admin.css
 * gives them `overscroll-behavior: contain` so a finished scroll never
 * chains into the page behind it.
 *
 * Reduced-motion users get untouched native scrolling — checked at
 * mount, since the preference can change per-OS mid-session, the
 * listener re-runs the same decision.
 */
export function useLenisScroll(
  ref: RefObject<HTMLElement | null>,
  onScroll?: (lenis: Lenis) => void
) {
  const lenisRef = useRef<Lenis | null>(null);
  const cb = useRef(onScroll);
  useEffect(() => {
    cb.current = onScroll;
  }, [onScroll]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let lenis: Lenis | null = null;
    let raf = 0;
    let mounted = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = () => {
      if (reduced.matches || !mounted) return;
      lenis = new Lenis({
        wrapper: el,
        content: el.firstElementChild ?? el,
        duration: 0.62,
        // Below the pixel threshold, skip smoothing so tiny drags stay
        // crisp — momentum should never feel like lag.
        wheelMultiplier: 1,
        touchMultiplier: 1.4,
      });
      lenisRef.current = lenis;
      lenis.on("scroll", (l: Lenis) => {
        cb.current?.(l);
      });
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      lenis = null;
      lenisRef.current = null;
    };
    start();
    const onChange = () => {
      stop();
      start();
    };
    reduced.addEventListener("change", onChange);
    return () => {
      mounted = false;
      reduced.removeEventListener("change", onChange);
      stop();
    };
  }, [ref]);

  /** Ease the container back to the top (route changes). */
  const scrollToTop = useCallback((immediate = false) => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate });
    else ref.current?.scrollTo({ top: 0, behavior: immediate ? "auto" : "smooth" });
  }, [ref]);

  return { scrollToTop };
}

/**
 * Shared edge-fade measurement for the scroll wrappers: which edges
 * currently hide content (so a fade can mark them) — x on the first
 * render, y once a max height kicks in. The content element is observed
 * too, because live row updates can change scroll sizes without the
 * scroller itself resizing.
 */
type EdgeState = {
  x: "none" | "left" | "right" | "both";
  y: "none" | "top" | "bottom" | "both";
};

function useEdgeFades(ref: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState<EdgeState>({ x: "none", y: "none" });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    let x: EdgeState["x"] = "none";
    const xOverflow = el.scrollWidth - el.clientWidth;
    if (xOverflow > 2) {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft < xOverflow - 2;
      x = left && right ? "both" : left ? "left" : "right";
    }
    let y: EdgeState["y"] = "none";
    const yOverflow = el.scrollHeight - el.clientHeight;
    if (yOverflow > 2) {
      const top = el.scrollTop > 2;
      const bottom = el.scrollTop < yOverflow - 2;
      y = top && bottom ? "both" : top ? "top" : "bottom";
    }
    setEdges((prev) => (prev.x === x && prev.y === y ? prev : { x, y }));
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure, ref]);

  return { edges, measure };
}

/**
 * ScrollFadeX — wraps a horizontally scrollable table and fades the edge
 * where more content lives (right while scrollable, left once scrolled,
 * both in between). The fade replaces a scrollbar that nobody would
 * have noticed, so the table row ends softly instead of clipping hard.
 *
 * With `maxY`, the table also scrolls vertically in place once it passes
 * that pixel height — the page keeps its layout while a long list stays
 * contained, the header sticks to the top of the scroller (CSS), and a
 * soft fade marks the row that continues below the fold. Below the max
 * height nothing changes: no scrollbar, no fades.
 */
export function ScrollFadeX({
  children,
  className = "",
  maxY,
}: {
  children: React.ReactNode;
  className?: string;
  maxY?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { edges, measure } = useEdgeFades(ref);

  return (
    <div
      className={`cc-fade-x-wrap ${className}`}
      data-x={edges.x}
      data-y={maxY !== undefined ? edges.y : undefined}
    >
      <div
        ref={ref}
        data-x-scroll=""
        data-lenis-prevent-wheel=""
        onScroll={measure}
        style={maxY !== undefined ? { maxHeight: maxY } : undefined}
      >
        {children}
      </div>
      {maxY !== undefined ? (
        <>
          <div aria-hidden="true" className="cc-fade-y cc-fade-y-top" />
          <div aria-hidden="true" className="cc-fade-y cc-fade-y-bottom" />
        </>
      ) : null}
    </div>
  );
}

/**
 * ScrollFadeY — the feed counterpart: a vertically capped, in-place
 * scroller for timelines and lists (no table, no sticky header needed).
 * Quiet until the content outgrows `max`, then it scrolls with top and
 * bottom fades marking the hidden edges.
 */
export function ScrollFadeY({
  children,
  max = 420,
  className = "",
}: {
  children: React.ReactNode;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { edges, measure } = useEdgeFades(ref);

  return (
    <div className={`cc-fade-y-wrap ${className}`} data-y={edges.y}>
      <div
        ref={ref}
        data-y-scroll=""
        data-lenis-prevent-wheel=""
        onScroll={measure}
        style={{ maxHeight: max }}
      >
        {children}
      </div>
      <div aria-hidden="true" className="cc-fade-y cc-fade-y-top" />
      <div aria-hidden="true" className="cc-fade-y cc-fade-y-bottom" />
    </div>
  );
}
