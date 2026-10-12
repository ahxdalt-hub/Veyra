"use client";

import { useEffect, useRef } from "react";

/**
 * PresenceBeacon — anonymous "someone is looking at the site" pulse.
 *
 * Mounted once in the public (site) layout, never on /admin. On mount it
 * mints (or reuses) a random per-browser session id in localStorage, then
 * POSTs it to /api/presence immediately and again every ~20s while the tab
 * is visible. The server counts sessions whose last beat is under 60s old as
 * "viewing now" (see src/lib/presence.ts + migration 0031).
 *
 * Privacy: the id is random (crypto.randomUUID) and never tied to a person,
 * account, IP, or cookie. Nothing is stored server-side except that random
 * id, the current path, and timestamps. This is first-party, cookie-free
 * telemetry consistent with the site's privacy/cookie policy — it sets no
 * cookies and reads none.
 *
 * The pulse pauses when the tab is hidden (nothing to count) and resumes on
 * return; a final beat is sent on pagehide so an accurate count decays
 * quickly instead of lingering. Failures are swallowed — telemetry must never
 * affect the page.
 */

const BEAT_MS = 20_000;
const STORAGE_KEY = "veyra.presence.session";

function sessionId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Private mode / storage disabled: an ephemeral id is fine for one tab.
    return `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

function beat(session: string) {
  try {
    const body = JSON.stringify({ session, path: window.location.pathname });
    // sendBeacon survives page unload; fall back to fetch keepalive.
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(
        "/api/presence",
        new Blob([body], { type: "application/json" })
      );
    } else {
      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
        cache: "no-store",
      }).catch(() => {});
    }
  } catch {
    // Never let telemetry break navigation.
  }
}

export function PresenceBeacon() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const session = sessionId();
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      beat(session);
      if (timer) return;
      timer = setInterval(() => beat(session), BEAT_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    const onHide = () => beat(session);

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return null;
}
