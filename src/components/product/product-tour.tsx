"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";

/**
 * ProductTour — the hero's product visual, upgraded for conversion.
 *
 * For a no-trial desktop app the landing page IS the demo, so this cycles
 * through four real scenes of the Client Growth System (journey, pipeline,
 * prospects, onboarding) with a gentle cross-fade and a progress bar. The
 * whole visual is a link to the product page, so watching it also funnels
 * toward the purchase decision.
 *
 * Honest by design: every scene is illustrative sample data rendered in
 * code — a preview of what the app shows, NOT a fabricated screenshot with
 * invented customer metrics. Reduced-motion users get a single static scene.
 */

const SCENE_MS = 4600;
const EASE = [0.16, 1, 0.3, 1] as const;

const phases = [
  { name: "Build", items: ["Foundation", "Positioning", "Offer", "Ideal Client"] },
  { name: "Acquire", items: ["Strategy", "Outreach", "Follow-up"] },
  { name: "Sell", items: ["Sales", "Proposals"] },
  { name: "Deliver", items: ["Onboarding"] },
  { name: "Retain", items: ["Retention"] },
  { name: "Grow", items: ["Growth Review"] },
];

const pipelineColumns = [
  { stage: "Qualified", deals: [{ co: "Northwind", v: "$3,800" }] },
  {
    stage: "Discovery",
    deals: [
      { co: "Globex", v: "$6,200" },
      { co: "Initech", v: "$2,400" },
    ],
  },
  { stage: "Proposal", deals: [{ co: "Umbrella Co", v: "$9,500" }] },
  { stage: "Closed", deals: [{ co: "Stark Ltd", v: "$5,100" }] },
];

const prospects = [
  { co: "Acme Design", channel: "LinkedIn", status: "Contacted", next: "Follow-up Thu" },
  { co: "Bluepeak", channel: "Referral", status: "Replied", next: "Call today" },
  { co: "Cedar & Co", channel: "Cold email", status: "New", next: "Send intro" },
];

const onboardingSteps = [
  { label: "Kickoff call booked", done: true },
  { label: "Access & assets received", done: true },
  { label: "Scope signed", done: false },
  { label: "First milestone delivered", done: false },
];

function SceneChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-2.5">
      <span className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
      </span>
      <span className="spec truncate text-ink-4">Client Growth System — {title}</span>
    </div>
  );
}

function Sidebar() {
  return (
    <div className="hidden w-40 shrink-0 border-r border-line bg-paper py-4 sm:block">
      <p className="spec px-4 pb-3 text-ink-4">System</p>
      <ul className="space-y-1">
        {["Overview", ...phases.map((p) => p.name)].map((item, i) => (
          <li key={item}>
            <span
              className={`block px-4 py-1.5 text-xs ${
                i === 0
                  ? "rounded-xs bg-accent-soft font-medium text-accent-ink"
                  : "text-ink-3"
              }`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-line px-4 pt-3">
        <p className="spec text-ink-4">12 modules</p>
      </div>
    </div>
  );
}

function JourneyScene() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {phases.map((phase, i) => (
        <div key={phase.name} className="rounded-xs border border-line bg-paper px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="spec tnum text-accent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[0.6875rem] font-medium text-ink">{phase.name}</span>
            </span>
            {i < phases.length - 1 ? (
              <ArrowRightIcon className="h-2.5 w-2.5 text-ink-4" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
            )}
          </div>
          <ul className="mt-2 space-y-1">
            {phase.items.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[0.625rem] text-ink-3">
                <span className="h-1 w-1 shrink-0 rounded-full bg-line-strong" />
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
function PipelineScene() {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[0.6875rem] font-medium text-ink">Opportunities</span>
        <span className="tnum text-[0.625rem] text-ink-4">$27,000 in pipeline</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {pipelineColumns.map((col) => (
          <div key={col.stage} className="rounded-xs border border-line bg-paper p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[0.625rem] font-medium text-ink-3">{col.stage}</span>
              <span className="tnum text-[0.5625rem] text-ink-4">{col.deals.length}</span>
            </div>
            <div className="space-y-1.5">
              {col.deals.map((d) => (
                <div
                  key={d.co}
                  className="rounded-xs border border-line bg-surface px-2 py-1.5 shadow-sm"
                >
                  <p className="truncate text-[0.625rem] font-medium text-ink">{d.co}</p>
                  <p className="tnum text-[0.5625rem] text-accent">{d.v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-line pt-2.5 text-[0.625rem] text-ink-4">
        Drag a deal between stages — value per stage updates instantly.
      </p>
    </div>
  );
}

function ProspectsScene() {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[0.6875rem] font-medium text-ink">Acquire · Prospects</span>
        <span className="tnum text-[0.625rem] text-ink-4">{prospects.length} active</span>
      </div>
      <div className="overflow-hidden rounded-xs border border-line">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line bg-paper">
              {["Company", "Channel", "Status", "Next step"].map((h) => (
                <th
                  key={h}
                  className="px-2.5 py-1.5 text-[0.5625rem] font-normal uppercase tracking-[0.08em] text-ink-4"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => (
              <tr key={p.co} className="border-b border-line last:border-0">
                <td className="px-2.5 py-1.5 text-[0.625rem] font-medium text-ink">{p.co}</td>
                <td className="px-2.5 py-1.5 text-[0.625rem] text-ink-3">{p.channel}</td>
                <td className="px-2.5 py-1.5">
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.5625rem] font-medium text-accent-ink">
                    {p.status}
                  </span>
                </td>
                <td className="tnum px-2.5 py-1.5 text-[0.625rem] text-ink-3">{p.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 border-t border-line pt-2.5 text-[0.625rem] text-ink-4">
        Your outreach log — who to contact, and exactly when to follow up.
      </p>
    </div>
  );
}

function OnboardingScene() {
  const done = onboardingSteps.filter((s) => s.done).length;
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[0.6875rem] font-medium text-ink">Deliver · Onboarding</span>
        <span className="tnum text-[0.625rem] text-ink-4">
          {done} of {onboardingSteps.length}
        </span>
      </div>
      <ul className="space-y-2">
        {onboardingSteps.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                s.done ? "border-accent bg-accent text-paper" : "border-line-strong bg-surface"
              }`}
            >
              {s.done ? <CheckIcon className="h-2.5 w-2.5" /> : null}
            </span>
            <span className={`text-[0.6875rem] ${s.done ? "text-ink-4 line-through" : "text-ink"}`}>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-2.5 text-[0.625rem] text-ink-4">
        Every client, one repeatable delivery checklist.
      </p>
    </div>
  );
}

const SCENES = [
  { id: "journey", label: "Journey", chrome: "Journey", Scene: JourneyScene },
  { id: "pipeline", label: "Pipeline", chrome: "Sell · Pipeline", Scene: PipelineScene },
  { id: "prospects", label: "Outreach", chrome: "Acquire · Prospects", Scene: ProspectsScene },
  { id: "onboarding", label: "Delivery", chrome: "Deliver · Onboarding", Scene: OnboardingScene },
];

export function ProductTour({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % SCENES.length), SCENE_MS);
    return () => window.clearInterval(t);
  }, [reduced]);

  const active = SCENES[index];
  const ActiveScene = active.Scene;

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-md transition-shadow">
        <SceneChrome title={active.chrome} />
        <div className="flex">
          <Sidebar />
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="min-h-[200px]">
              {reduced ? (
                <JourneyScene />
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <ActiveScene />
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-1 border-t border-line bg-paper px-3 py-2">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show ${s.label}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="relative flex-1 overflow-hidden rounded-xs py-1.5 text-[0.625rem] text-ink-3 transition-colors hover:text-ink"
            >
              {i === index ? <span className="absolute inset-0 -z-10 bg-accent-soft" /> : null}
              <span className={i === index ? "font-medium text-accent-ink" : ""}>{s.label}</span>
            </button>
          ))}
          <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
            {reduced ? null : (
              <motion.span
                key={active.id}
                className="block h-full bg-accent/50"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: SCENE_MS / 1000, ease: "linear" }}
              />
            )}
          </span>
        </div>
      </div>

      <Link
        href="/products/client-growth-system"
        className="group mt-3 flex items-center justify-center gap-1.5 rounded-xs text-xs text-ink-3 transition-colors hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        See the full system
        <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

