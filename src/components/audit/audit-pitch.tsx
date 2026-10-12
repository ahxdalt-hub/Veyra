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
      <div className="mx-auto max-w-4xl text-center space-y-3">
        <p className="text-eyebrow text-clay">Your fix</p>
        <h3 className="text-display-2 mt-3 text-[2.25rem] sm:text-[2.5rem] leading-tight">
          {weakest.label} is your weakest phase.
        </h3>
        <p className="mx-auto max-w-2xl text-xl leading-relaxed text-ink-2">{fix.fix}</p>
        <p className="mt-3 spec text-ink-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-1.5">
          <SparkIcon className="h-3.5 w-3.5" />
          Covered by: {fix.modules.join(" · ")}
        </p>
      </div>

      {/* 2 · The four differentiators — a full-width row of cards */}
      <div className="mt-16">
        <h4 className="mx-auto mb-8 max-w-3xl text-center text-lg font-medium text-ink-2">
          Built differently — so you can actually use it every day without friction
        </h4>
        <ul
          role="list"
          className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PILLARS.map(({ Icon, title, body }, i) => (
            <li
              key={title}
              className="group animate-rise relative overflow-hidden rounded-xl border border-line bg-paper p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:bg-accent-soft/30 hover:shadow-sm"
              style={{ animationDelay: `${80 + i * 80}ms` }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-line bg-surface text-accent transition-colors group-hover:border-accent/40 group-hover:bg-accent-soft">
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-base font-semibold text-ink">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                {body}
              </p>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
            </li>
          ))}
        </ul>
      </div>

      {/* 3 + 4 · Stop renting (left) beside the price + CTAs (right) */}
      <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-2">
        {/* 3 · Stop renting — the three-year savings argument */}
        <div className="flex flex-col justify-center rounded-2xl border border-line bg-paper p-8 transition-all duration-300 hover:border-accent/30 hover:shadow-sm">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-soft text-emerald">
            <SparkIcon className="h-6 w-6" />
          </div>
          <p className="text-eyebrow text-emerald font-semibold">Stop renting your tools</p>
          
          <div className="mt-6 space-y-4">
            <div className="group relative overflow-hidden rounded-lg border border-red-100 bg-red-50/50 px-5 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-ink-3 line-through decoration-red-300">
                  A cloud CRM (~${CRM_MONTHLY}/mo), over {CRM_MONTHS / 12} years
                </span>
                <span className="tnum line-through text-red-400 font-medium">
                  ${crm3yr}
                </span>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-lg border-2 border-emerald/20 bg-gradient-to-br from-emerald-50/50 to-green-50/30 px-5 py-4">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald/20"></div>
              <div className="flex items-baseline justify-between gap-3 pl-3">
                <span className="font-semibold text-ink">Veyra — one payment</span>
                <span className="tnum text-emerald font-bold">${youPay}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 rounded-xl border border-emerald/20 bg-emerald-soft/40 px-5 py-4 text-center shadow-sm">
            <p className="text-base font-bold text-emerald-ink">
              You save ${saved} over three years — and own it for life
            </p>
            <p className="mt-1.5 text-xs text-emerald-ink/70">
              No subscription fees ever • All future updates included
            </p>
          </div>
        </div>

        {/* 4 · Price + CTAs */}
        <div className="group flex flex-col justify-center rounded-2xl bg-ink p-8 text-paper shadow-xl transition-all duration-300 hover:shadow-2xl">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-paper/15 bg-paper/10 px-3 py-1.5 text-xs font-medium text-paper/70">
            <SparkIcon className="h-3 w-3 animate-pulse" />
            Complete system · 12 modules · 6 phases
          </div>
          
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="text-5xl font-bold tnum tracking-tight text-paper sm:text-6xl">
              ${youPay}
            </span>
            {foundingActive ? (
              <span className="text-lg line-through text-paper/40 tnum">
                ${REGULAR_PRICE}
              </span>
            ) : null}
          </div>
          
          <div className="mt-2 flex items-center gap-3">
            {foundingActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-gradient-to-r from-accent/20 to-yellow-500/20 px-3 py-1 text-[0.6875rem] font-semibold text-accent-ink shadow-sm">
                <SparkIcon className="h-2.5 w-2.5" />
                Founding Price
              </span>
            ) : (
              <span className="rounded-full border border-paper/20 bg-paper/10 px-3 py-1 text-xs text-paper/60">
                One-time payment
              </span>
            )}
            <span className="text-xs text-paper/50">• Lifetime access</span>
          </div>
          
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-paper/20 to-transparent"></div>
          
          <div className="mb-6 flex items-center gap-1.5 text-sm text-paper/70">
            <ShieldIcon className="h-4 w-4" />
            <span>{REFUND_WINDOW_LABEL} · No questions asked</span>
          </div>

          <div className="mt-auto space-y-3">
            <Button
              href="/products/client-growth-system"
              size="lg"
              arrow
              onMouseEnter={hover}
              className="w-full justify-center bg-gradient-to-r from-paper to-paper/90 text-ink hover:from-accent-soft hover:to-accent-soft hover:text-ink transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Get the Client Growth System
            </Button>
            <Link
              href="/demo/client-growth-system"
              onMouseEnter={hover}
              className="group inline-flex items-center justify-center gap-2 rounded-lg border border-paper/25 bg-paper/5 px-5 py-2.5 text-sm text-paper/85 transition-all duration-300 hover:border-paper/40 hover:bg-paper/10 hover:text-paper"
            >
              <PlayIcon className="h-3.5 w-3.5 opacity-70 transition-transform group-hover:translate-x-0.5" />
              Try the live demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
