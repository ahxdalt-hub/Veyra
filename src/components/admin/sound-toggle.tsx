"use client";

import { useEffect, useState } from "react";
import {
  isSoundMuted,
  playCue,
  setSoundMuted,
  unlockAudio,
} from "@/lib/admin/sound";
import { VolumeOffIcon, VolumeOnIcon } from "@/components/admin/icons";

/**
 * SoundToggle — the topbar's mute/unmute for the command center's chime
 * cues. State persists in localStorage; turning sound ON previews the
 * sale chime so the admin knows exactly what they just armed (and the
 * click itself doubles as the autoplay-policy unlock).
 */
export function SoundToggle() {
  const [muted, setMuted] = useState(true); // SSR-safe default; synced on mount

  useEffect(() => {
    setMuted(isSoundMuted());
  }, []);

  const toggle = () => {
    const next = !muted;
    setSoundMuted(next);
    setMuted(next);
    if (!next) {
      unlockAudio();
      playCue("sale"); // hear what you just switched on
    }
  };

  return (
    <button
      type="button"
      aria-label={muted ? "Purchase sounds: off — turn on" : "Purchase sounds: on — turn off"}
      aria-pressed={!muted}
      title={muted ? "Purchase sounds off" : "Purchase sounds on"}
      onClick={toggle}
      className="relative flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
      style={{
        color: muted ? "var(--cc-text-4)" : "var(--cc-accent-ink)",
        backgroundColor: muted ? undefined : "var(--cc-accent-dim)",
      }}
      onMouseEnter={(e) => {
        if (muted) e.currentTarget.style.backgroundColor = "var(--cc-surface)";
      }}
      onMouseLeave={(e) => {
        if (muted) e.currentTarget.style.backgroundColor = "";
      }}
    >
      {muted ? <VolumeOffIcon /> : <VolumeOnIcon />}
    </button>
  );
}
