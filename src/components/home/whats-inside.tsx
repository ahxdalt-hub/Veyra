import { getFeaturedProduct, phaseMeta, PHASE_ORDER, type Phase } from "@/lib/products";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";

/**
 * WhatsInside — Section D.
 * The flagship's twelve modules, laid out as a spec sheet — not a card grid.
 * A numbered ledger with hairline rules, grouped by the six phases of the
 * journey. Hover: row number fills accent. Rhythm over boxes.
 */

export function WhatsInside() {
  const product = getFeaturedProduct();

  // Modules grouped in journey order.
  const byPhase = PHASE_ORDER.map((phase) => ({
    phase,
    modules: product.modules.filter((m) => m.phase === phase),
  })).filter((g) => g.modules.length > 0);

  // Modules grouped in journey order, numbered continuously across phases.
  const numbered = byPhase.reduce<
    { phase: Phase; name: string; purpose: string; detail: string; n: number }[]
  >((acc, group) => {
    group.modules.forEach((m) =>
      acc.push({ ...m, phase: group.phase, n: acc.length + 1 })
    );
    return acc;
  }, []);

  return (
    <section className="border-b border-line bg-paper">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <SectionHead
            eyebrow={`Inside ${product.name}`}
            title={
              <>
                Twelve connected modules.
                <br />
                Six <span className="em-serif">phases</span>. One system.
              </>
            }
            lead="Each module owns one piece of the client-growth journey. Together they form a system with no gaps — get it once, run your business on it."
          />
        </Reveal>

        <Stagger className="mt-14 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {numbered.map((m) => (
            <StaggerItem
              key={m.name}
              className="group relative bg-paper p-6 transition-colors duration-300 hover:bg-accent-soft/50 lg:p-7"
            >
              <div className="flex items-baseline justify-between">
                <span className="spec text-ink-4 transition-colors group-hover:text-accent tnum">
                  {String(m.n).padStart(2, "0")}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-line-strong transition-colors duration-300 group-hover:bg-accent" />
              </div>
              <p className="mt-5 spec text-accent-ink">
                {phaseMeta[m.phase].label}
              </p>
              <h3 className="mt-1.5 text-[1.0625rem] font-medium text-ink">
                {m.name}
              </h3>
              <p className="mt-1.5 text-xs font-medium text-accent">
                {m.purpose}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-3">
                {m.detail}
              </p>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.15}>
          <p className="mt-8 text-xs text-ink-4">
            The phases run in order — Build → Acquire → Sell → Deliver →
            Retain → Grow — and each one feeds the next, so the system works
            as one journey rather than twelve disconnected tools.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
