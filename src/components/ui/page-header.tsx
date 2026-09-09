import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

/**
 * PageHeader — consistent editorial header for interior pages.
 * Breadcrumb + eyebrow + display title + lead.
 */

export function PageHeader({
  eyebrow,
  title,
  lead,
  breadcrumb,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <div className="border-b border-line bg-paper">
      <div className="container-page py-14 sm:py-16 lg:py-20">
        <Reveal>
          {breadcrumb ? (
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-2 text-xs text-ink-4">
                {breadcrumb.map((crumb, i) => (
                  <li key={crumb.label + String(i)} className="flex items-center gap-2">
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-ink">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="page" className="text-ink-2">
                        {crumb.label}
                      </span>
                    )}
                    {i < breadcrumb.length - 1 ? (
                      <span aria-hidden="true">/</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
          {eyebrow ? <p className="text-eyebrow mb-4">{eyebrow}</p> : null}
          <h1 className="text-display-1 max-w-2xl">{title}</h1>
          {lead ? <p className="mt-5 max-w-xl text-lead">{lead}</p> : null}
        </Reveal>
      </div>
    </div>
  );
}
