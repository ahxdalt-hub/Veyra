import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/motion/reveal";
import { AuditForm } from "@/components/resources/audit-form";
import { Button } from "@/components/ui/button";
import { ChartIcon, CheckIcon, DocIcon, DownloadIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Free, practical resources from Veyra — the interactive Growth Audit and the 25-Point Client Acquisition Audit. No drip campaigns.",
  alternates: { canonical: "/resources" },
  openGraph: { title: "Resources — Veyra", url: "/resources" },
};

export default function ResourcesPage() {
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Resources" }]}
        eyebrow="Resources"
        title="Free things that are actually useful."
        lead="One interactive tool, one checklist, one email each. We publish resources when we have something worth using — not on a content calendar."
      />

      {/* Featured — the interactive audit */}
      <section id="growth-audit" className="scroll-mt-24 border-b border-line bg-accent-soft/60">
        <div className="container-page py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <span className="flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface">
                <ChartIcon className="h-5 w-5 text-accent" />
              </span>
              <h2 className="text-display-1 mt-6">The Growth Audit</h2>
              <p className="mt-5 max-w-lg text-lead">
                Answer 18 questions, get a live score across the six phases of
                client growth — and a fix-first list you can act on today.
                Takes about three minutes.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
                {[
                  "Scored instantly, in your browser",
                  "Free to claim — yours to keep in your library",
                  "Maps every gap to the module that fixes it",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-md border border-line bg-surface p-6 shadow-sm sm:p-8">
                <h3 className="text-display-2 text-[1.25rem]">
                  Score your business
                </h3>
                <p className="mt-2 text-sm text-ink-3">
                  18 questions, six phases, one honest number. It&rsquo;s also
                  a real product — claim it free into your account and keep
                  the full report, licence included.
                </p>
                <div className="mt-6">
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full"
                    arrow
                    href="/products/growth-audit"
                  >
                    Claim the audit — 3 minutes
                  </Button>
                </div>
                <p className="mt-4 text-center text-xs text-ink-4">
                  Free. Needs a Veyra account — no card, no drip campaign.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* The static checklist */}
      <section id="audit" className="scroll-mt-24 border-b border-line bg-surface">
        <div className="container-page py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <span className="flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-paper">
                <DocIcon className="h-5 w-5 text-accent" />
              </span>
              <h2 className="text-display-1 mt-6">
                The 25-Point Client Acquisition Audit
              </h2>
              <p className="mt-5 max-w-lg text-lead">
                A single-page checklist that shows exactly where your client
                pipeline leaks — leads, follow-ups, proposals, onboarding.
                Twenty minutes, honestly answered, gives you your to-do list
                for the next quarter.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
                {[
                  "Covers the full journey: first contact to running engagement",
                  "Each point is a yes/no — no scoring math required",
                  "Ends with a prioritized fix-first list",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <DownloadIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.1}>
              <AuditForm />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Placeholder architecture for future resources */}
      <section className="bg-paper">
        <div className="container-page py-16">
          <Reveal>
            <h2 className="text-display-2 text-[1.375rem]">Coming next</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink-3">
              Resources are added when they&rsquo;re genuinely ready — no
              publishing schedule, no filler. Today that means the interactive
              Growth Audit above and the checklist beside it.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
