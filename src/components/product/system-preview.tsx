import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * SystemPreview — the hero's product visual.
 *
 * A realistic miniature of the Client Acquisition System's Notion-style
 * pipeline board: sidebar, stages, lead cards with fit scores and next
 * actions. Rendered in code — crisp at any density, zero image payload,
 * and honest (a workspace wireframe, not a fabricated screenshot).
 */

const stages = [
  { name: "Inquiry", leads: [
    { name: "Meridian Studio", meta: "Referral · Fit B", action: "Send intro" },
    { name: "Bolt & Bracket", meta: "Outreach · Fit A", action: "Follow up" },
  ]},
  { name: "Conversation", leads: [
    { name: "Harbor Creative", meta: "Call held · Fit A", action: "Send recap" },
  ]},
  { name: "Proposal", leads: [
    { name: "Fernway Group", meta: "Pricing sent", action: "Nudge Friday" },
  ]},
  { name: "Signed", leads: [
    { name: "Alpine Legal", meta: "Contract in", action: "Kickoff" },
  ]},
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
          Client Acquisition System — Pipeline
        </span>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-40 shrink-0 border-r border-line bg-paper py-4 sm:block">
          <p className="spec px-4 pb-3 text-ink-4">Workspace</p>
          <ul className="space-y-1">
            {["Leads", "Outreach", "Follow-Up", "Pipeline", "Onboarding", "Analytics"].map(
              (item, i) => (
                <li key={item}>
                  <span
                    className={`block px-4 py-1.5 text-xs ${
                      item === "Pipeline"
                        ? "rounded-xs bg-accent-soft font-medium text-accent-ink"
                        : "text-ink-3"
                    }`}
                  >
                    {item}
                  </span>
                  {i === 2 ? (
                    <span className="mt-1 ml-4 block h-px w-8 bg-line" />
                  ) : null}
                </li>
              )
            )}
          </ul>
        </div>

        {/* Board */}
        <div className="grid flex-1 grid-cols-2 gap-3 p-4 lg:grid-cols-4">
          {stages.map((stage) => (
            <div key={stage.name} className="min-w-0">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[0.6875rem] font-medium text-ink-2">
                  {stage.name}
                </span>
                <span className="spec tnum text-ink-4">
                  {stage.leads.length}
                </span>
              </div>
              <ul className="space-y-2">
                {stage.leads.map((lead) => (
                  <li
                    key={lead.name}
                    className="rounded-xs border border-line bg-surface px-2.5 py-2 shadow-xs"
                  >
                    <p className="truncate text-[0.6875rem] font-medium text-ink">
                      {lead.name}
                    </p>
                    <p className="mt-0.5 truncate text-[0.625rem] text-ink-4">
                      {lead.meta}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1 text-[0.625rem] font-medium text-accent">
                      {lead.action}
                      <ArrowRightIcon className="h-2.5 w-2.5" />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
