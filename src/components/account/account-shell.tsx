import type { ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { AccountNav } from "@/components/account/account-nav";

/**
 * AccountShell — shared page chrome for the signed-in account area.
 * The account gets a wider canvas than the storefront (container-wide)
 * and its own header band: breadcrumb, eyebrow, display title, lead.
 * Content renders beside the account index (sidebar on desktop, tab row
 * on mobile).
 */
export function AccountShell({
  title,
  lead,
  crumb,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  crumb?: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="border-b border-line bg-paper">
        <div className="container-wide py-14 sm:py-16 lg:py-20">
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex flex-wrap items-center gap-2 text-xs text-ink-4">
                <li>
                  <Link href="/" className="hover:text-ink">
                    Home
                  </Link>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true">/</span>
                  {crumb ? (
                    <Link href="/account" className="hover:text-ink">
                      Account
                    </Link>
                  ) : (
                    <span aria-current="page" className="text-ink-2">
                      Account
                    </span>
                  )}
                </li>
                {crumb ? (
                  <li className="flex items-center gap-2">
                    <span aria-hidden="true">/</span>
                    <span aria-current="page" className="text-ink-2">
                      {crumb}
                    </span>
                  </li>
                ) : null}
              </ol>
            </nav>
            <p className="text-eyebrow mb-4">Account</p>
            <h1 className="text-display-1 max-w-2xl">{title}</h1>
            {lead ? <p className="mt-5 max-w-xl text-lead">{lead}</p> : null}
          </Reveal>
        </div>
      </div>
      <div className="min-h-[60vh] bg-surface">
        <div className="container-wide py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-16">
            <aside className="self-start lg:sticky lg:top-28">
              <AccountNav />
            </aside>
            <div className="min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Card container used across the account pages. */
export function AccountCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border border-line bg-paper p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
