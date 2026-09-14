"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import type { ReactNode } from "react";
import { PhasePreview } from "@/components/product/phase-preview";
import { ModulePreview } from "@/components/product/module-preview";
import { useMotionPreference } from "@/components/motion/reveal";

/**
 * OfferExperience — the product, shown as a product.
 *
 * A dark, quiet "studio" band: two large views from inside the system
 * (a phase and its modules; a module's guided worksheet), composed with
 * a slight editorial offset and ±10px of scroll parallax. The previews
 * are light windows on the dark surface — the screens are the content.
 * Parallax and entrance motion are disabled entirely under
 * prefers-reduced-motion (post-hydration swap — see useMotionPreference).
 */

const EASE = [0.16, 1, 0.3, 1] as const;

function Parallax({
  children,
  range = 10,
  className = "",
}: {
  children: ReactNode;
  range?: number;
  className?: string;
}) {
  const reduced = useMotionPreference();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [range, -range]);

  return (
    <div ref={ref} className={className}>
      {reduced ? (
        children
      ) : (
        <motion.div style={{ y }}>{children}</motion.div>
      )}
    </div>
  );
}

function Caption({ label, text }: { label: string; text: string }) {
  return (
    <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="spec text-paper/40">{label}</span>
      <span className="max-w-md text-xs leading-relaxed text-paper/60">
        {text}
      </span>
    </p>
  );
}

export function OfferExperience() {
  const reduced = useMotionPreference();

  return (
    <section className="relative overflow-hidden bg-ink text-paper">
      {/* Faint drafting grid — the storefront texture, inverted */}
      <div
        aria-hidden="true"
        className="cc-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
      />

      <div className="container-page relative py-20 sm:py-24 lg:py-32">
        {reduced ? (
          <div className="max-w-2xl">
            <p className="spec text-paper/40">The product experience</p>
            <h2 className="mt-4 text-display-1 text-paper">
              A working product you open on a Monday morning.
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-[1.65] text-paper/80 sm:text-[1.1875rem]">
              Two views from inside the Client Growth System — a phase and
              its modules, and the guided workflow inside one module.
              Everything shown is the system&rsquo;s actual structure.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px 0px" }}
            transition={{ duration: 0.6, ease: EASE }}
            className="max-w-2xl"
          >
            <p className="spec text-paper/40">The product experience</p>
            <h2 className="mt-4 text-display-1 text-paper">
              A working product you open on a Monday morning.
            </h2>
            <p className="mt-5 text-[1.0625rem] leading-[1.65] text-paper/80 sm:text-[1.1875rem]">
              Two views from inside the Client Growth System — a phase and
              its modules, and the guided workflow inside one module.
              Everything shown is the system&rsquo;s actual structure.
            </p>
          </motion.div>
        )}

        {/* View 1 — phase */}
        {reduced ? (
          <div className="mt-14 lg:mt-16">
            <div className="max-w-4xl">
              <PhasePreview />
            </div>
            <Caption
              label="Phase view"
              text="Acquire, with its three modules and an honest account of what the phase produces."
            />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px 0px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-14 lg:mt-16"
          >
            <Parallax range={8} className="max-w-4xl">
              <PhasePreview />
            </Parallax>
            <Caption
              label="Phase view"
              text="Acquire, with its three modules and an honest account of what the phase produces."
            />
          </motion.div>
        )}

        {/* View 2 — module, offset for an editorial rhythm */}
        {reduced ? (
          <div className="mt-14 lg:mt-20">
            <div className="lg:ml-auto lg:max-w-3xl">
              <ModulePreview />
            </div>
            <Caption
              label="Module view"
              text="Follow-up, opened as a guided worksheet — set the cadence once, then run it every week."
            />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px 0px" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-14 lg:mt-20"
          >
            <Parallax range={-8} className="lg:ml-auto lg:max-w-3xl">
              <ModulePreview />
            </Parallax>
            <Caption
              label="Module view"
              text="Follow-up, opened as a guided worksheet — set the cadence once, then run it every week."
            />
          </motion.div>
        )}

        {reduced ? (
          <p className="mt-14 max-w-xl border-t border-paper/15 pt-6 text-xs leading-relaxed text-paper/50">
            Rendered from the system&rsquo;s real structure — twelve modules
            across six phases. Shown at the starting state you&rsquo;ll see
            on day one: nothing pre-filled, everything ready to run.
          </p>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-14 max-w-xl border-t border-paper/15 pt-6 text-xs leading-relaxed text-paper/50"
          >
            Rendered from the system&rsquo;s real structure — twelve modules
            across six phases. Shown at the starting state you&rsquo;ll see
            on day one: nothing pre-filled, everything ready to run.
          </motion.p>
        )}
      </div>
    </section>
  );
}
