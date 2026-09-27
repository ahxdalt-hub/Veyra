import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/motion/reveal";
import { GrowthAudit } from "@/components/audit/growth-audit";
import { ChartIcon, ClockIcon, ShieldIcon } from "@/components/ui/icons";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Growth Audit",
  description:
    "An 18-question audit of how your client growth actually runs — scored across six phases, free, with your results before you give us anything.",
  alternates: { canonical: "/audit" },
  openGraph: { title: "Free Growth Audit — Veyra", url: "/audit" },
};

/**
 * The Growth Audit — an interactive web app (see growth-audit.tsx) on a
 * quiet editorial page. Ownership is resolved server-side through the
 * caller's session (RLS): anyone who claimed the free product lands on an
 * un-gated experience with their licence shown; everyone else meets the
 * honest gate — score first, email only for the written report.
 */
export default async function AuditPage() {
  // Owner state is best-effort: the page must render for anonymous users
  // exactly as well as for owners, so auth failures simply mean "locked".
  let unlocked = false;
  let signedIn = false;
  let licenceReference: string | null = null;
  let accountEmail: string | null = null;

  if (supabaseAuthConfigured()) {
    try {
      const user = await getSessionUser();
      if (user) {
        signedIn = true;
        accountEmail = user.email ?? null;
        const supabase = await createSupabaseServerClient();
        const { data: entitlement } = await supabase
          .from("entitlements")
          .select("id")
          .eq("product_slug", "growth-audit")
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (entitlement) {
          unlocked = true;
          const { data: licence } = await supabase
            .from("licences")
            .select("licence_reference")
            .eq("entitlement_id", entitlement.id)
            .maybeSingle();
          licenceReference = licence?.licence_reference ?? null;
        }
      }
    } catch {
      // Session/DB unavailable — render the locked experience.
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Resources", href: "/resources" },
          { label: "Growth Audit" },
        ]}
        eyebrow="Free tool"
        title="Score your client-growth machine in three minutes."
        lead="Eighteen questions across the six phases of client growth — Build, Acquire, Sell, Deliver, Retain, Grow. You see your score before we ask for anything."
      />

      <section className="bg-paper">
        <div className="container-page py-14 lg:py-20">
          <div className="mx-auto max-w-2xl">
            <GrowthAudit
              unlocked={unlocked}
              signedIn={signedIn}
              licenceReference={licenceReference}
              accountEmail={accountEmail}
            />
          </div>

          {/* Quiet trust strip */}
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 border-t border-line pt-12 sm:grid-cols-3">
            {[
              {
                Icon: ShieldIcon,
                title: "Private by default",
                body: "Your answers never leave the browser. Only your email — if you ask for the report — touches our server.",
              },
              {
                Icon: ClockIcon,
                title: "Three minutes",
                body: "Eighteen questions, one screen each. Answer honestly; the score is only useful if it’s real.",
              },
              {
                Icon: ChartIcon,
                title: "Built on the real system",
                body: "The six phases aren’t quiz marketing — they’re the exact structure of the Client Growth System.",
              },
            ].map(({ Icon, title, body }) => (
              <div key={title}>
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface"
                >
                  <Icon className="h-5 w-5 text-accent" />
                </span>
                <h2 className="mt-4 text-sm font-medium text-ink">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-3">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary path — the static checklist */}
      <Reveal as="section">
        <div className="border-t border-line bg-surface">
          <div className="container-page py-10">
            <p className="text-sm text-ink-3">
              Prefer the checklist?{" "}
              <Link
                href="/resources#audit"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Get the 25-Point Client Acquisition Audit PDF →
              </Link>
            </p>
          </div>
        </div>
      </Reveal>
    </>
  );
}
