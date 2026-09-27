import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/motion/reveal";
import { GrowthAudit } from "@/components/audit/growth-audit";
import { ChartIcon, ClockIcon, ShieldIcon } from "@/components/ui/icons";
import { createSupabaseServerClient, getSessionUser } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Growth Audit",
  description:
    "An 18-question audit of how your client growth actually runs — scored across six phases. Free to claim with a Veyra account; yours to keep in your library.",
  alternates: { canonical: "/products/growth-audit" },
  openGraph: { title: "Growth Audit — Veyra", url: "/audit" },
  // Members' area — anonymous visitors are redirected to the claim page,
  // so there's nothing here for search engines to index.
  robots: { index: false, follow: false },
};

/** The claim entry — every non-owner path lands here so the free product
 * is only ever acquired through the account claim flow, never tried
 * anonymously. */
const CLAIM_PATH = "/products/growth-audit";

/**
 * The Growth Audit — an interactive web app (see growth-audit.tsx) on a
 * quiet editorial page. This is a members' area: the audit is a free
 * product, and like every product it must be claimed into an account
 * first (POST /api/claim → real order → entitlement). Anonymous visitors
 * and signed-in non-owners are redirected to the product page, where the
 * claim (and sign-in, for guests) happens; only an active entitlement
 * renders the tool.
 */
export default async function AuditPage() {
  // In development without Supabase configured there are no accounts to
  // verify against — render the tool unlocked, like the claim routes
  // treat the dev store as their source of truth.
  if (!supabaseAuthConfigured()) {
    return <AuditShell unlocked licenceReference={null} />;
  }

  let user;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (!user) redirect(CLAIM_PATH);

  let entitlementId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: entitlement } = await supabase
      .from("entitlements")
      .select("id")
      .eq("product_slug", "growth-audit")
      .eq("status", "active")
      .limit(1)
      .maybeSingle(); // RLS scopes this to the caller
    entitlementId = entitlement?.id ?? null;
  } catch {
    entitlementId = null;
  }
  // Signed in but hasn't claimed — send them to the product page, where
  // ClaimFreeButton runs the one-claim-per-account flow.
  if (!entitlementId) redirect(CLAIM_PATH);

  const supabase = await createSupabaseServerClient();
  const { data: licence } = await supabase
    .from("licences")
    .select("licence_reference")
    .eq("entitlement_id", entitlementId)
    .maybeSingle();

  return <AuditShell unlocked licenceReference={licence?.licence_reference ?? null} />;
}

function AuditShell({
  unlocked,
  licenceReference,
}: {
  unlocked: boolean;
  licenceReference: string | null;
}) {
  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/shop" },
          { label: "Growth Audit" },
        ]}
        eyebrow="Free tool · active in your account"
        title="Score your client-growth machine in three minutes."
        lead="Eighteen questions across the six phases of client growth — Build, Acquire, Sell, Deliver, Retain, Grow. Claimed free into your account, kept in your library with its own licence."
      />

      <section className="bg-paper">
        <div className="container-page py-14 lg:py-20">
          <div className="mx-auto max-w-2xl">
            <GrowthAudit unlocked={unlocked} licenceReference={licenceReference} />
          </div>

          {/* Quiet trust strip */}
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 border-t border-line pt-12 sm:grid-cols-3">
            {[
              {
                Icon: ShieldIcon,
                title: "Private by default",
                body: "Your answers never leave the browser. The audit runs on your account — the same licence record any purchase gets, nothing else.",
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
