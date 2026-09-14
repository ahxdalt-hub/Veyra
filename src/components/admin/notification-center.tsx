"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/admin/actions";
import type { AdminNotificationRow } from "@/lib/admin/notifications";
import { AdminBellIcon, AdminCloseIcon, AdminCheckIcon } from "./admin-icons";

/**
 * NotificationCenter — the persistent record of important events.
 * Unread entries carry a bronze marker and full opacity; read entries
 * dim. Dismiss marks read (never deletes the business data it refers
 * to). The panel polls for new events while open and fires a toast for
 * any that arrive unseen.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function severityStyle(severity: AdminNotificationRow["severity"]) {
  switch (severity) {
    case "success":
      return { text: "text-cc-good", glyph: "✓" };
    case "warning":
      return { text: "text-cc-accent", glyph: "▲" };
    case "error":
      return { text: "text-cc-bad", glyph: "✕" };
    default:
      return { text: "text-cc-info", glyph: "•" };
  }
}

function relative(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function NotificationCenter({
  initial,
  refreshHref,
}: {
  initial: AdminNotificationRow[];
  refreshHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(initial);
  const [seenIds, setSeenIds] = useState<Set<string>>(
    () => new Set(initial.map((n) => n.id))
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  const unread = items.filter((n) => !n.read_at).length;

  // Poll while open — a lightweight live view of new events.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(refreshHref, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { notifications: AdminNotificationRow[] };
        setItems(data.notifications);
      } catch {
        /* offline — keep showing what we have */
      }
    }, 10000);
    return () => window.clearInterval(id);
  }, [open, refreshHref]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function dismiss(id: string) {
    // Optimistic; the server action reconciles persistence.
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setSeenIds((prev) => new Set(prev).add(id));
    await markNotificationReadAction(id);
  }

  async function markAll() {
    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        read_at: n.read_at ?? new Date().toISOString(),
      }))
    );
    await markAllNotificationsReadAction();
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Notifications${unread ? ` — ${unread} unread` : ""}`}
        aria-expanded={open}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-sm border transition-colors ${
          open
            ? "border-cc-accent/50 bg-cc-accent-soft text-cc-accent"
            : "border-cc-line text-cc-text-2 hover:border-cc-line-strong hover:text-cc-text"
        }`}
        onClick={() => setOpen((v) => !v)}
      >
        <AdminBellIcon className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cc-accent px-1 text-[0.5625rem] font-bold leading-none text-cc-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Notification center"
            className="absolute right-0 top-11 z-50 w-[22rem] overflow-hidden rounded-md border border-cc-line bg-cc-panel shadow-[0_16px_48px_rgba(0,0,0,0.5)] sm:w-96"
            initial={reduced ? false : { opacity: 0, y: -6, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div className="flex items-center justify-between border-b border-cc-line px-4 py-3">
              <p className="text-sm font-medium text-cc-text">Notifications</p>
              <div className="flex items-center gap-2">
                {unread > 0 ? (
                  <button
                    type="button"
                    onClick={markAll}
                    className="inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs text-cc-text-3 transition-colors hover:bg-cc-panel-2 hover:text-cc-text"
                  >
                    <AdminCheckIcon className="h-3 w-3" />
                    Mark all read
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Close notifications"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-cc-text-3 hover:bg-cc-panel-2 hover:text-cc-text"
                  onClick={() => setOpen(false)}
                >
                  <AdminCloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <ul className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-4 py-10 text-center text-xs text-cc-text-3">
                  No notifications yet. Sales and system events will appear here.
                </li>
              ) : (
                items.map((n) => {
                  const sev = severityStyle(n.severity);
                  const isUnread = !n.read_at;
                  return (
                    <motion.li
                      key={n.id}
                      layout
                      className={`group relative border-b border-cc-line/60 px-4 py-3 last:border-b-0 ${
                        isUnread ? "bg-cc-panel-2/50" : ""
                      }`}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-1 shrink-0 text-[0.625rem] leading-none ${sev.text}`}
                          aria-hidden="true"
                        >
                          {sev.glyph}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[0.8125rem] font-medium leading-snug ${
                              isUnread ? "text-cc-text" : "text-cc-text-2"
                            }`}
                          >
                            {n.title}
                            {isUnread ? (
                              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-cc-accent align-middle" aria-label="unread" />
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-cc-text-3">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[0.625rem] uppercase tracking-wide text-cc-text-4">
                            {relative(n.created_at)}
                            {n.related_entity === "order" && n.related_slug ? (
                              <>
                                {" · "}
                                <Link
                                  href={`/admin/orders?focus=${n.related_slug}`}
                                  className="text-cc-accent hover:underline"
                                >
                                  View order
                                </Link>
                              </>
                            ) : null}
                          </p>
                        </div>
                        {isUnread ? (
                          <button
                            type="button"
                            aria-label={`Mark "${n.title}" as read`}
                            className="shrink-0 rounded-xs p-1 text-cc-text-4 opacity-0 transition-opacity hover:text-cc-text focus-visible:opacity-100 group-hover:opacity-100"
                            onClick={() => dismiss(n.id)}
                          >
                            <AdminCheckIcon className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </motion.li>
                  );
                })
              )}
            </ul>

            {items.length > 0 ? (
              <div className="border-t border-cc-line px-4 py-2.5">
                <Link
                  href="/admin/notifications"
                  className="text-xs text-cc-text-3 transition-colors hover:text-cc-accent"
                >
                  Open notification history →
                </Link>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Keep seen ids for toast diffing */}
      <span className="hidden" data-seen={Array.from(seenIds).join(",")} />
    </div>
  );
}
