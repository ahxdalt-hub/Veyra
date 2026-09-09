import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";

/**
 * Section — the rhythmic unit of the page.
 * One vertical rhythm everywhere: py-20 / py-28 / py-36 (mobile → lg).
 * `tone` swaps the background band: paper | surface | accent-soft | ink.
 * `id` is exposed for in-page anchors (e.g. /#faq).
 */

type Tone = "paper" | "surface" | "accent-soft" | "ink";

const toneClasses: Record<Tone, string> = {
  paper: "bg-paper",
  surface: "bg-surface border-y border-line",
  "accent-soft": "bg-accent-soft border-y border-line",
  ink: "bg-ink text-paper",
};

export function Section({
  id,
  tone = "paper",
  className = "",
  children,
  reveal = true,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
  reveal?: boolean;
}) {
  const inner = reveal ? (
    <Reveal className="container-page">{children}</Reveal>
  ) : (
    <div className="container-page">{children}</div>
  );

  return (
    <section
      id={id}
      className={`${toneClasses[tone]} py-20 sm:py-24 lg:py-28 ${className}`}
    >
      {inner}
    </section>
  );
}

/**
 * SectionHead — the standard section opening.
 * Eyebrow (mono, uppercase) + display headline + optional lead.
 * Left-aligned by default; centered available for closing CTA blocks.
 */

export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={`${
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-3xl"
      } ${className}`}
    >
      {eyebrow ? (
        <p className="text-eyebrow mb-4">{eyebrow}</p>
      ) : null}
      <h2 className="text-display-1">{title}</h2>
      {lead ? (
        <p
          className={`mt-5 text-lead ${
            align === "center" ? "mx-auto max-w-xl" : "max-w-2xl"
          }`}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
