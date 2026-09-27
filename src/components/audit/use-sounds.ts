"use client";

/**
 * useUiSounds — the React mirror of the sound engine in src/lib/sound.ts.
 *
 * useSyncExternalStore keeps the toggle in sync across every component
 * that uses it; the server snapshot is `true` (on), so SSR and the
 * hydrating render agree, then the real preference flips in cleanly.
 */

import { useCallback, useSyncExternalStore } from "react";
import {
  playSfx,
  setSoundsEnabled,
  soundsEnabled,
  subscribeSounds,
  type SfxName,
} from "@/lib/sound";

export function useUiSounds() {
  const enabled = useSyncExternalStore(
    subscribeSounds,
    soundsEnabled,
    () => true
  );

  const toggle = useCallback(() => {
    const next = !soundsEnabled();
    setSoundsEnabled(next);
    if (next) playSfx("unlock"); // audible confirmation that sound is on
  }, []);

  const hover = useCallback(() => playSfx("hover"), []);
  const select = useCallback((step: number) => playSfx("select", step), []);
  const back = useCallback(() => playSfx("back"), []);
  const play = useCallback((name: SfxName) => playSfx(name), []);

  return { enabled, toggle, hover, select, back, play };
}
