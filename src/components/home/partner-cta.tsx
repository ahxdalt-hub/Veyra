import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { partnersUrl } from "@/lib/site";

/**
 * PartnerCta — a quiet, optional band inviting partners into the Caelmont
 * Partner Program. Deliberately understated: it is a link out to the parent
 * program, not a storefront takeover. Placed after the purchase close.
 */
export function PartnerCta() {
  return (
    <section className="border-t border-line bg-surface">
      <div className="container-page py-14 sm:py-16">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <p className="text-eyebrow">Caelmont Partner Program</p>
              <h2 className="mt-2 text-display-2">
                Want to introduce Veyra to your audience?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-3">
                Join the Caelmont Partner Program and earn from qualifying
                referrals.
              </p>
            </div>
            <div className="shrink-0">
              <Button href={partnersUrl} external variant="outline" size="lg" arrow>
                Become a Veyra Partner
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
