"use client";

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { STAGES } from "@/cgs-demo/lib/stages";
import { useBuildProgress } from "@/cgs-demo/lib/store";
import { Reveal, StatusBadge, StepRail, SectionTitle } from "@/cgs-demo/components/ui";

export default function BuildOverview() {
  const { modules } = useBuildProgress();
  const build = STAGES[0];
  return (
    <div className="mx-auto max-w-[1080px] px-6 py-7 md:px-9">
      <Reveal>
        <p className="text-[12px] text-cgs-faint">Stage 01</p>
        <h2 className="mt-1 font-cgs-display text-[26px] font-semibold leading-tight text-cgs-ink">Build</h2>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-cgs-ink-soft">{build.summary}</p>
      </Reveal>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {modules.map((m, i) => (
          <Reveal key={m.id} delay={0.05 + i * 0.05}>
            <Link
              href={m.meta.href}
              className="group flex h-full flex-col rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card transition-all duration-150 hover:border-cgs-line-strong hover:shadow-cgs-pop"
            >
              <div className="flex items-center justify-between">
                <span className="font-cgs-display text-[20px] font-semibold tabular-nums text-cgs-faint group-hover:text-cgs-accent transition-colors">
                  0{m.meta.step}
                </span>
                <StatusBadge status={m.status} />
              </div>
              <h3 className="mt-3 text-[15px] font-semibold text-cgs-ink">{m.meta.title}</h3>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-cgs-muted">{m.meta.tagline}</p>
              <div className="mt-4">
                <StepRail filled={m.filled} total={m.total} status={m.status} />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.25}>
        <div className="mt-8 rounded-xl border border-cgs-line bg-cgs-inset/50 px-5 py-4">
          <SectionTitle>How the stages connect</SectionTitle>
          <p className="mt-2 text-[13px] leading-relaxed text-cgs-ink-soft">
            Each module in Build feeds the next stage: Foundation is the context everything reads, Positioning
            becomes your outreach message, the Offer anchors sales conversations, and the Ideal Client profile is
            what Acquire targets and Sell qualifies against — both stages are open now and read your latest
            answers directly. Complete them in order, or return and refine.
          </p>
          <Link
            href={dHref("/acquire/strategy")}
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-cgs-accent hover:text-cgs-accent-deep"
          >
            Put BUILD to work in Acquire →
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
