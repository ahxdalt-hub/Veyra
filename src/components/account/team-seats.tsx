"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  deactivateSeatAction,
  inviteSeatAction,
  reassignSeatAction,
} from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusIcon } from "@/components/ui/icons";

/**
 * TeamSeats — seat management for one entitlement.
 *
 * Every action calls a server action that re-verifies ownership and the
 * seat ceiling server-side (RLS-backed); this UI is convenience only.
 * The seat table is always rendered from server data — actions
 * revalidate the route, so the list refreshes from the database, never
 * from local state.
 */

export type SeatView = {
  id: string;
  seat_number: number;
  email: string;
  status: "invited" | "active";
  /** True for the purchaser's own anchor seat (seat 1, purchaser email). */
  isOwner: boolean;
};

type Mode = { kind: "idle" } | { kind: "invite" } | { kind: "reassign"; seat: SeatView };

export function TeamSeats({
  entitlementId,
  seats,
  assignments,
  productName,
}: {
  entitlementId: string;
  /** Total licensed seats purchased (1–5). */
  seats: number;
  assignments: SeatView[];
  productName: string;
}) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<Mode>({ kind: "idle" });
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message?: string; error?: string }>(
    {}
  );

  const activeSeats = assignments.length;
  const availableSeats = Math.max(0, seats - activeSeats);
  const full = availableSeats === 0;

  function close() {
    setMode({ kind: "idle" });
    setEmail("");
  }

  function submit() {
    startTransition(async () => {
      const result =
        mode.kind === "invite"
          ? await inviteSeatAction(entitlementId, email)
          : mode.kind === "reassign"
            ? await reassignSeatAction(mode.seat.id, email)
            : {};
      setFeedback(result);
      if (result.message) close();
    });
  }

  function deactivate(seat: SeatView) {
    startTransition(async () => {
      const result = await deactivateSeatAction(seat.id);
      setFeedback(result);
    });
  }

  const emailError =
    email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
      ? "Enter a valid email address."
      : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-eyebrow">Team access</h3>
        <p className="spec text-ink-4">
          {seats} licensed {seats === 1 ? "seat" : "seats"} ·{" "}
          {activeSeats} {activeSeats === 1 ? "in use" : "in use"} ·{" "}
          {availableSeats} {availableSeats === 1 ? "available" : "available"}
        </p>
      </div>

      {/* Seat table */}
      <ul role="list" className="mt-3 divide-y divide-line border border-line rounded-sm bg-paper">
        {assignments.length === 0 ? (
          <li className="px-4 py-3.5 text-xs leading-relaxed text-ink-3">
            No seats assigned yet. Invite your first team member below —
            every purchase includes licences for up to 5 users.
          </li>
        ) : (
          assignments.map((seat) => (
            <li
              key={seat.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-xs font-medium tnum text-ink-2">
                {seat.seat_number}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {seat.email}
                {seat.isOwner ? (
                  <span className="ml-2 text-xs text-ink-4">you · licence owner</span>
                ) : null}
              </span>
              <span
                className={`inline-flex items-center rounded-xs border px-2 py-0.5 text-xs font-medium ${
                  seat.status === "active"
                    ? "border-accent/30 bg-accent-soft text-accent-ink"
                    : "border-line-strong bg-surface text-ink-3"
                }`}
              >
                {seat.status === "active" ? "Active" : "Invited"}
              </span>
              {seat.isOwner ? null : (
                <span className="flex shrink-0 items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMode({ kind: "reassign", seat });
                      setEmail("");
                      setFeedback({});
                    }}
                    className="text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                  >
                    Reassign
                  </button>
                  <span aria-hidden="true" className="text-ink-4">·</span>
                  <button
                    type="button"
                    onClick={() => deactivate(seat)}
                    disabled={pending}
                    className="text-ink-3 underline-offset-4 hover:text-clay hover:underline disabled:opacity-50"
                  >
                    Deactivate
                  </button>
                </span>
              )}
            </li>
          ))
        )}
      </ul>

      {/* Feedback — server action results */}
      <AnimatePresence mode="wait" initial={false}>
        {feedback.message ? (
          <motion.p
            key="ok"
            role="status"
            initial={reduced ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="animate-rise mt-3 rounded-sm border border-accent/25 bg-accent-soft px-3.5 py-2.5 text-xs leading-relaxed text-accent-ink"
          >
            {feedback.message}
          </motion.p>
        ) : feedback.error ? (
          <motion.p
            key="err"
            role="alert"
            initial={reduced ? false : { opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 rounded-sm border border-clay/30 bg-clay-soft/60 px-3.5 py-2.5 text-xs leading-relaxed text-clay"
          >
            {feedback.error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {/* Invite / reassign form */}
      {mode.kind === "idle" ? (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMode({ kind: "invite" });
              setEmail("");
              setFeedback({});
            }}
            disabled={full || pending}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {full ? "All seats in use" : "Invite user"}
          </Button>
          {full ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-4">
              Every purchased seat has a user. Deactivate a seat to hand it
              to someone else, or purchase another seat for more users.
            </p>
          ) : null}
        </div>
      ) : (
        <form
          className="mt-3 max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (!emailError) submit();
          }}
        >
          <Input
            type="email"
            label={mode.kind === "reassign" ? "New email for this seat" : "Team member's email"}
            placeholder="teammate@yourbusiness.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            error={emailError}
            autoFocus
          />
          <div className="mt-3 flex items-center gap-2">
            <Button type="submit" variant="accent" size="sm" disabled={pending || Boolean(emailError)}>
              {pending
                ? "Saving…"
                : mode.kind === "reassign"
                  ? "Reassign seat"
                  : "Assign seat"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={close} disabled={pending}>
              Cancel
            </Button>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-ink-4">
            {mode.kind === "reassign"
              ? "The seat moves to this address; the previous user loses access at their next sign-in."
              : `They'll be part of your ${productName} licence — active once they sign in with this address.`}
          </p>
        </form>
      )}
    </div>
  );
}
