/**
 * Demo mutation guard. The desktop store funnels every content change through
 * a handful of actions; in the web demo those actions do not mutate — they fire
 * this event, and the block popup (components/demo-block-pop) answers.
 */

export type BlockedKind =
  | "add"
  | "edit"
  | "delete"
  | "complete"
  | "reset"
  | "import"
  | "generic";

type Listener = (kind: BlockedKind) => void;

const listeners = new Set<Listener>();

let lastBlockedAt = 0;

export function onDemoBlocked(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function fireDemoBlocked(kind: BlockedKind = "generic"): void {
  lastBlockedAt = Date.now();
  for (const cb of listeners) cb(kind);
}

/** True when a mutation was blocked in the last moment — pages use this to
 *  swallow their own "saved" toasts, which would otherwise lie. */
export function wasJustBlocked(windowMs = 1500): boolean {
  return Date.now() - lastBlockedAt < windowMs;
}
