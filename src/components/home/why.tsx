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
    claim: "Ready to use, not ready to assemble",
    body: "Every system ships complete: structures, rules, templates, and a setup checklist. You don't configure a framework — you duplicate a working setup.",
  },
  {
    icon: PipelineIcon,
    claim: "Built around real workflows",
    body: "The modules mirror how client acquisition actually runs: capture, qualify, reach out, follow up, close, onboard. Nothing theoretical, nothing decorative.",
  },
  {
    icon: ClockIcon,
    claim: "Respects your existing tools",
    body: "Notion and Google Sheets — free, familiar, and yours. No new platform to learn, no per-seat subscription, no vendor lock-in on your pipeline.",
  },
  {
    icon: ShieldIcon,
    claim: "Yours after one payment",
    body: "A one-time purchase with a licence for your whole business, plus quarterly updates included. The version you buy keeps improving.",
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
