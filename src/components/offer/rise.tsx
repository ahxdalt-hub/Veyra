"use client";

import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useMotionPreference } from "@/components/motion/reveal";

/**
 * Rise — one quiet entrance: fade + rise with expo-out, played once on
 * load. Used for the offer page's staggered hero and the price-anchor
 * sequence.
 *
 * Under prefers-reduced-motion the content renders as a plain element —
 * swapped in only after hydration (see useMotionPreference) so the SSR
 * output and the hydrating render stay identical and the content can
 * never freeze at its pre-animation state.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type RiseTag = "div" | "p" | "h1" | "h2" | "span" | "section";

type RiseProps = {
  children: ReactNode;
  /** Seconds — the step in a staggered sequence. */
  delay?: number;
  /** Initial offset in px. */
  y?: number;
  className?: string;
  as?: RiseTag;
} & Omit<
  ComponentPropsWithoutRef<"div">,
  | "children"
  | "className"
  // Handlers framer-motion redefines with its own signature.
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDragStart"
  | "onDrag"
  | "onDragEnd"
>;

export function Rise({
  children,
  delay = 0,
  y = 16,
  className = "",
  as = "div",
  ...rest
}: RiseProps) {
  const reduced = useMotionPreference();

  if (reduced) {
    const Tag = as as "div";
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  const MotionTag = motion[as as "div"];

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: EASE }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
