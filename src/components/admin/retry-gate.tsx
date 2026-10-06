"use client";

/**
 * The "verification unavailable" screen — what an admin sees when the
 * role check could not be COMPLETED (a transient Supabase hiccup, not a
 * permission verdict). Reloading re-runs the gate in place; no sign-in
 * detour, nothing lost.
 */

export function RoleCheckRetry() {
  return (
    <div className="w-full max-w-sm">
      <div className="cc-emblem-in relative mb-10 flex items-center gap-3">
        <span className="relative flex h-11 w-11 items-center justify-center">
          <span
            aria-hidden="true"
            className="cc-ring-breathe absolute inset-0 rounded-full border"
            style={{ borderColor: "var(--cc-accent-line)" }}
          />
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border font-display text-lg italic"
            style={{
              borderColor: "var(--cc-accent-line)",
              color: "var(--cc-accent-ink)",
            }}
          >
            V
          </span>
        </span>
        <p className="cc-label cc-fade-x">Veyra Command Center</p>
      </div>

      <h1 className="text-display-2 mb-2" style={{ color: "var(--cc-text)" }}>
        One moment.
      </h1>
      <p
        className="mb-8 text-sm leading-relaxed"
        style={{ color: "var(--cc-text-3)" }}
      >
        The command center couldn&rsquo;t verify your access just now — a
        connection hiccup on our side, not a problem with your account.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="cc-label rounded-full border px-6 py-3 transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--cc-accent-line)", color: "var(--cc-text)" }}
      >
        Try again
      </button>
    </div>
  );
}
