import { getFeaturedProduct } from "@/lib/products";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";

/**
 * WhatsInside — Section D.
 * The flagship's six modules, laid out as a spec sheet — not a card grid.
 * A numbered ledger with hairline rules; the first module spans wider as
 * an anchor. Hover: row number fills accent. Rhythm over boxes.
 */

const moduleIcons: Record<string, string> = {
  "Lead Management": "01",
  Outreach: "02",
  "Follow-Up": "03",
  "Sales Pipeline": "04",
  "Client Onboarding": "05",
  Analytics: "06",
};

export function WhatsInside() {
  const product = getFeaturedProduct();

  return (
    <section className="border-b border-line bg-paper">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <Reveal>
          <SectionHead
            eyebrow={`Inside ${product.name}`}
            title={
              <>
                Six connected modules.
                <br />
                One <span className="em-serif">working</span> system.
              </>
            }
            lead="Each module solves one stage of client acquisition. Together they form a pipeline with no gaps — download once, run every week."
          />
        </Reveal>

        <Stagger className="mt-14 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {product.modules.map((m) => (
            <StaggerItem
              key={m.name}
              className="group relative bg-paper p-6 transition-colors duration-300 hover:bg-accent-soft/50 lg:p-7"
            >
              <div className="flex items-baseline justify-between">
                <span className="spec text-ink-4 transition-colors group-hover:text-accent">
                  {moduleIcons[m.name] ?? ""}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-line-strong transition-colors duration-300 group-hover:bg-accent" />
              </div>
              <h3 className="mt-5 text-[1.0625rem] font-medium text-ink">
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
            Modules are connected — a lead you add in Lead Management appears in
            your Pipeline and triggers Follow-Up rules automatically.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
