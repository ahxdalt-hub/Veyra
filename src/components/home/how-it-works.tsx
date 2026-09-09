import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import { DocIcon, DownloadIcon, LayersIcon } from "@/components/ui/icons";

/**
 * HowItWorks — Section E.
 * Three steps, presented as a connected flow — numbered stations along a
 * hairline track rather than boxed cards. Emphasis on effortlessness.
 */

const steps = [
  {
    n: "1",
    icon: LayersIcon,
    title: "Choose your system",
    body: "Pick the workflow you need most — acquisition, follow-up, pipeline, or onboarding. Each is self-contained; the flagship connects all of them.",
  },
  {
    n: "2",
    icon: DownloadIcon,
    title: "Download instantly",
    body: "Your files and template links arrive immediately after checkout. Duplicate the Notion workspace or copy the Sheet — you're set up in minutes.",
  },
  {
    n: "3",
    icon: DocIcon,
    title: "Put it into action",
    body: "Follow the setup checklist, move your current leads in, and run the weekly rhythm. The systems are pre-built so week one starts today.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-line bg-surface">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <SectionHead
            eyebrow="How it works"
            title="From download to running in an afternoon."
            lead="No consultants, no configuration marathon. The work of structuring the system is already done — you supply the leads."
          />
        </Reveal>

        <div className="relative mt-16">
          {/* Track */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-6 hidden h-px bg-line-strong lg:block"
          />
          <Stagger className="grid gap-12 sm:grid-cols-3 sm:gap-8 lg:gap-12">
            {steps.map((step) => (
              <StaggerItem key={step.n} className="relative">
                <div className="flex flex-col items-start">
                  {/* Station */}
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-line-strong bg-surface shadow-xs">
                    <step.icon className="h-5 w-5 text-accent" />
                  </div>
                  <p className="mt-6 spec text-ink-4">Step {step.n}</p>
                  <h3 className="mt-2.5 text-display-2 text-[1.25rem]">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-3">
                    {step.body}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
