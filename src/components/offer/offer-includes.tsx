import {
  getFeaturedProduct,
  phaseMeta,
  PHASE_ORDER,
  type Phase,
} from "@/lib/products";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";
import { DocIcon, LayersIcon, PipelineIcon } from "@/components/ui/icons";

/**
 * OfferIncludes — what the customer actually receives.
 *
 * The flagship's twelve modules as a phase-grouped ledger (the same data
 * the shop and product pages read), plus the three system-wide properties
 * that make it operable. No invented capabilities — everything here maps
 * to the catalog.
 */

const systemWide = [
  {
    icon: LayersIcon,
    title: "Guided workflows",
    body: "Every module is a sequence of steps to complete — structure you operate, not prose you read.",
  },
  {
    icon: PipelineIcon,
    title: "Progress tracking",
    body: "Each phase shows where you are and what comes next, so the process never lives only in memory.",
  },
  {
    icon: DocIcon,
    title: "Reusable frameworks",
    body: "Decisions and reference points you set once — and apply to every client, every week, every review.",
  },
];

export function OfferIncludes() {
  const product = getFeaturedProduct();

  const byPhase = PHASE_ORDER.map((phase) => ({
    phase,
    modules: product.modules.filter((m) => m.phase === phase),
  })).filter((g) => g.modules.length > 0);

  const numbered = byPhase.reduce<
    { phase: Phase; name: string; purpose: string; n: number }[]
  >((acc, group) => {
    group.modules.forEach((m) =>
      acc.push({ phase: group.phase, name: m.name, purpose: m.purpose, n: acc.length + 1 })
    );
    return acc;
  }, []);

  return (
    <section
      id="inside"
      className="scroll-mt-24 border-b border-line bg-paper"
    >
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <SectionHead
            eyebrow="What you get"
            title={
              <>
                One system. Six stages.{" "}
                <span className="em-serif">A repeatable process.</span>
              </>
            }
            lead="Twelve modules, organized by the stage of growth they serve — the decisions to make, the workflows to run, and the order to run them in."
          />
        </Reveal>

        {/* Module ledger, grouped by phase */}
        <div className="mt-14 divide-y divide-line border-y border-line">
          {byPhase.map(({ phase, modules }, gi) => (
            <Reveal key={phase} delay={gi * 0.04}>
              <div className="grid gap-4 py-8 lg:grid-cols-[14rem_1fr] lg:gap-12">
                <div className="flex items-baseline gap-3 lg:block">
                  <h3 className="font-display text-xl italic text-accent">
                    {phaseMeta[phase].label}
                  </h3>
                  <p className="max-w-[13rem] text-xs leading-relaxed text-ink-3 lg:mt-1.5">
                    {phaseMeta[phase].blurb}
                  </p>
                </div>
                <ul className="grid gap-x-10 sm:grid-cols-2">
                  {modules.map((m) => {
                    const item = numbered.find((x) => x.name === m.name);
                    return (
                      <li
                        key={m.name}
                        className="flex items-baseline gap-3 border-b border-line/60 py-3.5 sm:first:pt-0"
                      >
                        <span className="spec tnum shrink-0 text-ink-4">
                          {String(item?.n ?? 0).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="text-[0.9375rem] font-medium text-ink">
                            {m.name}
                          </p>
                          <p className="mt-0.5 text-sm text-ink-3">
                            {m.purpose}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        {/* System-wide properties */}
        <Stagger className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {systemWide.map((f) => (
            <StaggerItem key={f.title}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface">
                <f.icon className="h-4.5 w-4.5 text-accent" />
              </div>
              <h3 className="mt-4 text-[1.0625rem] font-medium text-ink">
                {f.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-3">
                {f.body}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
