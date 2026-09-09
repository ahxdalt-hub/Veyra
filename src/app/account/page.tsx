import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { DocIcon, DownloadIcon, UserIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Account",
  description:
    "Your Standard Practice account — order history and re-download links arrive with the commerce launch.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: true },
  openGraph: { title: "Account — Standard Practice", url: "/account" },
};

export default function AccountPage() {
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Account" }]}
        eyebrow="Account"
        title="Your account"
        lead="Sign-in and order history arrive with our commerce launch. Until then, purchases deliver through email, and this page explains exactly what changes."
      />

      <div className="bg-surface">
        <div className="container-page py-16 lg:py-20">
          <div className="mx-auto max-w-2xl space-y-6">
            <Reveal>
              <div className="rounded-md border border-line bg-paper p-6 sm:p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface">
                  <UserIcon className="h-5 w-5 text-accent" />
                </span>
                <h2 className="mt-5 text-display-2 text-[1.375rem]">
                  Coming with checkout
                </h2>
                <ul className="mt-5 space-y-3.5">
                  {[
                    { icon: DocIcon, t: "Order history", d: "Every purchase, receipt, and licence in one place." },
                    { icon: DownloadIcon, t: "Re-download links", d: "Grab the latest version of any system you own, anytime." },
                    { icon: UserIcon, t: "Licence management", d: "See which systems your business is licensed for." },
                  ].map((row) => (
                    <li key={row.t} className="flex gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line bg-surface">
                        <row.icon className="h-4 w-4 text-accent" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink">{row.t}</span>
                        <span className="mt-0.5 block text-xs text-ink-3">{row.d}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <p className="text-center text-sm text-ink-3">
                Today, every purchase delivers instantly to your inbox —{" "}
                <Button href="/shop" variant="ghost" size="sm" className="px-1">
                  browse systems
                </Button>{" "}
                or{" "}
                <Button href="/contact" variant="ghost" size="sm" className="px-1">
                  contact us
                </Button>{" "}
                about an existing order.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
