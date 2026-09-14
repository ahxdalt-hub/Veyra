"use client";

import { useActionState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { adminLoginAction, type LoginState } from "@/app/admin/actions";
import { AdminLockIcon } from "./admin-icons";

/**
 * AdminLoginScreen — the command center gate. Deliberately quiet: one
 * field, one action, no theatrics. The reveal is a single soft rise; the
 * card carries the same drafting-grid texture the command center uses,
 * so the door already looks like the room behind it.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export function AdminLoginScreen() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    adminLoginAction,
    {}
  );
  const reduced = useReducedMotion();

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-cc-bg px-4 text-cc-text">
      {/* Faint drafting grid — the command center's texture. */}
      <div className="cc-grid pointer-events-none absolute inset-0 opacity-60" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 38%, rgba(201,151,63,0.05), transparent 70%)",
        }}
      />

      <motion.div
        className="relative w-full max-w-sm"
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <p className="spec text-cc-text-3">Caelmont · Veyra</p>
          <h1 className="mt-3 font-display text-[1.75rem] font-medium tracking-[-0.015em] text-cc-text">
            Command Center
          </h1>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-cc-text-3">
            Restricted internal system. Authorized access only.
          </p>
        </div>

        <form
          action={formAction}
          className="cc-edge rounded-md border border-cc-line bg-cc-panel p-6 shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
        >
          <label
            htmlFor="admin-password"
            className="flex items-center gap-2 text-xs font-medium tracking-wide text-cc-text-2"
          >
            <AdminLockIcon className="h-3.5 w-3.5 text-cc-accent" />
            Admin password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            autoFocus
            className="mt-3 h-10 w-full rounded-sm border border-cc-line-strong bg-cc-bg px-3 font-mono text-sm text-cc-text placeholder:text-cc-text-4 focus:border-cc-accent focus:outline-none focus:ring-1 focus:ring-cc-accent/40"
            placeholder="••••••••••••"
          />

          {state.error ? (
            <motion.p
              role="alert"
              className="mt-3 rounded-xs border border-cc-bad/40 bg-cc-bad-soft px-3 py-2 text-xs text-cc-bad"
              initial={reduced ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              {state.error}
            </motion.p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-5 h-10 w-full rounded-sm bg-cc-accent text-sm font-medium text-cc-bg transition-colors hover:bg-cc-accent-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cc-accent disabled:opacity-60"
          >
            {pending ? "Verifying…" : "Enter"}
          </button>

          <p className="mt-4 text-center text-[0.6875rem] leading-relaxed text-cc-text-4">
            Sessions expire after 8 hours. Access is audited.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
