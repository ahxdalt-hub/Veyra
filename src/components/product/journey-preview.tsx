import { PHASE_ORDER, phaseMeta } from "@/lib/products";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * JourneyPreview — the offer page's hero visual.
 *
 * The Client Growth System's journey view at its starting state: six
 * phases queued in order with Build underway, and the Positioning module
 * open as a guided set of steps. Rendered in code — crisp at any density,
 * zero image payload, and honest: it shows the system's structure, never
 * invented customer data or metrics.
 */

const guidedSteps = [
  "Who you serve",
  "What you're worth",
  "Why you over alternatives",
];

export function JourneyPreview({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-lg border border-line bg-surface text-left shadow-lg ${className}`}
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-2.5 sm:px-5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex shrink-0 gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="spec truncate text-ink-4">
            Client Growth System — Journey
          </span>
        </span>
        <span className="spec hidden rounded-full border border-line bg-surface px-2 py-0.5 text-ink-4 sm:inline-block">
          v1.0
        </span>
      </div>

      <div className="flex">
        {/* Sidebar — the six-phase journey, Build active */}
        <div className="hidden w-44 shrink-0 border-r border-line bg-paper py-4 md:block">
          <p className="spec px-5 pb-3 text-ink-4">Journey</p>
          <ul className="space-y-0.5">
            {PHASE_ORDER.map((phase, i) => {
              const active = i === 0;
              return (
                <li key={phase}>
                  <span
                    className={`flex items-baseline gap-2 px-5 py-1.5 text-xs ${
                      active
                        ? "bg-accent-soft font-medium text-accent-ink"
                        : "text-ink-3"
                    }`}
                  >
                    <span
                      className={`spec tnum ${
                        active ? "text-accent" : "text-ink-4"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {phaseMeta[phase].label}
                    {active ? (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-line px-5 pt-3.5">
            <p className="spec text-ink-4">12 modules · 6 phases</p>
            <p className="text-[0.625rem] leading-relaxed text-ink-4">
              Each phase feeds the next — the output of one is the input to
              the following.
            </p>
          </div>
        </div>

        {/* Main — journey board + open module */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
            <p className="text-[0.8125rem] font-medium text-ink">
              The client-growth journey
            </p>
            <p className="spec text-ink-4">Phase 1 of 6 · Build</p>
          </div>

          {/* Phase board */}
          <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3 sm:p-5">
            {PHASE_ORDER.map((phase, i) => {
              const active = i === 0;
              return (
                <div
                  key={phase}
                  className={`rounded-xs border px-3 py-2.5 ${
                    active
                      ? "border-accent/40 bg-accent-soft/60"
                      : "border-line bg-paper"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-baseline gap-1.5">
                      <span
                        className={`spec tnum ${
                          active ? "text-accent" : "text-ink-4"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[0.6875rem] font-medium text-ink">
                        {phaseMeta[phase].label}
                      </span>
                    </span>
                    {i < PHASE_ORDER.length - 1 ? (
                      <ArrowRightIcon className="h-2.5 w-2.5 shrink-0 text-ink-4" />
                    ) : (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    )}
                  </div>
                  <p className="mt-1.5 text-[0.625rem] leading-relaxed text-ink-3">
                    {active ? "In progress" : "Upcoming"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Open module — the guided-workflow moment */}
          <div className="border-t border-line bg-paper px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="spec text-ink-4">
                Open module · Build — 02 Positioning
              </p>
              <span className="spec rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-accent-ink">
                In progress
              </span>
            </div>
            <p className="mt-2 text-[0.8125rem] font-medium text-ink">
              Say clearly what you&rsquo;re the best at
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {guidedSteps.map((step) => (
                <span
                  key={step}
                  className="inline-flex items-center gap-2 rounded-sm border border-line bg-surface px-2.5 py-1.5 text-[0.6875rem] text-ink-2"
                >
                  <span className="h-2.5 w-2.5 rounded-xs border border-line-strong" />
                  {step}
                </span>
              ))}
              <span className="ml-auto hidden items-center gap-1.5 rounded-sm bg-ink px-2.5 py-1.5 text-[0.6875rem] font-medium text-paper sm:inline-flex">
                Continue module
                <ArrowRightIcon className="h-2.5 w-2.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
