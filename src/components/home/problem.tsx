import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "@/components/ui/section";

/**
 * Problem — Section B.
 * Pure recognition. Four symptoms the buyer already feels, written in
 * their language — no exaggeration, no fabrication. The layout is a
 * two-column ledger: symptoms left, the shift right.
 */

const symptoms = [
  {
    title: "Leads live in five places",
    body: "Some in your inbox, a few in a spreadsheet, one on a sticky note. When a lead doesn't move, you find out weeks later.",
  },
  {
    title: "Follow-ups happen when you remember",
    body: "The deal that felt promising goes quiet because 'I'll reply tomorrow' becomes never. No system, no reminder.",
  },
  {
    title: "Every proposal starts from scratch",
    body: "Your process lives in last month's documents and half-remembered habits — so every new client takes longer than it should.",
  },
  {
    title: "Nothing is repeatable",
    body: "Good months feel like luck. Without a system, you can't tell what worked, so you can't do it again on purpose.",
  },
];

export function Problem() {
  return (
    <section className="border-b border-line bg-paper">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.35fr] lg:gap-16 xl:gap-24">
          <div>
            <Reveal>
              <SectionHead
                eyebrow="Sound familiar?"
                title={
                  <>
                    You&rsquo;re good at the work.
                    <br />
                    The <span className="em-serif">getting the work</span> is
                    what&rsquo;s improvised.
                  </>
                }
              />
              <p className="mt-6 max-w-md text-lead">
                Most independent businesses don&rsquo;t lose clients to
                competition. They lose them to disorganization — quietly, between
                the first conversation and the signature.
              </p>
            </Reveal>
          </div>

          <div>
            <ul className="divide-y divide-line border-t border-line">
              {symptoms.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 0.06} className="group relative py-6 pl-14 sm:pl-16">
                  <span className="absolute left-0 top-7 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface spec text-ink-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[1.0625rem] font-medium text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-3">
                    {s.body}
                  </p>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={0.2}>
              <p className="mt-8 border-l-2 border-accent pl-5 text-[0.9375rem] font-medium text-ink-2">
                None of this is a talent problem. It&rsquo;s a systems problem —
                and systems can be downloaded.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
