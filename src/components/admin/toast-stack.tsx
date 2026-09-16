"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useNotifications, notificationLink } from "@/components/admin/notifications";
import { CheckIcon, XIcon, AlertIcon, InfoIcon } from "@/components/admin/icons";
import type { AdminNotificationRow } from "@/lib/supabase/types";

/**
 * ToastStack — real-time order/sale toasts.
 *
 * Stacking is the spec's hard requirement: each toast mounts with its
 * own springy entrance and the stack repositions smoothly (layout
 * animation) as toasts dismiss. Restrained emphasis — a champagne hair
 * line for sales, tinted edges for failures/warnings — never flashy.
 */

function severityTone(n: AdminNotificationRow) {
  switch (n.severity) {
    case "success":
      return { edge: "var(--cc-accent-line)", icon: <CheckIcon className="h-3.5 w-3.5" />, color: "var(--cc-success)" };
    case "warning":
      return { edge: "var(--cc-warning)", icon: <AlertIcon className="h-3.5 w-3.5" />, color: "var(--cc-warning)" };
    case "error":
      return { edge: "var(--cc-error)", icon: <XIcon className="h-3.5 w-3.5" />, color: "var(--cc-error)" };
    default:
      return { edge: "var(--cc-line-strong)", icon: <InfoIcon className="h-3.5 w-3.5" />, color: "var(--cc-info)" };
  }
}

export function ToastStack() {
  const { toasts, dismissToast, openToast } = useNotifications();
  const reduced = useReducedMotion();

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed right-5 top-[64px] z-[70] flex w-[340px] flex-col gap-2.5"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const tone = severityTone(t);
          const href = notificationLink(t);
          return (
            <motion.div
              key={t.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, x: 28, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, x: 28, scale: 0.97, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.9 }}
              className="pointer-events-auto overflow-hidden rounded-md border shadow-xl"
              style={{
                backgroundColor: "var(--cc-surface)",
                borderColor: "var(--cc-line-strong)",
              }}
            >
              <div className="flex">
                {/* severity edge */}
                <span aria-hidden="true" className="w-[3px] shrink-0" style={{ backgroundColor: tone.edge }} />
                <div className="min-w-0 flex-1 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span style={{ color: tone.color }}>{tone.icon}</span>
                      <p className="cc-label" style={{ color: "var(--cc-text-3)" }}>
                        {t.kind === "sale" ? "New order" : t.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Dismiss"
                      onClick={() => dismissToast(t.id)}
                      className="-m-1 p-1 transition-opacity"
                      style={{ color: "var(--cc-text-4)" }}
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium" style={{ color: "var(--cc-text)" }}>
                    {t.message}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--cc-text-4)" }}>
                      just now
                    </span>
                    <Link
                      href={href}
                      onClick={() => openToast(t)}
                      className="text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ color: "var(--cc-accent-ink)" }}
                    >
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
