"use client";

import Link from "next/link";
import { PHASE_FIX, type AuditResult } from "@/lib/audit";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { useFoundingActive } from "@/components/layout/founding-context";
import { REFUND_WINDOW_LABEL, formatPrice } from "@/lib/site";
import { Button } from "@/components/ui/button";
import {
  ArrowRightIcon,
  DriveIcon,
  EyeOffIcon,
  InfinityIcon,
  PlayIcon,
  ShieldIcon,
  SparkIcon,
  WifiOffIcon,
} from "@/components/ui/icons";

/**
 * AuditPitch — the conversion moment after the score.
 *
 * The audit's whole job is to hand a visitor a diagnosis, then make the fix
 * feel inevitable. This is that fix: it names their weakest phase, ties it to
 * the exact modules that repair it, states the four things that make Veyra
 * different from every cloud tool they've been shown (fully local, private /
 * no-cloud, works offline, one-time payment), then closes with the argument
 * that lands on a subscription-fatigued buyer — a three-year cost comparison
 * against renting a CRM — followed by the price + CTAs.
 *
 * It renders as a self-contained vertical card so it can sit in a sticky
 * right-hand column beside the diagnosis on the results screen.
 *
 * The three-year comparison is an honest, clearly-labelled assumption
 * (CRM_MONTHLY / CRM_MONTHS), never a fabricated competitor price — the number
 * is derived, not invented.
 *
 * Motion is CSS-only (animate-rise + transitions); the global
 * prefers-reduced-motion rule collapses it to instant, so the pitch reads
 * perfectly with animation off.
 */

/** Representative cloud-CRM price used only for the labelled savings math. */
const CRM_MONTHLY = 25;
/** Horizon for the "stop renting" comparison, in months. */
const CRM_MONTHS = 36;

type Pillar = { Icon: typeof DriveIcon; title: string; body: string };

const PILLARS: Pillar[] = [
  {
    Icon: DriveIcon,
    title: "Fully local",
    body: "Your clients, pipeline and notes live on your computer — not on someone else's server.",
  },
  {
    Icon: EyeOffIcon,
    title: "Private, no cloud",
    body: "Nothing to log into for your data. No tracking, no data mining, no selling your info.",
  },
  {
    Icon: WifiOffIcon,
    title: "Works offline",
    body: "Open it on a plane, in a café, mid-call. Daily use needs no internet at all.",
  },
  {
    Icon: InfinityIcon,
    title: "One-time payment",
    body: "Pay once and own it. Every future revision is included. No subscription, ever.",
  },
];

export function AuditPitch({
  result,
  hover,
}: {
  result: AuditResult;
  hover: () => void;
}) {
  const foundingActive = useFoundingActive();
  const weakest = result.gaps[0];
  const fix = PHASE_FIX[weakest.phase];

  // The "stop renting" math — honest, labelled, and derived.
  const crm3yr = CRM_MONTHLY * CRM_MONTHS;
  const youPay = foundingActive ? FOUNDING_PRICE : REGULAR_PRICE;
  const saved = Math.max(0, crm3yr - youPay);

  return (
    <section aria-label="Own the Client Growth System" className="animate-rise">
      {/* 1 · The bridge — their weakest phase, named, and the fix. */}
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-eyebrow text-clay">Your fix</p>
        <h3 className="text-display-2 mt-3 text-[1.75rem] sm:text-[2rem]">
          {weakest.label} is your weakest phase.
        </h3>
        <p className="mt-4 text-lead">{fix.fix}</p>
        <p className="spec mt-5 text-ink-4">
          Covered by: {fix.modules.join(" · ")}
        </p>
      </div>

      {/* 2 · The four differentiators — a full-width row of cards. */}
      <ul
        role="list"
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {PILLARS.map(({ Icon, title, body }, i) => (
          <li
            key={title}
            className="group animate-rise rounded-md border border-line bg-paper p-5 transition-colors hover:border-accent/40 hover:bg-accent-soft/50"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-line bg-surface text-accent transition-colors group-hover:border-accent/40 group-hover:bg-accent-soft">
              <Icon className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">{title}</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-2">
              {body}
            </p>
          </li>
        ))}
      </ul>

      {/* 3 + 4 · Stop renting (left) beside the price + CTAs (right). */}
      <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-2">
      {/* 3 · Stop renting — the three-year savings argument. */}
      <div className="flex flex-col justify-center rounded-md border border-line bg-paper p-6 sm:p-8">
        <p className="text-eyebrow">Stop renting your tools</p>
        <div className="mt-4 space-y-2 text-base">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-ink-3">
              A cloud CRM (~${CRM_MONTHLY}/mo), over {CRM_MONTHS / 12} years
            </span>
            <span className="tnum line-through text-ink-4">
              {formatPrice(crm3yr)}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3 font-medium">
            <span className="text-ink">Veyra — one payment</span>
            <span className="tnum text-ink">{formatPrice(youPay)}</span>
          </div>
        </div>
        <p className="mt-3 rounded-sm bg-accent-soft px-3 py-2 text-sm font-medium text-accent-ink">
          You keep {formatPrice(saved)} over three years — and own it for life.
        </p>
        <p className="mt-2 text-[0.6875rem] leading-relaxed text-ink-4">
          Based on a typical ${CRM_MONTHLY}/month CRM. No subscription, ever.
        </p>
      </div>

        {/* 4 · Price + CTAs. */}
        <div className="flex flex-col justify-center rounded-md bg-ink p-6 text-paper sm:p-8">
          <p className="spec flex items-center gap-1.5 text-paper/60">
            <SparkIcon className="h-3.5 w-3.5" />
            The complete system · 12 modules · 6 phases
          </p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-4xl font-medium tnum text-paper">
              {formatPrice(youPay)}
            </span>
            {foundingActive ? (
              <span className="text-base line-through tnum text-paper/40">
                {formatPrice(REGULAR_PRICE)}
              </span>
            ) : null}
            {foundingActive ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-paper/25 px-2.5 py-0.5 text-[0.6875rem]">
                <SparkIcon className="h-3 w-3" />
                Founding
              </span>
            ) : (
              <span className="text-xs text-paper/50">
                One-time · yours forever
              </span>
            )}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-paper/55">
            <ShieldIcon className="h-3.5 w-3.5" />
            {REFUND_WINDOW_LABEL}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button
              href="/products/client-growth-system"
              size="lg"
              arrow
              onMouseEnter={hover}
              className="justify-center bg-paper text-ink hover:bg-accent-soft active:bg-accent-soft"
            >
              Get the Client Growth System
            </Button>
            <Link
              href="/demo/client-growth-system"
              onMouseEnter={hover}
              className="group inline-flex items-center justify-center gap-2 rounded-sm border border-paper/25 px-5 py-2.5 text-sm text-paper/85 transition-colors hover:border-paper/50 hover:text-paper"
            >
              <PlayIcon className="h-3.5 w-3.5" />
              Try the live demo
              <ArrowRightIcon className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
