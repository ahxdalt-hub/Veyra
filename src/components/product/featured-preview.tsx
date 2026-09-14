/**
 * FeaturedPreview — the flagship product's phase-detail preview.
 *
 * A fuller rendition of one phase of the Client Growth System — the
 * Acquire phase and its modules — rendered in code. Structural by
 * design: it shows how the system is organized, with no invented
 * client data or metrics.
 */

const cadence = [
  { step: "Weekly rhythm", detail: "Choose channels and set the cadence" },
  { step: "Outreach blocks", detail: "Reference · one clear ask · personal note" },
  { step: "Follow-up rules", detail: "Every open thread gets a next touch + date" },
  { step: "Signals", detail: "What counts as working, reviewed monthly" },
];

export function FeaturedPreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-md">
      {/* Chrome */}
      <div className="flex items-center justify-between border-b border-line bg-paper px-4 py-2.5">
        <span className="spec truncate text-ink-4">
          Client Growth System — Acquire
        </span>
        <span className="spec text-ink-4">Phase 02</span>
      </div>

      {/* Module tabs */}
      <div className="flex gap-1 border-b border-line bg-paper/60 px-4 pt-2.5">
        {["Acquisition Strategy", "Outreach", "Follow-up"].map((tab, i) => (
          <span
            key={tab}
            className={`rounded-t-xs px-2.5 py-1.5 text-[0.6875rem] ${
              i === 0
                ? "border border-b-0 border-line bg-surface font-medium text-ink"
                : "text-ink-4"
            }`}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Cadence rows */}
      <ul className="divide-y divide-line/70">
        {cadence.map((row) => (
          <li
            key={row.step}
            className="flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-accent-soft/40"
          >
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-medium text-ink">
                {row.step}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
                {row.detail}
              </p>
            </div>
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
          </li>
        ))}
      </ul>

      {/* Footnote */}
      <div className="border-t border-line bg-paper px-4 py-2">
        <p className="text-[0.625rem] text-ink-4">
          One of six phases. Every module in the system is built to be run,
          not just read.
        </p>
      </div>
    </div>
  );
}
