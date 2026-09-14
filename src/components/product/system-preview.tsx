import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * SystemPreview — the hero's product visual.
 *
 * A realistic miniature of the Client Growth System's journey view:
 * sidebar of phases, and the six-phase journey with its modules.
 * Rendered in code — crisp at any density, zero image payload, and
 * honest (a system wireframe, not a fabricated screenshot full of
 * invented metrics).
 */

const phases = [
  { name: "Build", items: ["Foundation", "Positioning", "Offer", "Ideal Client"] },
  { name: "Acquire", items: ["Strategy", "Outreach", "Follow-up"] },
  { name: "Sell", items: ["Sales", "Proposals"] },
  { name: "Deliver", items: ["Onboarding"] },
  { name: "Retain", items: ["Retention"] },
  { name: "Grow", items: ["Growth Review"] },
];

export function SystemPreview({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-lg border border-line bg-surface shadow-md ${className}`}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="spec truncate text-ink-4">
          Client Growth System — Journey
        </span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-40 shrink-0 border-r border-line bg-paper py-4 sm:block">
          <p className="spec px-4 pb-3 text-ink-4">System</p>
          <ul className="space-y-1">
            {["Overview", ...phases.map((p) => p.name)].map((item) => (
              <li key={item}>
                <span
                  className={`block px-4 py-1.5 text-xs ${
                    item === "Overview"
                      ? "rounded-xs bg-accent-soft font-medium text-accent-ink"
                      : "text-ink-3"
                  }`}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-line px-4 pt-3">
            <p className="spec text-ink-4">12 modules</p>
          </div>
        </div>

        {/* Journey */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {phases.map((phase, i) => (
              <div
                key={phase.name}
                className="rounded-xs border border-line bg-paper px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="spec tnum text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.6875rem] font-medium text-ink">
                      {phase.name}
                    </span>
                  </span>
                  {i < phases.length - 1 ? (
                    <ArrowRightIcon className="h-2.5 w-2.5 text-ink-4" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                  )}
                </div>
                <ul className="mt-2 space-y-1">
                  {phase.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-1.5 text-[0.625rem] text-ink-3"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-line pt-2.5 text-[0.625rem] text-ink-4">
            One journey, six phases — each phase feeds the next.
          </p>
        </div>
      </div>
    </div>
  );
}
