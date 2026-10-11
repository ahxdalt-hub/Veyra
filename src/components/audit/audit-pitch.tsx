"use client";

import Link from "next/link";
import { PHASE_FIX, type AuditResult } from "@/lib/audit";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { useFoundingActive } from "@/components/layout/founding-context";
import { REFUND_WINDOW_LABEL, formatPrice } from "@/lib/site";
import { Button } from "@/components/ui/button";
import {
  ArrowRightIcon,
  CheckIcon,
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
 * the exact module that repairs it, and leads with the four things that make
 * Veyra different from every cloud tool they've been shown — fully local,
 * private/no-cloud, works offline, one-time payment.
 *
 * Motion is CSS-only (animate-rise / stagger-rise + transitions); the global
 * prefers-reduced-motion rule collapses it to instant, so the pitch reads
 * perfectly with animation off.
 */

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

  return (
    <section aria-label="The Client Growth System" className="mt-12">
      {/* The bridge — score to solution, stated plainly. */}
      <div className="text-center">
        <p className="text-eyebrow animate-rise">Your next step</p>
        <h3
          className="text-display-2 animate-rise mx-auto mt-3 max-w-2xl text-balance"
          style={{ animationDelay: "60ms" }}
        >
          Your weakest phase is{" "}
          <span className="text-clay">{weakest.label}</span>. That&rsquo;s
          exactly what the Client Growth System fixes.
        </h3>
        <p
          className="animate-rise mx-auto mt-4 max-w-xl text-lead"
          style={{ animationDelay: "120ms" }}
        >
          You scored the six phases by hand. This is the connected system that
          turns each one from a decision you keep re-making into a process you
          keep.
        </p>
      </div>

      {/* Personalisation — the module that repairs their specific gap. */}
      <div
        className="animate-rise mx-auto mt-8 max-w-xl rounded-md border border-line bg-paper p-5"
        style={{ animationDelay: "180ms" }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{fix.headline}</p>
          <p className="spec tnum text-ink-4">
            {weakest.label} · {weakest.percent}%
          </p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{fix.fix}</p>
        <ul role="list" className="mt-3 flex flex-wrap gap-1.5">
          {fix.modules.map((m) => (
            <li
              key={m}
              className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-[0.6875rem] text-accent-ink"
            >
              <CheckIcon className="h-3 w-3" />
              {m}
            </li>
          ))}
        </ul>
      </div>

      {/* The offer — the four pillars, staggered. */}
      <ul
        role="list"
        className="stagger-rise mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {PILLARS.map(({ Icon, title, body }) => (
          <li
            key={title}
            className="rounded-md border border-line bg-surface p-5 transition-[transform,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-accent/40"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent-soft text-accent-ink">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">{title}</p>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-2">
              {body}
            </p>
          </li>
        ))}
      </ul>

      {/* The dark conversion block — price + CTAs. */}
      <div
        className="animate-rise mt-8 overflow-hidden rounded-md bg-ink p-7 text-paper sm:p-8"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md">
            <p className="spec flex items-center gap-1.5 text-paper/60">
              <SparkIcon className="h-3.5 w-3.5" />
              The complete system · 12 modules · 6 phases
            </p>
            <h4 className="text-display-2 mt-3 text-[1.375rem] text-paper">
              Own the whole system, not just this report.
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-paper/70">
              Twelve connected modules across the same six phases you just
              scored. Install it, own your data, never pay a monthly fee again.
            </p>
          </div>

          {/* Price */}
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex items-baseline gap-x-3 gap-y-1">
              <span className="text-4xl font-medium tnum text-paper">
                {formatPrice(foundingActive ? FOUNDING_PRICE : REGULAR_PRICE)}
              </span>
              {foundingActive ? (
                <span className="text-sm line-through tnum text-paper/40">
                  {formatPrice(REGULAR_PRICE)}
                </span>
              ) : null}
            </div>
            {foundingActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-paper/25 px-3 py-1 text-xs">
                <SparkIcon className="h-3 w-3" />
                Founding price
              </span>
            ) : (
              <span className="text-xs text-paper/50">
                One-time · yours forever
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-paper/55">
              <ShieldIcon className="h-3.5 w-3.5" />
              {REFUND_WINDOW_LABEL}
            </span>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-3">
          <Button
            href="/products/client-growth-system"
            size="lg"
            arrow
            onMouseEnter={hover}
            className="bg-paper text-ink hover:bg-accent-soft active:bg-accent-soft"
          >
            Get the Client Growth System
          </Button>
          <Link
            href="/demo/client-growth-system"
            onMouseEnter={hover}
            className="group inline-flex items-center gap-2 rounded-sm border border-paper/25 px-4 py-2 text-sm text-paper/85 transition-colors hover:border-paper/50 hover:text-paper"
          >
            <PlayIcon className="h-3.5 w-3.5" />
            Try the live demo
            <ArrowRightIcon className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

