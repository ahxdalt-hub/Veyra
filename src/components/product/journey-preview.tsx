import { ArrowRightIcon } from "@/components/ui/icons";
import { getProduct, PHASE_ORDER, phaseMeta } from "@/lib/products";

/**
 * JourneyPreview — the hero's product presentation.
 *
 * The Client Growth System desktop application at its starting state:
 * the six-phase journey in the sidebar, the journey board, and the
 * Positioning module open as a guided sequence — with the local-first
 * workspace status the application actually surfaces. Rendered in code
 * and clearly illustrative: it shows the real structure of the product
 * (phases, module counts from the catalog, the genuine positioning
 * steps), never invented customer data or metrics.
 *
 * Same layout as the current app: chrome bar, journey rail, board,
 * open-module panel — refreshed for the desktop release.
 */

/* Genuine module counts per phase, straight from the catalog. */
const product = getProduct("client-growth-system");
const moduleCounts = PHASE_ORDER.map(
  (phase) => product?.modules.filter((m) => m.phase === phase).length ?? 0
);

const guidedSteps = [
  { label: "Who you serve", done: true },
  { label: "What you're worth", done: false },
  { label: "Why you over alternatives", done: false },
];

export function JourneyPreview({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-lg border border-line bg-surface text-left shadow-lg ${className}`}
    >
      {/* Chrome bar — Windows desktop style */}
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper px-4 py-2.5 sm:px-5">
        <span className="flex min-w-0 items-center gap-3">
          {/* App mark */}
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-accent/30 bg-accent-soft">
            <span className="h-2 w-2 rotate-45 bg-accent/70" />
          </span>
          <span className="truncate text-xs font-medium text-ink-2">
            Client Growth System
          </span>
          <span aria-hidden="true" className="hidden text-ink-4 sm:inline">
            —
          </span>
          <span className="spec hidden truncate text-ink-4 sm:inline">
            Journey
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="hidden h-3.5 w-6 items-center justify-center rounded-sm bg-line/60 text-[9px] leading-none text-ink-3 md:inline-flex">
            –
          </span>
          <span className="hidden h-3.5 w-6 items-center justify-center rounded-sm bg-line/60 text-[8px] leading-none text-ink-3 md:inline-flex">
            ▢
          </span>
          <span className="flex h-3.5 w-6 items-center justify-center rounded-sm bg-line/60 text-[9px] leading-none text-ink-3">
            ✕
          </span>
        </span>
      </div>

      <div className="flex">
        {/* Sidebar — the journey rail */}
        <div className="hidden w-48 shrink-0 border-r border-line bg-paper py-4 md:block">
          {/* Workspace — local-first status, the app's actual model */}
          <div className="mx-4 rounded-sm border border-accent/20 bg-accent-soft/70 px-3 py-2.5">
            <p className="spec text-accent-ink">Workspace</p>
            <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-medium text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              On this device
            </p>
          </div>

          <p className="spec px-4 pb-2.5 pt-4 text-ink-4">Journey</p>
          <ul className="space-y-0.5 pr-2">
            {PHASE_ORDER.map((phase, i) => {
              const active = i === 0;
              return (
                <li key={phase}>
                  <span
                    className={`flex items-center gap-2 rounded-sm px-4 py-1.5 text-xs ${
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
                    <span className="ml-auto tnum text-[0.625rem] text-ink-4">
                      {moduleCounts[i]} module{moduleCounts[i] === 1 ? "" : "s"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
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
                    {active
                      ? `In progress · ${moduleCounts[i]} modules`
                      : `${moduleCounts[i]} module${moduleCounts[i] === 1 ? "" : "s"}`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Open module — the guided-workflow moment */}
          <div className="border-t border-line bg-paper px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="spec text-ink-4">
                Open module · Build — Positioning
              </p>
              <span className="spec rounded-full border border-accent/30 bg-accent-soft px-2 py-0.5 text-accent-ink">
                Step 1 of 3
              </span>
            </div>
            <p className="mt-2 text-[0.8125rem] font-medium text-ink">
              Say clearly what you&rsquo;re the best at
            </p>

            {/* Progress hairline */}
            <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-line">
              <div className="h-full w-1/3 rounded-full bg-accent/70" />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {guidedSteps.map((step) => (
                <span
                  key={step.label}
                  className={`inline-flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-[0.6875rem] ${
                    step.done
                      ? "border-accent/25 bg-accent-soft/70 text-ink-2"
                      : "border-line bg-surface text-ink-2"
                  }`}
                >
                  {step.done ? (
                    <svg
                      viewBox="0 0 10 10"
                      className="h-2.5 w-2.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1.5 5.5 4 8l4.5-6" />
                    </svg>
                  ) : (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-xs border border-line-strong" />
                  )}
                  {step.label}
                </span>
              ))}
              <span className="ml-auto hidden items-center gap-1.5 rounded-sm bg-ink px-2.5 py-1.5 text-[0.6875rem] font-medium text-paper sm:inline-flex">
                Continue module
                <ArrowRightIcon className="h-2.5 w-2.5" />
              </span>
            </div>

            {/* Footer — the local-first model, stated the way the app does */}
            <p className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line/70 pt-2.5 text-[0.625rem] leading-relaxed text-ink-4">
              <span className="h-1 w-1 shrink-0 rounded-full bg-accent/60" />
              Saved locally on this device
              <span aria-hidden="true" className="text-line-strong">·</span>
              Works offline after activation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
