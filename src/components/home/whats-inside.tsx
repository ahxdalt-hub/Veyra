import { getFeaturedProduct, phaseMeta, PHASE_ORDER, type Phase } from "@/lib/products";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";

/**
 * WhatsInside — SHORT VERSION.
 * Show only top 6 key modules instead of all 12 to keep the page concise and focused.
 */

export function WhatsInside() {
  const product = getFeaturedProduct();

  // Modules grouped in journey order.
  const byPhase = PHASE_ORDER.map((phase) => ({
    phase,
    modules: product.modules.filter((m) => m.phase === phase),
  })).filter((g) => g.modules.length > 0);

  // Use ALL modules but show only first 6 for brevity
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
            lead="Get it once, run your business on it."
          />
        </Reveal>

        {/* Show only top 6 key modules to keep it short */}
        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {numbered.slice(0, 6).map((m, i) => (
            <StaggerItem
              key={m.name}
              className="group relative overflow-hidden rounded-xl border border-line bg-paper p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-sm"
            >
              {/* Animation delay wrapper */}
              <div style={{ animationDelay: `${i * 80}ms` }} className="animate-rise">
                {/* Module number badge */}
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white text-sm font-bold">
                  {String(m.n).padStart(2, "0")}
                </div>
                
                {/* Phase tag */}
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">
                  {phaseMeta[m.phase].label}
                </p>
                
                <h3 className="mt-2 text-lg font-semibold text-ink">{m.name}</h3>
                <p className="mt-2 text-sm font-medium text-ink-3 leading-relaxed">
                  {m.purpose}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Short disclaimer with link to learn more */}
        <Reveal delay={0.15}>
          <p className="mt-8 text-sm text-center text-ink-3">
            Complete system includes all 12 modules across 6 phases. 
            <a href="/products/client-growth-system" className="ml-1 underline hover:text-accent">
              Learn more →
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
