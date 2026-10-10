/**
 * Shared motion constants.
 *
 * The single easing curve every marketing surface animates on, so the
 * whole site shares one calm expo-out rhythm (see components/motion/
 * reveal.tsx, which uses the same value for its section entrances).
 * `as const` keeps the tuple's literal types so framer-motion accepts it.
 */

export const EASE = [0.16, 1, 0.3, 1] as const;
