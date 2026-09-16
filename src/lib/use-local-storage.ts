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
      localListeners.get(key)?.add(onLocal);
      return () => {
        window.removeEventListener("storage", onStorage);
        localListeners.get(key)?.delete(onLocal);
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
    for (const l of localListeners.get(key) ?? []) l();
  };

  return [value, set];
}

const localListeners = new Map<string, Set<() => void>>();
