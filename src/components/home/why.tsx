import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import { ClockIcon, LayersIcon, PipelineIcon, ShieldIcon } from "@/components/ui/icons";

/**
 * Why — Section F.
 * Four real differentiators. A two-column editorial ledger — statement
 * left, explanation right — instead of a four-card row.
 */

const reasons = [
  {
    icon: LayersIcon,
    claim: "Ready to run, not ready to assemble",
    body: "Every system ships complete: structures, rules, and a working rhythm for each stage. You don't configure a framework — you start operating a finished system.",
  },
  {
    icon: PipelineIcon,
    claim: "The whole journey, connected",
    body: "Most products solve one slice — outreach here, proposals there. Veyra systems cover the full journey from positioning to growth review, so the parts actually fit.",
  },
  {
    icon: ClockIcon,
    claim: "Built for consistent execution",
    body: "The point isn't more information — it's the same process every week. Structured phases and defined next steps replace memory and motivation.",
  },
  {
    icon: ShieldIcon,
    claim: "Yours after one payment",
    body: "A one-time purchase with a licence for your whole business, and future revisions included. No subscription pretending to be infrastructure.",
  },
];

export function Why() {
  return (
    <section className="border-b border-line bg-paper">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <SectionHead
            eyebrow="Why these systems"
            title="Built to be used this week, not admired."
          />
        </Reveal>

        <Stagger className="mt-14 grid gap-x-16 gap-y-12 lg:grid-cols-2">
          {reasons.map((r) => (
            <StaggerItem key={r.claim} className="flex gap-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line bg-surface">
                <r.icon className="h-5 w-5 text-accent" />
              </span>
              <div>
                <h3 className="text-[1.0625rem] font-medium text-ink">
                  {r.claim}
                </h3>
                <p className="mt-2.5 max-w-md text-sm leading-relaxed text-ink-3">
                  {r.body}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
