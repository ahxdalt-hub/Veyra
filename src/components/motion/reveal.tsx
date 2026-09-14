"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";

/**
 * Reveal — section entrance animation.
 *
 * One calm entrance per block: fade + 12px rise over 600ms with expo-out.
 * Runs once (whileInView). Fully disabled under prefers-reduced-motion —
 * content is visible immediately, exactly as it reads.
 *
 * Reduced-motion note: framer's useReducedMotion() initialises from the
 * media query during the FIRST client render, so branching the JSX on it
 * directly would diverge from the SSR output (motion + initial styles) and
 * freeze React-19-hydrated content at opacity 0. useMotionPreference()
 * gates the swap until after hydration — useSyncExternalStore returns the
 * server snapshot (false) for the hydrating render, then flips, so SSR
 * and hydration render identical motion markup and reduced-motion users
 * get plain elements via a clean post-hydration remount.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

const emptySubscribe = () => () => {};

/**
 * True only after hydration when the user prefers reduced motion.
 * SSR and the hydrating render always return false, keeping server and
 * client output identical; the post-hydration flip triggers a remount.
 */
export function useMotionPreference(): boolean {
  const reduced = useReducedMotion();
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  return hydrated && reduced === true;
}

export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const reduced = useMotionPreference();

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Stagger — a container that reveals children in sequence.
 * Cap of ~80ms/step keeps the rhythm perceptible but never sluggish.
 */

export function Stagger({
  children,
  className = "",
  step = 0.08,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
}) {
  const reduced = useMotionPreference();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px 0px" }}
      transition={{ staggerChildren: step }}
    >
      {children}
    </motion.div>
  );
}

/** Item inside a <Stagger>. */
export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useMotionPreference();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
