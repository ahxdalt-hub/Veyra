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
  cb.current = onScroll;

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
 * ScrollFadeX — wraps a horizontally scrollable table and fades the edge
 * where more content lives (right while scrollable, left once scrolled,
 * both in between). The fade replaces a scrollbar that nobody would
 * have noticed, so the table row ends softly instead of clipping hard.
 */
export function ScrollFadeX({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<"none" | "left" | "right" | "both">("none");

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow <= 2) {
      setEdges("none");
      return;
    }
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft < overflow - 2;
    setEdges(left && right ? "both" : left ? "left" : "right");
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div className={`cc-fade-x-wrap ${className}`} data-x={edges}>
      <div
        ref={ref}
        data-x-scroll=""
        data-lenis-prevent-wheel=""
        onScroll={measure}
      >
        {children}
      </div>
    </div>
  );
}
