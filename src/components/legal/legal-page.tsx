import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/motion/reveal";
import { site } from "@/lib/site";

/**
 * LegalPage — shared shell for policy pages.
 * Editorial document layout: dated, sectioned, readable measure.
 */

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: ReactNode }[];
}) {
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: title }]}
        eyebrow={eyebrow}
        title={title}
      />
      <div className="bg-surface">
        <div className="container-page py-16">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <p className="spec mb-8 text-ink-4">
                Last updated {updated}
              </p>
              <p className="text-lead">{intro}</p>
              <div className="mt-12 space-y-10">
                {sections.map((s, i) => (
                  <section key={s.heading}>
                    <h2 className="flex items-baseline gap-3 text-display-2 text-[1.25rem]">
                      <span className="spec text-ink-4">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s.heading}
                    </h2>
                    <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-2">
                      {s.body}
                    </div>
                  </section>
                ))}
              </div>
              <p className="mt-12 border-t border-line pt-8 text-xs leading-relaxed text-ink-3">
                Questions about this policy? Write to{" "}
                <a
                  href={`mailto:${site.contact.email}`}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  {site.contact.email}
                </a>
                .
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
