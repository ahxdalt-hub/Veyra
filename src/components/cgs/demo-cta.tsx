"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ButtonArrow } from "@/components/ui/button";

/**
 * DemoCta — the hero's "Try the live demo" button.
 *
 * Carries the site's accent hairline geometry (h-11, rounded-sm, same type
 * scale as Button lg) but adds presence effects for pointing devices:
 *
 *  - Proximity magnetism: an invisible padded zone wraps the button. When the
 *    cursor crosses into it, a registration frame blooms out around the
 *    button, the button lifts into an accent glow, and it drifts gently
 *    toward the cursor — smoothed with a per-frame lerp, not a CSS snap, so
 *    the follow and the settle home both feel springy.
 *  - Bespoke cursor: inside the zone the native pointer is traded for a
 *    slowly spinning dashed-accent ring that trails the true position with
 *    its own easing, making the button area unmistakably "live".
 *
 * Everything degrades quietly: on touch devices and under
 * prefers-reduced-motion the zone stays inert (no cursor:none, no data-near)
 * and the button reads as a plain accent-framed CTA with the hover fill.
 */

const MAX_PULL = 9; // px the button may drift toward the cursor
const PULL_GAIN = 0.3; // share of the cursor offset translated into pull
const FOLLOW = 0.16; // per-frame easing of the button toward its pull target
const CURSOR_FOLLOW = 0.3; // per-frame easing of the ring toward the pointer

export function DemoCta({ className = "" }: { className?: string }) {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const floatRef = useRef<HTMLSpanElement | null>(null);
  const btnRef = useRef<HTMLAnchorElement | null>(null);
  const ringRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const float = floatRef.current;
    const btn = btnRef.current;
    const ring = ringRef.current;
    if (!zone || !float || !btn || !ring) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = { x: 0, y: 0 }; // where the magnet wants the button
    const pos = { x: 0, y: 0 }; // where the button actually is
    const cursor = { x: 0, y: 0 }; // true pointer, viewport coords
    const ringPos = { x: 0, y: 0 }; // where the ring is drawn
    let raf = 0;
    let inside = false;

    const tick = () => {
      pos.x += (target.x - pos.x) * FOLLOW;
      pos.y += (target.y - pos.y) * FOLLOW;
      float.style.transform = `translate3d(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px, 0)`;
      ringPos.x += (cursor.x - ringPos.x) * CURSOR_FOLLOW;
      ringPos.y += (cursor.y - ringPos.y) * CURSOR_FOLLOW;
      ring.style.transform = `translate3d(${ringPos.x.toFixed(1)}px, ${ringPos.y.toFixed(1)}px, 0)`;
      const moving =
        Math.hypot(target.x - pos.x, target.y - pos.y) > 0.05 ||
        Math.hypot(cursor.x - ringPos.x, cursor.y - ringPos.y) > 0.4;
      if (moving || inside) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
        float.style.transform = "translate3d(0, 0, 0)";
      }
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (!inside) enter(e); // pointer warps (synthetic input) may skip pointerenter
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      const r = zone.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const pull = Math.min(MAX_PULL, dist * PULL_GAIN);
      target.x = (dx / dist) * pull;
      target.y = (dy / dist) * pull;
      start();
    };

    const enter = (e: PointerEvent) => {
      inside = true;
      cursor.x = ringPos.x = e.clientX;
      cursor.y = ringPos.y = e.clientY;
      // place the ring at the pointer immediately, before the first frame
      ring.style.transform = `translate3d(${ringPos.x.toFixed(1)}px, ${ringPos.y.toFixed(1)}px, 0)`;
      btn.dataset.near = "true";
      zone.style.cursor = "none";
      ring.style.opacity = "1";
      start();
    };

    const leave = () => {
      inside = false;
      target.x = 0;
      target.y = 0;
      btn.removeAttribute("data-near");
      zone.style.cursor = "";
      ring.style.opacity = "0";
      start();
    };

    zone.addEventListener("pointerenter", enter);
    zone.addEventListener("pointerleave", leave);
    zone.addEventListener("pointermove", onMove);
    return () => {
      zone.removeEventListener("pointerenter", enter);
      zone.removeEventListener("pointerleave", leave);
      zone.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={zoneRef} className={`relative p-3 sm:p-5 sm:-mr-5 ${className}`}>
      <span ref={floatRef} className="relative inline-block will-change-transform max-sm:flex">
        <Link
          ref={btnRef}
          href="/demo/client-growth-system"
          className="group/btn group/demo relative inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-accent/55 bg-surface px-5 text-[0.9375rem] font-medium tracking-[-0.01em] whitespace-nowrap text-accent-ink transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[near=true]:scale-[1.03] data-[near=true]:border-accent data-[near=true]:shadow-[0_0_0_5px_rgba(138,99,32,0.10),0_10px_28px_-10px_rgba(138,99,32,0.45)] hover:bg-accent hover:text-white active:bg-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {/* registration frame — hairline square blooming out on approach */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[5px] rounded-[4px] border border-accent/35 opacity-0 scale-[0.86] transition-[opacity,transform,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/demo:border-accent/70 group-hover/demo:opacity-100 group-hover/demo:scale-100 group-data-[near=true]/demo:opacity-100 group-data-[near=true]/demo:scale-100"
          />
          Try the live demo
          <ButtonArrow className="opacity-70 transition-opacity group-hover/btn:opacity-100" />
        </Link>
      </span>

      {/* bespoke cursor — a spinning dashed ring trailing the pointer in the zone */}
      <span
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[60] opacity-0 transition-opacity duration-300 will-change-transform"
      >
        <span className="absolute -left-4 -top-4 block h-8 w-8">
          <svg
            viewBox="0 0 32 32"
            className="h-8 w-8 animate-[spin_3.2s_linear_infinite] text-accent"
            fill="none"
          >
            <circle
              cx="16"
              cy="16"
              r="12.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3.5 6.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute left-1/2 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        </span>
      </span>
    </div>
  );
}
