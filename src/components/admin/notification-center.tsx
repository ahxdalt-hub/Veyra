"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useNotifications, notificationLink } from "@/components/admin/notifications";
import { timeAgo } from "@/components/admin/format";
import { BellIcon } from "@/components/admin/icons";
import type { AdminNotificationRow } from "@/lib/supabase/types";

/**
 * NotificationCenter — the bell and its panel. Unread dot + count; the
 * panel holds recent events (toast dismissal never removes history),
 * mark-read on click, and "Mark all read". Refreshes on open so the
 * list always reflects the DB, not just live pushes.
 */

const TONE_DOT: Record<AdminNotificationRow["severity"], string> = {
  success: "var(--cc-success)",
  warning: "var(--cc-warning)",
  error: "var(--cc-error)",
  info: "var(--cc-info)",
};

export function NotificationCenter() {
  const { unread, recent, markRead, markAllRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    refresh();
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, refresh]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
        style={{ color: open ? "var(--cc-text)" : "var(--cc-text-3)", backgroundColor: open ? "var(--cc-surface-2)" : undefined }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.backgroundColor = "var(--cc-surface)";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.backgroundColor = "";
        }}
      >
        <BellIcon className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold tnum"
            style={{ backgroundColor: "var(--cc-accent)", color: "#141007" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={reduced ? false : { opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full z-50 mt-1.5 w-[360px] overflow-hidden rounded-md border shadow-xl"
            style={{ backgroundColor: "var(--cc-surface)", borderColor: "var(--cc-line-strong)" }}
          >
            <div
              className="flex h-11 items-center justify-between border-b px-4"
              style={{ borderColor: "var(--cc-line)" }}
            >
              <p className="cc-label">Notifications</p>
              {recent.some((n) => !n.read_at) && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: "var(--cc-accent-ink)" }}
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {recent.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm" style={{ color: "var(--cc-text-3)" }}>
                  Nothing yet. New orders and account activity appear here the moment they happen.
                </p>
              ) : (
                recent.map((n) => (
                  <Link
                    key={n.id}
                    href={notificationLink(n)}
                    onClick={() => markRead(n.id)}
                    className="flex items-start gap-3 border-b px-4 py-3 transition-colors last:border-b-0"
                    style={{ borderColor: "var(--cc-line)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--cc-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: n.read_at ? "var(--cc-text-4)" : TONE_DOT[n.severity],
                        opacity: n.read_at ? 0.5 : 1,
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-sm"
                        style={{ color: n.read_at ? "var(--cc-text-3)" : "var(--cc-text)" }}
                      >
                        {n.message}
                      </span>
                      <span className="mt-0.5 block text-xs" style={{ color: "var(--cc-text-4)" }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>

            <Link
              href="/admin/activity"
              onClick={() => setOpen(false)}
              className="flex h-10 items-center justify-center border-t text-xs font-medium transition-colors"
              style={{ borderColor: "var(--cc-line)", color: "var(--cc-text-3)" }}
            >
              View all activity
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
