import Link from "next/link";
import { footerNav, site } from "@/lib/site";
import { MailIcon } from "@/components/ui/icons";

/**
 * Footer — professional, quiet, four link groups + brand block.
 * No social links until real profiles exist (per brand honesty rule).
 */

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-page">
        {/* Upper: brand + nav columns */}
        <div className="grid gap-12 py-16 lg:grid-cols-[1.4fr_2fr] lg:gap-20 lg:py-20">
          <div className="max-w-sm">
            <Link href="/" className="flex items-baseline gap-1.5" aria-label="Home">
              <span className="font-display text-xl font-semibold tracking-[-0.02em] text-ink">
                Veyra
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />
            </Link>
            <p className="mt-1.5 spec text-ink-4">A {site.parent} brand</p>
            <p className="mt-4 text-sm leading-relaxed text-ink-3">
              {site.positioning}
            </p>
            <a
              href={`mailto:${site.contact.email}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink-2 underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              <MailIcon className="h-4 w-4" />
              {site.contact.email}
            </a>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-10 sm:grid-cols-4"
          >
            <FooterColumn heading="Products" links={footerNav.products} />
            <FooterColumn heading="Company" links={footerNav.company} />
            <FooterColumn heading="Support" links={footerNav.support} />
            <FooterColumn heading="Legal" links={footerNav.legal} />
          </nav>
        </div>

        {/* Lower: hairline bar */}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-line py-8 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-4">
            © {year} {site.name}. All rights reserved.
          </p>
          <p className="text-xs text-ink-4">
            Built for people who bill for their expertise.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-eyebrow mb-4">{heading}</h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-sm text-ink-2 transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
