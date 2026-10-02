"use client";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { SparkIcon } from "@/components/ui/icons";
import { playSfx } from "@/lib/sound";

/**
 * CgsDemo — the "Try Live Demo" section.
 *
 * The button opens the real interactive demo at /demo/client-growth-system:
 * a self-contained workspace with a fictional studio's data, all six stages
 * explorable, and mutating actions answered by a contextual unlock panel.
 * The demo route carries its own shell (no site chrome), so this section
 * only has to hand the visitor over — with a sound only after a gesture,
 * per the autoplay policy.
 */

export function CgsDemo() {
  return (
    <section
      id="demo"
      className="scroll-mt-24 border-y border-line bg-accent-soft text-ink"
      aria-labelledby="demo-heading"
    >
      <div className="relative container-page overflow-hidden py-20 sm:py-24 lg:py-28">
        {/* Faint drafting grid on the champagne band — house texture */}
        <div
          aria-hidden="true"
          className="bg-blueprint-faint absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]"
        />
        <Reveal className="relative">
          {/* Bordered bronze frame — the house detail for offer moments */}
          <div className="relative mx-auto max-w-3xl rounded-lg border border-accent/25 bg-surface/60 px-6 py-14 text-center shadow-sm sm:px-10 lg:py-16">
            <span aria-hidden="true" className="absolute left-4 top-4 h-3 w-3 border-l border-t border-accent/45" />
            <span aria-hidden="true" className="absolute right-4 top-4 h-3 w-3 border-r border-t border-accent/45" />
            <span aria-hidden="true" className="absolute bottom-4 left-4 h-3 w-3 border-b border-l border-accent/45" />
            <span aria-hidden="true" className="absolute bottom-4 right-4 h-3 w-3 border-b border-r border-accent/45" />

            <p className="text-eyebrow">Live demo</p>
            {/* Bronze rule with a centered spark — a quiet divider */}
            <p aria-hidden="true" className="mx-auto mt-6 flex max-w-xs items-center gap-3">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-accent/40" />
              <span className="h-1.5 w-1.5 rotate-45 border border-accent/50 bg-accent-soft" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-accent/40" />
            </p>
            <h2 id="demo-heading" className="mt-6 text-display-1">
              See the system{" "}
              <span className="em-serif text-accent">in action.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lead">
              Step into a working example — explore all six stages, open real
              records, and meet the next-action engine. No account needed.
            </p>
            <div className="mt-9">
              <Button
                variant="primary"
                size="lg"
                href="/demo/client-growth-system"
                onClick={() => playSfx("unlock")}
                arrow
              >
                <SparkIcon className="h-4 w-4 text-amber" />
                Try the live demo
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
