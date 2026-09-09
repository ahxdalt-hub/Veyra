/**
 * FeaturedPreview — the flagship product's detailed preview.
 *
 * A fuller rendition of the Client Acquisition System's lead sheet:
 * lead rows with source, fit score, next action, and due day.
 * Code-rendered — sharp, light, honest. The "sample data" note keeps
 * it trustworthy.
 */

const rows = [
  { name: "Meridian Studio", source: "Referral", fit: "A", next: "Send intro", due: "Tue" },
  { name: "Harbor Creative", source: "Outreach", fit: "A", next: "Send recap", due: "Wed" },
  { name: "Bolt & Bracket", source: "Website", fit: "B", next: "Follow up · day 4", due: "Thu" },
  { name: "Fernway Group", source: "Outreach", fit: "A", next: "Nudge · day 7", due: "Fri" },
];

const headers = ["Lead", "Source", "Fit", "Next action", "Due"];

export function FeaturedPreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-md">
      {/* Chrome */}
      <div className="flex items-center justify-between border-b border-line bg-paper px-4 py-2.5">
        <span className="spec truncate text-ink-4">
          Lead Management — This week
        </span>
        <span className="spec text-ink-4">Week 37</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              {headers.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="spec px-4 py-2.5 font-medium text-ink-4"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.name}
                className={`border-b border-line/70 transition-colors hover:bg-accent-soft/50 ${
                  i === rows.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="whitespace-nowrap px-4 py-3 text-[0.8125rem] font-medium text-ink">
                  {row.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-3">
                  {row.source}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-xs text-[0.625rem] font-semibold ${
                      row.fit === "A"
                        ? "bg-accent-soft text-accent-ink"
                        : "bg-amber-soft text-amber"
                    }`}
                  >
                    {row.fit}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-2">
                  {row.next}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-4">
                  {row.due}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footnote */}
      <div className="border-t border-line bg-paper px-4 py-2">
        <p className="text-[0.625rem] text-ink-4">
          Sample data shown. Every system ships empty, ready for your leads.
        </p>
      </div>
    </div>
  );
}
