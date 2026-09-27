import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/motion/reveal";
import { site } from "@/lib/site";

/**
 * LegalPage — shared shell for policy pages.
 * Editorial document layout: dated, summarized, numbered, sectioned.
 * Desktop gets a sticky table of contents beside a readable measure.
 */

/** Stable anchor id from a section heading. */
function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function LegalPage({
  eyebrow,
  title,
  updated,
  intro,
  summary,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  /** Optional at-a-glance card — three or four short points. */
  summary?: { label: string; value: ReactNode }[];
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
          <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
            {/* Table of contents — sticky on desktop, summary card on mobile */}
            <aside className="mb-12 lg:mb-0">
              {summary ? (
                <div className="mb-8 border border-line bg-accent-soft/60 p-5 lg:hidden">
                  <p className="spec mb-4 text-accent-ink">At a glance</p>
                  <dl className="space-y-3">
                    {summary.map((item) => (
                      <div key={item.label}>
                        <dt className="spec text-ink-4">{item.label}</dt>
                        <dd className="mt-0.5 text-sm leading-relaxed text-ink-2">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
              <nav aria-label={`${title} sections`} className="lg:sticky lg:top-28">
                <p className="spec mb-4 hidden text-ink-4 lg:block">Contents</p>
                <ol className="-mx-2 flex flex-wrap gap-x-1 gap-y-1 lg:mx-0 lg:block lg:space-y-0 lg:border-l lg:border-line">
                  {sections.map((s, i) => (
                    <li key={s.heading}>
                      <a
                        href={`#${slugify(s.heading)}`}
                        className="group flex items-baseline gap-2.5 px-2 py-1.5 text-xs text-ink-3 transition-colors hover:text-ink lg:-ml-px lg:border-l lg:border-transparent lg:hover:border-accent"
                      >
                        <span className="spec shrink-0 text-ink-4 transition-colors group-hover:text-accent">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="leading-snug">{s.heading}</span>
                      </a>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 hidden border-t border-line pt-6 lg:block">
                  <p className="spec mb-2 text-ink-4">Last updated</p>
                  <p className="text-xs leading-relaxed text-ink-2">{updated}</p>
                  <p className="spec mt-5 mb-2 text-ink-4">Operator</p>
                  <p className="text-xs leading-relaxed text-ink-2">
                    {site.name}, a {site.parent} brand
                  </p>
                </div>
              </nav>
            </aside>

            {/* Document */}
            <div className="mx-auto w-full max-w-2xl lg:mx-0">
              <Reveal>
                <div className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-6">
                  <p className="spec text-ink-4">Last updated {updated}</p>
                  <span aria-hidden="true" className="hidden h-3 w-px bg-line-strong sm:block" />
                  <p className="spec text-ink-4">
                    {site.name} · {site.parent}
                  </p>
                </div>
                <p className="text-lead">{intro}</p>

                {summary ? (
                  <div className="mt-10 hidden border border-line bg-accent-soft/60 p-6 lg:block">
                    <p className="spec mb-5 text-accent-ink">At a glance</p>
                    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                      {summary.map((item) => (
                        <div key={item.label}>
                          <dt className="spec text-ink-4">{item.label}</dt>
                          <dd className="mt-1 text-sm leading-relaxed text-ink-2">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}

                <div className="mt-14 space-y-12">
                  {sections.map((s, i) => (
                    <section
                      key={s.heading}
                      id={slugify(s.heading)}
                      aria-labelledby={`${slugify(s.heading)}-heading`}
                      className="scroll-mt-28"
                    >
                      <h2
                        id={`${slugify(s.heading)}-heading`}
                        className="flex items-baseline gap-3 text-display-2 text-[1.25rem]"
                      >
                        <span className="spec text-accent">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {s.heading}
                      </h2>
                      <div className="legal-body mt-4">{s.body}</div>
                    </section>
                  ))}
                </div>

                <div className="mt-16 border-t border-line pt-8">
                  <p className="spec mb-3 text-ink-4">Questions</p>
                  <p className="text-sm leading-relaxed text-ink-2">
                    Anything in this document that reads unclear, write to{" "}
                    <a
                      href={`mailto:${site.contact.email}`}
                      className="font-medium text-accent underline-offset-2 hover:underline"
                    >
                      {site.contact.email}
                    </a>{" "}
                    and we&rsquo;ll answer in plain language. Related pages:{" "}
                    <Link
                      href="/terms"
                      className="font-medium text-accent underline-offset-2 hover:underline"
                    >
                      Terms of Service
                    </Link>
                    ,{" "}
                    <Link
                      href="/privacy"
                      className="font-medium text-accent underline-offset-2 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    ,{" "}
                    <Link
                      href="/refund-policy"
                      className="font-medium text-accent underline-offset-2 hover:underline"
                    >
                      Refund Policy
                    </Link>
                    .
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
