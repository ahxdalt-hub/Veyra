import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Standard Practice builds ready-to-use business systems for consultants, freelancers, and small studios — and how each one is made.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About — Standard Practice", url: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
        eyebrow="About"
        title={
          <>
            We build the boring infrastructure
            <br />
            that makes client work <span className="em-serif">possible</span>.
          </>
        }
        lead="Standard Practice exists because the people who do excellent work rarely have excellent systems for getting it. We make the systems so you can stay in the work."
      />

      <div className="bg-surface">
        <div className="container-page py-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
            <div className="space-y-6">
              <Reveal>
                <h2 className="text-display-2 text-[1.375rem]">
                  The premise is simple
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-2">
                  Most independent businesses run on memory and goodwill. That
                  works until it doesn&rsquo;t — a lead forgotten, a follow-up
                  that never happened, an onboarding that starts with chaos
                  instead of clarity. The fix isn&rsquo;t more effort. It&rsquo;s
                  a standard, written-down way of doing the work that precedes
                  the work.
                </p>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-2">
                  Every system we sell is one we structure, test, and refine
                  until it runs without explanation. You download it, duplicate
                  it, and start operating it the same day. No consultants, no
                  configuration calls, no retainer.
                </p>
              </Reveal>

              <Reveal delay={0.05}>
                <h2 className="text-display-2 text-[1.375rem]">
                  What we will never do
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-2">
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="text-accent">—</span>
                    Publish fabricated testimonials or invented results.
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="text-accent">—</span>
                    Sell a framework so abstract it needs a workshop to use.
                  </li>
                  <li className="flex gap-3">
                    <span aria-hidden="true" className="text-accent">—</span>
                    Pretend a subscription you don&rsquo;t need is infrastructure.
                  </li>
                </ul>
              </Reveal>
            </div>

            <Reveal delay={0.1}>
              <div className="rounded-md border border-line bg-paper p-6">
                <h2 className="text-display-2 text-[1.25rem]">
                  How systems are made
                </h2>
                <ol className="mt-5 space-y-5">
                  {[
                    { n: "01", t: "Map the real workflow", d: "Start from how client acquisition actually runs in a small practice — not enterprise theory." },
                    { n: "02", t: "Build in familiar tools", d: "Notion and Google Sheets: free, portable, no lock-in." },
                    { n: "03", t: "Test for clarity", d: "If a structure needs a training video, it gets simplified before it ships." },
                    { n: "04", t: "Ship with a checklist", d: "Every system includes a setup sequence so day one is unambiguous." },
                  ].map((s) => (
                    <li key={s.n} className="flex gap-4">
                      <span className="spec shrink-0 pt-1 text-ink-4">{s.n}</span>
                      <span>
                        <span className="block text-sm font-medium text-ink">{s.t}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-ink-3">{s.d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-6">
                <Button href="/shop" variant="outline" size="md" arrow>
                  See what we&rsquo;ve built
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
