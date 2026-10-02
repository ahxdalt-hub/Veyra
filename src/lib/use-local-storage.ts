"use client";

import { useSyncExternalStore } from "react";

/**
 * localStorage-backed primitive string state, consumed the same way the
 * storefront cart does (useSyncExternalStore) — no setState-in-effect
 * cascades, multi-tab sync for free, hydration-safe via a fixed server
 * snapshot.
 */

export function useLocalStorageState(
  key: string,
  initial: string
): [string, (next: string) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) cb();
      };
      const onLocal = () => cb();
      window.addEventListener("storage", onStorage);
      listenersFor(key).add(onLocal);
      return () => {
        window.removeEventListener("storage", onStorage);
        listenersFor(key).delete(onLocal);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(key) ?? initial;
      } catch {
        return initial;
      }
    },
    () => initial
  );

  const set = (next: string) => {
    try {
      window.localStorage.setItem(key, next);
    } catch {
      /* private mode — state lives for this page only */
    }
    for (const l of listenersFor(key)) l();
  };

  return [value, set];
}

const localListeners = new Map<string, Set<() => void>>();

/** Same-tab writes notify subscribers through this registry — the Map must
 * materialise a Set per key or `?.add` silently drops every listener. */
function listenersFor(key: string): Set<() => void> {
  let set = localListeners.get(key);
  if (!set) {
    set = new Set();
    localListeners.set(key, set);
  }
  return set;
}
