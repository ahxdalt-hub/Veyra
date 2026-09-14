import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";

/**
 * OfferProblem — recognition before the reveal.
 *
 * Six fragments, tagged by the phase they belong to: the visitor sees that
 * every scattered piece maps to a stage of one journey. The closing line
 * hands off to the system section. No fear copy, no insults — pure
 * recognition.
 */

const fragments = [
  { phase: "Build", problem: "Positioning", lives: "lives in one document." },
  { phase: "Acquire", problem: "Outreach", lives: "lives in another." },
  { phase: "Acquire", problem: "Follow-ups", lives: "live in someone's memory." },
  { phase: "Sell", problem: "Sales", lives: "happens differently every time." },
  { phase: "Deliver", problem: "Onboarding", lives: "depends on whoever is available." },
  { phase: "Retain", problem: "Retention", lives: "gets forgotten." },
  { phase: "Grow", problem: "Growth", lives: "becomes guesswork." },
];

export function OfferProblem() {
  return (
    <section className="border-b border-line bg-surface">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.35fr] lg:gap-16 xl:gap-24">
          <Reveal>
            <SectionHead
              eyebrow="The problem"
              title={
                <>
                  Your client-growth process shouldn&rsquo;t live in{" "}
                  <span className="em-serif">six different places.</span>
                </>
              }
              lead="Most service businesses already know what good execution looks like. The work isn't missing — it's scattered. And scattered work doesn't compound; it repeats."
            />
            <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-3">
              Every handoff between documents, tools, and memory is a place
              where the process stalls. Not because anyone is careless —
              because the process has no single home.
            </p>
          </Reveal>

          <div>
            <Reveal delay={0.08}>
              <ul className="divide-y divide-line border-y border-line">
                {fragments.map((f, i) => (
                  <Reveal
                    as="li"
                    key={f.problem}
                    delay={0.05 + i * 0.05}
                    className="group flex flex-wrap items-baseline gap-x-4 gap-y-1 py-4"
                  >
                    <span className="spec w-20 shrink-0 text-ink-4 transition-colors group-hover:text-accent">
                      {f.phase}
                    </span>
                    <span className="text-[0.9375rem] font-medium text-ink">
                      {f.problem}
                    </span>
                    <span className="text-sm text-ink-3">{f.lives}</span>
                  </Reveal>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-10 font-display text-2xl italic leading-snug text-ink sm:text-[1.75rem]">
                Veyra connects the process.
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-3">
                Every fragment above is a stage of the same journey — and the
                next section is that journey, in order.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
