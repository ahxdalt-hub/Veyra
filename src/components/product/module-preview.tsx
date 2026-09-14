import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * ModulePreview — "Product Experience" visual #2.
 *
 * The Follow-up module opened as a guided worksheet: the rule that governs
 * it, the decisions you set once (empty, ready to fill), and an honest
 * empty state for the working log. Shows what "guided workflow" means —
 * structure you operate, not prose you read.
 */

const cadenceRows = [
  { label: "Touch 1", hint: "Reply within…" },
  { label: "Touch 2", hint: "Add value — no chase…" },
  { label: "Touch 3", hint: "Close the loop…" },
];

export function ModulePreview({ className = "" }: { className?: string }) {
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
            Client Growth System — Acquire · 03 Follow-up
          </span>
        </span>
        <span className="spec hidden shrink-0 text-ink-4 sm:inline-block">
          Module 3 of 12
        </span>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {/* The governing rule */}
        <div className="border-l-2 border-accent bg-accent-soft/50 px-3.5 py-2.5">
          <p className="spec text-accent-ink">The rule</p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink">
            Every open conversation has a next touch and a date.
          </p>
        </div>

        {/* Set-once cadence */}
        <p className="spec mt-5 text-ink-4">Your follow-up cadence — set once</p>
        <div className="mt-2.5 space-y-2">
          {cadenceRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center gap-3 rounded-xs border border-line bg-paper px-3 py-2"
            >
              <span className="spec w-14 shrink-0 text-ink-3">
                {row.label}
              </span>
              <span className="h-5 flex-1 rounded-xs border border-dashed border-line-strong bg-surface" />
              <span className="hidden text-[0.625rem] text-ink-4 sm:block">
                {row.hint}
              </span>
            </div>
          ))}
        </div>

        {/* Working log — honest empty state */}
        <p className="spec mt-5 text-ink-4">Open conversations</p>
        <div className="mt-2.5 flex items-center justify-between rounded-xs border border-dashed border-line-strong bg-paper px-3.5 py-3.5">
          <p className="text-xs leading-relaxed text-ink-3">
            No open conversations yet — entries appear here as you run
            outreach.
          </p>
          <span className="spec ml-4 hidden shrink-0 rounded-full border border-line bg-surface px-2 py-0.5 text-ink-4 sm:inline-block">
            Empty
          </span>
        </div>
      </div>

      {/* Footer action bar */}
      <div className="flex items-center justify-between border-t border-line bg-paper px-4 py-2.5 sm:px-5">
        <p className="spec text-ink-4">Guided workflow · 4 steps</p>
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-ink px-2.5 py-1.5 text-[0.6875rem] font-medium text-paper">
          Save &amp; continue
          <ArrowRightIcon className="h-2.5 w-2.5" />
        </span>
      </div>
    </div>
  );
}
