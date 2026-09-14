"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * AnimatedNumber — transitions a displayed numeric value smoothly
 * (e.g. $79 → $77 on a seat change) instead of jumping.
 *
 * Reduced motion renders the final value immediately, per the motion
 * guidelines the rest of the commerce UI follows.
 */
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;
    if (reduced || from === value) {
      setDisplay(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
      onComplete: () => setDisplay(value),
    });
    // rAF can be paused (occluded/background tab) — guarantee the final
    // value is always shown even if the tween never gets a frame.
    const fallback = setTimeout(() => setDisplay(value), 600);
    return () => {
      controls.stop();
      clearTimeout(fallback);
    };
  }, [value, reduced]);

  return <span className="tnum">{format(display)}</span>;
}
