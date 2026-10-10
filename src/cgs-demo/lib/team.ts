"use client";

/**
 * Team workspace — pure types + presence helpers.
 *
 * The Client Growth System stays local-first: the personal workspace never
 * leaves the machine. A Team workspace is a SEPARATE, opt-in space that
 * lives in Supabase and is shared only between the licensed seats on one
 * entitlement (see supabase/migrations/0030_team_workspaces.sql — RLS is
 * the security boundary; this file is UI-side only).
 *
 * Everything here is DOM-free and dependency-free so it can be reasoned
 * about and tested in isolation from React and Supabase.
 */

/** One connected teammate, as seen through Supabase Realtime presence. */
export type Teammate = {
  /** Stable per-session participant key (device id). */
  id: string;
  /** Auth uid, or "" for the read-only demo. */
  userId: string;
  /** The seat email — the human label shown in the UI. */
  email: string;
  /** What they're editing right now (a record label), or null when idle. */
  editing: string | null;
  /** Last heartbeat, epoch ms — used to drop stale presence. */
  at: number;
};

/** A chat line in the team workspace. */
export type TeamMessage = {
  id: string;
  userId: string | null;
  authorEmail: string;
  body: string;
  createdAt: string;
};

/** A presence entry is considered live within this window of its heartbeat. */
export const PRESENCE_TTL_MS = 25_000;

/** True when a presence entry is fresh enough to count as "online". */
export function isLive(t: Teammate, now: number = Date.now()): boolean {
  return now - t.at <= PRESENCE_TTL_MS;
}

/**
 * On-brand accent palette for teammate colours. Each teammate is assigned a
 * slot deterministically from their id, so the same person always renders in
 * the same colour — used for the presence dot, the "editing" badge and the
 * chat name. Classes reuse the existing cgs design tokens; no new colours.
 */
const PALETTE = [
  { dot: "bg-cgs-accent", text: "text-cgs-accent", ring: "ring-cgs-accent/30", soft: "bg-cgs-accent-soft" },
  { dot: "bg-cgs-complete", text: "text-cgs-complete", ring: "ring-cgs-complete/30", soft: "bg-cgs-complete-soft" },
  { dot: "bg-cgs-refine", text: "text-cgs-refine", ring: "ring-cgs-refine/30", soft: "bg-cgs-refine-soft" },
  { dot: "bg-cgs-danger", text: "text-cgs-danger", ring: "ring-cgs-danger/30", soft: "bg-cgs-danger-soft" },
] as const;

export type TeammatePalette = (typeof PALETTE)[number];

/** Stable 32-bit hash → index, so a given id always maps to one palette slot. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function paletteFor(id: string): TeammatePalette {
  return PALETTE[hash(id || "?") % PALETTE.length];
}

/** First name / local-part of an email, for a compact display label. */
export function shortName(email: string): string {
  const local = (email || "").split("@")[0] || "teammate";
  return local.length > 18 ? `${local.slice(0, 17)}…` : local;
}
