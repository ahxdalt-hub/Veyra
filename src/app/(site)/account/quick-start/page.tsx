import type { Metadata } from "next";
import Link from "next/link";
import { requireAccountUser } from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import { phaseMeta, PHASE_ORDER } from "@/lib/products";
import { AccountShell, AccountCard } from "@/components/account/account-shell";
import { DownloadButton } from "@/components/account/download-button";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Quick Start — Veyra",
  description: "Start running the Client Growth System.",
  robots: { index: false, follow: false },
};

/**
 * Quick Start — post-purchase onboarding. Short, sequential, and honest:
 * it explains what the system does, walks the journey in the order the
 * product is organized, and hands the customer to the first concrete
 * step. No documentation dump — the guide ends by pointing at the work.
 */
export default async function QuickStartPage() {
  if (!supabaseAuthConfigured()) {
    return <NotConfigured />;
  }
  await requireAccountUser();

  const steps: { title: string; detail: string }[] = [
    {
      title: "Set up your business foundation",
      detail:
        "Capture how your business actually runs — services, capacity, constraints, goals — in one structured place. Everything else builds on this.",
    },
    {
      title: "Define your positioning",
      detail:
        "Decide who you serve, what you're worth, and why you over the alternatives. Written as decisions, not a paragraph of inspiration.",
    },
    {
      title: "Create your offer",
      detail:
        "Shape your services into a defined offer — scope, outcomes, boundaries — so selling becomes presenting rather than improvising.",
    },
    {
      title: "Define your ideal client",
      detail:
        "Write criteria you can actually apply when a lead arrives, so you know who to pursue and who to decline.",
    },
    {
      title: "Build your acquisition process",
      detail:
        "Choose your channels and set a weekly rhythm — what you do, how often, and what counts as working.",
    },
    {
      title: "Set up sales and proposals",
      detail:
        "Give sales conversations a structure — discovery, qualification, next steps — and write proposals from a template you trust.",
    },
    {
      title: "Set up client onboarding",
      detail:
        "Define the start-up sequence every client goes through — contract, access, schedule — so nothing is reinvented per client.",
    },
    {
      title: "Create your retention process",
      detail:
        "Put standing check-ins and value reviews on the calendar, so good clients are kept deliberately, not by accident.",
    },
    {
      title: "Run growth reviews",
      detail:
        "Set a recurring review of the whole journey — what produced clients, what stalled, what to change next.",
    },
  ];

  return (
    <AccountShell
      crumb="Quick Start"
      title="Welcome to the Client Growth System"
      lead="Your system is ready. Start by building the foundation, then move through acquisition, sales, delivery, retention, and growth."
    >
      <div className="stagger-rise space-y-6">
        {/* The journey */}
        <AccountCard>
          <h2 className="text-eyebrow">The journey</h2>
          <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
            {PHASE_ORDER.map((phase, i) => (
              <li key={phase} className="flex items-center gap-2">
                <span className="rounded-xs border border-line-strong bg-paper px-2 py-1 text-xs font-medium tracking-wide text-ink-2 uppercase">
                  {phaseMeta[phase].label}
                </span>
                {i < PHASE_ORDER.length - 1 ? (
                  <span aria-hidden="true" className="text-ink-4">→</span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-2">
            The system is organized around these six connected phases. Each
            phase contains the modules for that stage of growth, and each
            module is built to be used — not read once and filed away.
          </p>
        </AccountCard>

        {/* Start here */}
        <AccountCard>
          <h2 className="text-eyebrow">Start here</h2>
          <ol className="mt-4 space-y-3">
            {steps.slice(0, 4).map((step, i) => (
              <li key={step.title} className="flex gap-3.5">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft text-xs font-medium tnum text-accent-ink"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-ink-2">
            Once the foundation is in place, continue in order:{" "}
            <span className="font-medium text-ink">Acquire</span> →{" "}
            <span className="font-medium text-ink">Sell</span> →{" "}
            <span className="font-medium text-ink">Deliver</span> →{" "}
            <span className="font-medium text-ink">Retain</span> →{" "}
            <span className="font-medium text-ink">Grow</span>. Each phase
            stands on the one before it.
          </p>
        </AccountCard>

        {/* The full guide */}
        <AccountCard>
          <h2 className="text-eyebrow">The full guide</h2>

          <h3 className="mt-4 text-sm font-medium text-ink">Before you begin</h3>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-2">
            The Client Growth System manages the whole client-growth journey
            in one place: positioning, acquisition, sales, delivery,
            retention, and growth review. It is not a course to watch — it is
            a working system you run your business on, week after week. Expect
            to spend focused time in the first phases; the later ones run on
            a cadence.
          </p>

          <ol className="mt-6 space-y-4">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-3.5 border-t border-line pt-4">
                <span className="spec pt-0.5 text-ink-4">
                  Step {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex items-start gap-3 rounded-sm border border-accent/25 bg-accent-soft px-4 py-3.5">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm leading-relaxed text-accent-ink">
              You&rsquo;re ready to run the system. Put the phases on your
              calendar, work them in order, and let the structure carry the
              follow-through.
            </p>
          </div>
        </AccountCard>

        {/* Installation */}
        <AccountCard>
          <h2 id="installation" className="text-eyebrow scroll-mt-24">
            Installation guide
          </h2>
          <ol className="mt-4 space-y-3">
            {[
              "Download the latest version for Windows from your product page.",
              "Run the installer — no admin rights required.",
              "Launch the app and sign in with your Veyra account (the email on your order).",
              "The app verifies your licence with Veyra automatically — your seats and entitlement are confirmed server-side.",
              "Once verified, the system unlocks and the in-app welcome walks you through setup.",
            ].map((line, i) => (
              <li key={line} className="flex gap-3.5">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-xs font-medium tnum text-ink-2"
                >
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-ink-2">{line}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <DownloadButton slug="client-growth-system" productName="Client Growth System" />
            <Button href="/account/library/client-growth-system" variant="ghost" size="sm">
              Open your product page
            </Button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-4">
            Your licence stays active after installation — verification happens
            at sign-in, so updates never need a new purchase.
          </p>
        </AccountCard>

        <div>
          <Button href="/account/library" variant="ghost" size="sm">
            ← All your products
          </Button>
        </div>
      </div>
    </AccountShell>
  );
}

function NotConfigured() {
  return (
    <AccountShell
      crumb="Quick Start"
      title="Quick Start"
      lead="Start running your Veyra system."
    >
      <AccountCard>
        <p className="text-sm leading-relaxed text-ink-2">
          Customer accounts aren&rsquo;t enabled on this deployment yet.{" "}
          <Link href="/account" className="font-medium text-accent underline-offset-2 hover:underline">
            Back to your account
          </Link>
        </p>
      </AccountCard>
    </AccountShell>
  );
}
