"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useNotifications, notificationLink } from "@/components/admin/notifications";
import { CheckIcon, XIcon, AlertIcon, InfoIcon } from "@/components/admin/icons";
import type { AdminNotificationRow } from "@/lib/supabase/types";

/**
 * ToastStack — real-time order/sale toasts.
 *
 * Two visual registers:
 *  - PAID SALES get the hero treatment: a champagne-accented card with
 *    the amount in display type, a one-time sheen sweep, and the widest
 *    slide-in — the celebration moment (paired with the sale chime).
 *  - Every other event keeps the quiet severity-edge card: neutral,
 *    red for failures, amber for warnings.
 *
 * Stacking is the spec's hard requirement: each toast mounts with its
 * own springy entrance and the stack repositions smoothly (layout
 * animation) as toasts dismiss.
 */

function severityTone(n: AdminNotificationRow) {
  switch (n.severity) {
    case "success":
      return { edge: "var(--cc-accent-line)", tint: "var(--cc-accent-dim)", icon: <CheckIcon className="h-3.5 w-3.5" />, color: "var(--cc-success)" };
    case "warning":
      return { edge: "var(--cc-warning)", tint: "var(--cc-warning-dim)", icon: <AlertIcon className="h-3.5 w-3.5" />, color: "var(--cc-warning)" };
    case "error":
      return { edge: "var(--cc-error)", tint: "var(--cc-error-dim)", icon: <XIcon className="h-3.5 w-3.5" />, color: "var(--cc-error)" };
    default:
      return { edge: "var(--cc-info)", tint: "var(--cc-info-dim)", icon: <InfoIcon className="h-3.5 w-3.5" />, color: "var(--cc-info)" };
  }
}

/** Is this sale a $0 free-product claim? Claims ride the sale writer
 *  with amountMinor: 0 — "Product — $0.00 · email". */
function isFreeSale(amount: string | null): boolean {
  return !!amount && /^[$€₹]\s?0(?:[.,]0{1,2})?$/.test(amount.trim());
}

/**
 * Sale messages are written server-side as
 *   "Product — $299.00 (3 seats) · email"   (real webhook path)
 *   "Product · $299 · DEMO"                 (demo generator)
 * Pull the amount, product, seats and payer out for the hero layout;
 * anything unparseable falls back to the raw message.
 */
function parseSale(message: string): {
  product: string;
  amount: string | null;
  seats: string | null;
  payer: string | null;
  rest: string;
} {
  const amountMatch = message.match(/[$€₹]\s?[\d,]+(?:\.\d{1,2})?/);
  const withoutAmount = amountMatch ? message.replace(amountMatch[0], "").trim() : message;
  const segments = withoutAmount.split(/[—·|]/).map((s) => s.trim()).filter(Boolean);
  let product = segments[0] ?? message;
  let seats: string | null = null;
  let payer: string | null = null;
  const seatSeg = segments.find((s) => /^\d+\s+seats?$/i.test(s));
  if (seatSeg) seats = seatSeg;
  const payerSeg = [...segments].reverse().find((s) => s.includes("@"));
  if (payerSeg) payer = payerSeg;
  product = product.replace(/\s*\(.*?\)\s*$/, "").trim() || message;
  return { product, amount: amountMatch?.[0] ?? null, seats, payer, rest: message };
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
          const href = notificationLink(t);
          const isSale = t.kind === "sale";
          const tone = severityTone(t);
          const sale = isSale ? parseSale(t.message) : null;
          const isFree = isSale && isFreeSale(sale?.amount ?? null);
          return (
            <motion.div
              key={t.id}
              layout={!reduced}
              // Slide in from the right on a spring — sales travel the
              // widest distance. Reduced motion still gets a fade, never
              // a dead pop into place.
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: isSale ? 64 : 44, scale: isSale ? 0.95 : 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={
                reduced
                  ? { opacity: 0, transition: { duration: 0.2 } }
                  : { opacity: 0, x: 32, scale: 0.97, transition: { duration: 0.18 } }
              }
              transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.9 }}
              className="pointer-events-auto overflow-hidden rounded-md border shadow-xl"
              style={{
                // Colour indication per event: champagne for paid, mint
                // for free claims, and status-tinted for everything else
                // (blue ordered, red failed, amber warnings). The tint is
                // painted OVER an opaque --cc-surface base: the dim vars
                // are low-alpha rgba, and without the base the toast
                // reads as glass with page content bleeding through.
                backgroundColor: "var(--cc-surface)",
                backgroundImage: `linear-gradient(0deg, ${
                  isSale
                    ? isFree
                      ? "var(--cc-success-dim)"
                      : "var(--cc-accent-dim)"
                    : tone.tint
                }, ${
                  isSale
                    ? isFree
                      ? "var(--cc-success-dim)"
                      : "var(--cc-accent-dim)"
                    : tone.tint
                })`,
                borderColor: isSale
                  ? isFree
                    ? "var(--cc-success)"
                    : "var(--cc-accent-line)"
                  : tone.edge,
              }}
            >
              {isSale ? (
                /* ——— sale hero: champagne for paid, mint for free ——— */
                <div className="relative">
                  {!reduced && !isFree && (
                    <motion.span
                      aria-hidden="true"
                      initial={{ x: "-160%" }}
                      animate={{ x: "460%" }}
                      transition={{ duration: 1.1, ease: "easeOut", delay: 0.25 }}
                      className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/3"
                      style={{
                        background:
                          "linear-gradient(105deg, transparent 0%, rgba(230,207,154,0.14) 50%, transparent 100%)",
                      }}
                    />
                  )}
                  <div className="relative z-10 flex">
                    <span
                      aria-hidden="true"
                      className="w-[3px] shrink-0"
                      style={{ backgroundColor: isFree ? "var(--cc-success)" : "var(--cc-accent)" }}
                    />
                    <div className="min-w-0 flex-1 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="cc-label"
                          style={{ color: isFree ? "var(--cc-success)" : "var(--cc-accent-ink)" }}
                        >
                          {isFree ? "Free claim" : "New sale"}
                        </span>
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
                      {(() => {
                        const s = sale!;
                        return (
                          <>
                            <div className="mt-2 flex items-end justify-between gap-3">
                              <p className="min-w-0 truncate text-sm font-medium" style={{ color: "var(--cc-text)" }}>
                                {s.product}
                              </p>
                              {s.amount ? (
                                <motion.span
                                  initial={reduced ? undefined : { opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.15, duration: 0.3 }}
                                  className="cc-figure shrink-0 text-lg font-medium tnum"
                                  style={{ color: isFree ? "var(--cc-success)" : "var(--cc-accent-ink)" }}
                                >
                                  {isFree ? "FREE" : s.amount}
                                </motion.span>
                              ) : (
                                <p className="min-w-0 truncate text-sm font-medium" style={{ color: "var(--cc-text)" }}>
                                  {t.message}
                                </p>
                              )}
                            </div>
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-xs" style={{ color: "var(--cc-text-4)" }}>
                                {[s.payer, s.seats].filter(Boolean).join(" · ")}
                              </span>
                              <Link
                                href={href}
                                onClick={() => openToast(t)}
                                className="shrink-0 text-xs font-medium transition-opacity hover:opacity-80"
                                style={{ color: "var(--cc-accent-ink)" }}
                              >
                                View →
                              </Link>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                /* ——— operational card ——— */
                <div className="flex">
                  <span aria-hidden="true" className="w-[3px] shrink-0" style={{ backgroundColor: tone.edge }} />
                  <div className="min-w-0 flex-1 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span style={{ color: tone.color }}>{tone.icon}</span>
                        <p className="cc-label" style={{ color: "var(--cc-text-3)" }}>
                          {t.title}
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
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
