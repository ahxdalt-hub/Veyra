import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * PhasePreview — "Product Experience" visual #1.
 *
 * The Acquire phase of the Client Growth System at its starting state:
 * the phase brief, its three modules with honest statuses, and what the
 * phase produces. Structural only — no invented client data.
 */

const modules = [
  {
    n: "01",
    name: "Acquisition Strategy",
    purpose: "One plan instead of scattered attempts",
  },
  {
    n: "02",
    name: "Outreach",
    purpose: "Conversations you can sustain",
  },
  {
    n: "03",
    name: "Follow-up",
    purpose: "Nothing slips after the first reply",
  },
];

const produces = [
  "A weekly acquisition rhythm",
  "Outreach you can sustain",
  "A next touch and date for every open thread",
];

export function PhasePreview({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-lg border border-line bg-surface shadow-lg ${className}`}
    >
      {/* Chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-2.5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="spec truncate text-ink-4">
            Client Growth System — Phase 02 · Acquire
          </span>
        </span>
        <span className="spec hidden shrink-0 text-ink-4 sm:inline-block">2 of 6</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_13.5rem]">
        {/* Module ledger */}
        <div className="min-w-0 border-b border-line lg:border-b-0 lg:border-r">
          <div className="border-b border-line px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-display text-lg italic text-ink">Acquire</h4>
              <span className="spec tnum text-ink-4">0 of 3 modules run</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">
              A strategy and cadence for finding and starting conversations.
            </p>
          </div>
          <ul className="divide-y divide-line/70">
            {modules.map((m) => (
              <li
                key={m.n}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-accent-soft/40 sm:px-5"
              >
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="spec tnum shrink-0 text-accent">{m.n}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.8125rem] font-medium text-ink">
                      {m.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-3">
                      {m.purpose}
                    </p>
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-2.5">
                  <span className="spec rounded-full border border-line bg-paper px-2 py-0.5 text-ink-4">
                    Not started
                  </span>
                  <ArrowRightIcon className="h-3 w-3 text-ink-4" />
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* What this phase produces */}
        <div className="bg-paper px-4 py-4 sm:px-5 lg:py-5">
          <p className="spec text-ink-4">What this phase produces</p>
          <ul className="mt-3 space-y-2.5">
            {produces.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-accent"
                />
                <span className="text-xs leading-relaxed text-ink-2">{p}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-[0.625rem] leading-relaxed text-ink-4">
            Phase 03 — Sell — takes over the moment a conversation becomes a
            deal worth pursuing.
          </p>
        </div>
      </div>
    </div>
  );
}
