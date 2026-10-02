"use client";

/**
 * ACQUIRE · Acquisition Strategy.
 *
 * One focused page defining how the business reaches its ideal client.
 * It reads BUILD directly — Ideal Client becomes the target audience, the
 * positioning claim is the default angle, the offer is what gets promoted —
 * and only stores deltas (notes) where a channel-specific adjustment is needed.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Send,
  Target,
} from "lucide-react";
import { useStore } from "@/cgs-demo/lib/store";
import { buildContext, missingStrategyFields, strategyChannels } from "@/cgs-demo/lib/workflow";
import { CHANNEL_OPTIONS, FREQUENCY_OPTIONS } from "@/cgs-demo/lib/workflow";
import { ComboInput, Pill } from "@/cgs-demo/components/data";
import { Button } from "@/cgs-demo/components/ui";

function ContextRef({
  from,
  label,
  value,
  missing,
  href,
  children,
}: {
  from: string;
  label: string;
  value: string | null;
  missing?: string;
  href: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-cgs-line bg-cgs-inset/40 px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">{from}</span>
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-[11px] text-cgs-accent hover:text-cgs-accent-deep"
        >
          edit <ChevronRight size={11} aria-hidden />
        </Link>
      </div>
      <div className="mt-1 text-[12px] font-medium text-cgs-muted">{label}</div>
      {value ? (
        <p className="mt-0.5 text-[13px] leading-relaxed text-cgs-ink">{value}</p>
      ) : (
        <p className="mt-0.5 text-[12.5px] text-cgs-refine">{missing ?? "Not defined yet in BUILD."}</p>
      )}
      {children}
    </div>
  );
}

const sectionCls = "mt-7";
const hCls = "text-[13px] font-semibold text-cgs-ink";
const subCls = "mt-0.5 text-[12px] text-cgs-muted";

function ChannelChips({
  label,
  selected,
  onChange,
  exclude,
}: {
  label: string;
  selected: string[];
  onChange: (next: string[]) => void;
  exclude?: string;
}) {
  const pool = useMemo(
    () => Array.from(new Set([...CHANNEL_OPTIONS, ...selected])).filter((c) => c !== exclude),
    [selected, exclude],
  );
  return (
    <fieldset>
      <legend className="text-[12px] font-medium text-cgs-ink">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {pool.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((x) => x !== opt) : [...selected, opt])}
              className={`rounded-lg border px-2.5 py-1 text-[12.5px] transition-colors duration-150 ${
                on
                  ? "border-cgs-accent bg-cgs-accent-faint font-medium text-cgs-accent-deep"
                  : "border-cgs-line-strong bg-cgs-raised text-cgs-muted hover:border-cgs-faint hover:text-cgs-ink-soft"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function StrategyPage() {
  const { s2, setStrategy, data } = useStore();
  const s = s2.strategy;
  const ctx = useMemo(() => buildContext(data), [data]);
  const [prioDraft, setPrioDraft] = useState("");
  const [showMissing, setShowMissing] = useState(false);

  const missing = missingStrategyFields(s);
  const complete = missing.length === 0;
  const channels = strategyChannels(s);

  const addPriority = () => {
    const t = prioDraft.trim();
    if (t && !s.priorities.includes(t)) setStrategy({ priorities: [...s.priorities, t] });
    setPrioDraft("");
  };

  const updateList = (key: "priorities", next: string[]) => setStrategy({ [key]: next });

  return (
    <div className="mx-auto max-w-[860px] px-6 py-7 md:px-9">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
            <span>Acquire</span>
            <span aria-hidden>·</span>
            <span>Strategy</span>
          </div>
          <h2 className="mt-1.5 flex items-center gap-2 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">
            <Target size={20} className="text-cgs-accent" aria-hidden />
            Acquisition Strategy
          </h2>
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-cgs-ink-soft">
            Where you look for ideal clients, how you approach them, and what you ask them to do.
            Everything here feeds the Outreach workspace. Changes save automatically.
          </p>
        </div>
        <Pill tone={complete ? "complete" : s.updatedAt ? "refine" : "neutral"} title={complete ? "All required fields defined" : undefined}>
          {complete ? (
            <>
              <Check size={11} aria-hidden /> Strategy set
            </>
          ) : s.updatedAt ? (
            `${missing.length} item${missing.length === 1 ? "" : "s"} to finish`
          ) : (
            "Not defined"
          )}
        </Pill>
      </div>

      {/* Read from BUILD */}
      <section className={`${sectionCls} rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card`} aria-label="Context from Build">
        <h3 className={hCls}>What BUILD already answers</h3>
        <p className={subCls}>
          The strategy reads these directly — refine them in Build, and they update here. No copying.
        </p>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
          <ContextRef
            from="BUILD · Ideal Client"
            href={dHref("/build/ideal-client")}
            label="Target audience"
            value={[ctx.idealClientType, ctx.idealClientIndustry].filter(Boolean).join(" — ") || null}
          />
          <ContextRef
            from="BUILD · Positioning"
            href={dHref("/build/positioning")}
            label="Default message angle"
            value={ctx.positioningClaim || null}
          />
          <ContextRef
            from="BUILD · Offer"
            href={dHref("/build/offer")}
            label="What you are promoting"
            value={ctx.hasOffer ? [ctx.offerName, ctx.offerPrice, ctx.offerTimeline].filter(Boolean).join(" · ") : null}
            missing="Define your offer in Build so outreach has something concrete to promote."
          />
          <div className="rounded-lg border border-cgs-line bg-cgs-inset/40 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-cgs-faint">BUILD · Ideal Client</span>
              <Link href={dHref("/build/ideal-client")} className="inline-flex items-center gap-0.5 text-[11px] text-cgs-accent hover:text-cgs-accent-deep">
                edit <ChevronRight size={11} aria-hidden />
              </Link>
            </div>
            <div className="mt-1 text-[12px] font-medium text-cgs-muted">Qualification criteria on record</div>
            {ctx.qualificationCriteria.length ? (
              <ul className="mt-1 space-y-1">
                {ctx.qualificationCriteria.slice(0, 3).map((c) => (
                  <li key={c} className="flex items-start gap-2 text-[12.5px] leading-snug text-cgs-ink">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cgs-accent/60" aria-hidden />
                    {c}
                  </li>
                ))}
                {ctx.qualificationCriteria.length > 3 && (
                  <li className="text-[11.5px] text-cgs-faint">+{ctx.qualificationCriteria.length - 3} more</li>
                )}
              </ul>
            ) : (
              <p className="mt-0.5 text-[12.5px] text-cgs-refine">None defined yet — add them in Ideal Client.</p>
            )}
          </div>
        </div>
      </section>

      {/* Channels */}
      <section className={`${sectionCls} rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card`} aria-label="Channels">
        <h3 className={hCls}>Channels</h3>
        <p className={subCls}>One primary channel gets your consistent effort; everything else is support or experiment.</p>
        <div className="mt-4 space-y-4">
          <div className="max-w-sm">
            <ComboInput
              label="Primary channel"
              required
              value={s.primaryChannel}
              onChange={(v) => setStrategy({ primaryChannel: v })}
              suggestions={[...CHANNEL_OPTIONS, ...channels]}
              placeholder={CHANNEL_OPTIONS[0]}
              error={showMissing && !s.primaryChannel.trim() ? "Choose the channel you commit to weekly." : undefined}
            />
          </div>
          <ChannelChips
            label="Secondary channels"
            selected={s.secondaryChannels}
            onChange={(v) => setStrategy({ secondaryChannels: v })}
            exclude={s.primaryChannel}
          />
          <ChannelChips
            label="Experimental channels"
            selected={s.experimentalChannels}
            onChange={(v) => setStrategy({ experimentalChannels: v })}
            exclude={s.primaryChannel}
          />
        </div>
      </section>

      {/* Approach */}
      <section className={`${sectionCls} rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card`} aria-label="Approach and message">
        <h3 className={hCls}>Approach &amp; message</h3>
        <p className={subCls}>Only add an adjustment when a channel or audience needs one — the default comes from BUILD.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-[12px] font-medium text-cgs-ink">
              Target audience adjustment <span className="text-cgs-faint">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={s.audienceNote}
              placeholder="e.g. On LinkedIn, aim at heads of operations rather than founders."
              onChange={(e) => setStrategy({ audienceNote: e.target.value })}
              className="w-full resize-y rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] leading-relaxed text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[12px] font-medium text-cgs-ink">
              Messaging angle adjustment <span className="text-cgs-faint">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={s.angleNote}
              placeholder="e.g. Lead with the risk reversal, not the methodology, on cold email."
              onChange={(e) => setStrategy({ angleNote: e.target.value })}
              className="w-full resize-y rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] leading-relaxed text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
            />
          </label>
        </div>
        <div className="mt-4 space-y-4">
          <label className="block space-y-1">
            <span className="text-[12px] font-medium text-cgs-ink">
              Channel approach<span className="ml-1 text-cgs-accent" aria-hidden>*</span>
            </span>
            <textarea
              rows={3}
              value={s.channelApproach}
              placeholder="How you show up in the channel: helpful first? direct? a specific format or cadence of touches?"
              onChange={(e) => setStrategy({ channelApproach: e.target.value })}
              className="w-full resize-y rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] leading-relaxed text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-cgs-ink">
                Desired action<span className="ml-1 text-cgs-accent" aria-hidden>*</span>
              </span>
              <input
                type="text"
                value={s.desiredAction}
                placeholder="e.g. Reply to book a 20-minute diagnostic call"
                onChange={(e) => setStrategy({ desiredAction: e.target.value })}
                className="w-full rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-cgs-ink">
                Frequency<span className="ml-1 text-cgs-accent" aria-hidden>*</span>
              </span>
              <select
                value={s.frequency}
                onChange={(e) => setStrategy({ frequency: e.target.value })}
                className="w-full cursor-pointer rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink focus:border-cgs-accent"
              >
                <option value="">Select…</option>
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block max-w-56 space-y-1">
            <span className="text-[12px] font-medium text-cgs-ink">
              Weekly activity target<span className="ml-1 text-cgs-accent" aria-hidden>*</span>
            </span>
            <input
              type="number"
              min={1}
              value={s.weeklyTarget ?? ""}
              placeholder="e.g. 15"
              onChange={(e) => {
                const n = e.target.value === "" ? null : Math.max(0, Number(e.target.value));
                setStrategy({ weeklyTarget: n });
              }}
              className="w-full rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
            />
            <span className="text-[11.5px] text-cgs-faint">New touches you commit to per week. Outreach counts against it below.</span>
          </label>
        </div>
      </section>

      {/* Priorities & notes */}
      <section className={`${sectionCls} rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card`} aria-label="Priorities and notes">
        <h3 className={hCls}>Priorities</h3>
        <p className={subCls}>What matters most this cycle — segments, offers, timing. Keep it short.</p>
        <ul className="mt-2.5 space-y-1.5">
          {s.priorities.map((p) => (
            <li key={p} className="group flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cgs-accent/50" aria-hidden />
              <span className="flex-1 text-[13px] text-cgs-ink">{p}</span>
              <button
                type="button"
                onClick={() => updateList("priorities", s.priorities.filter((x) => x !== p))}
                aria-label={`Remove priority ${p}`}
                className="rounded-md p-1 text-transparent transition group-hover:text-cgs-faint hover:!text-cgs-danger hover:bg-cgs-danger-soft focus-visible:text-cgs-faint"
              >
                <X size={11} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex max-w-md items-center gap-2">
          <input
            type="text"
            value={prioDraft}
            onChange={(e) => setPrioDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPriority();
              }
            }}
            placeholder="e.g. Follow up on the retail segment first"
            aria-label="New priority"
            className="flex-1 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
          />
          <Button variant="secondary" size="sm" onClick={addPriority} disabled={!prioDraft.trim()}>
            Add
          </Button>
        </div>
        <label className="mt-5 block space-y-1">
          <span className="text-[12px] font-medium text-cgs-ink">Notes</span>
          <textarea
            rows={3}
            value={s.notes}
            placeholder="Anything about this strategy you want the future you to remember."
            onChange={(e) => setStrategy({ notes: e.target.value })}
            className="w-full resize-y rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 py-1.5 text-[13px] leading-relaxed text-cgs-ink placeholder:text-cgs-faint focus:border-cgs-accent"
          />
        </label>
      </section>

      {/* Footer bar */}
      <div className="sticky bottom-0 z-20 -mx-6 mt-7 border-t border-cgs-line bg-cgs-surface/90 px-6 py-3.5 backdrop-blur-sm md:-mx-9 md:px-9">
        {showMissing && !complete && (
          <p className="mb-2 text-[12px] text-cgs-danger" role="alert">
            Still required: {missing.join(", ")}.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[12px] text-cgs-muted">
            {complete
              ? `Strategy complete — ${channels.length} channel${channels.length === 1 ? "" : "s"} defined.`
              : "A strategy with a primary channel, approach, action, frequency and weekly target keeps outreach unambiguous."}
          </p>
          <div className="flex items-center gap-2.5">
            {!complete && (
              <Button variant="secondary" size="sm" onClick={() => setShowMissing(true)}>
                Check completeness
              </Button>
            )}
            <Link href={dHref("/acquire/outreach")}>
              <Button variant="primary" size="sm">
                <Send size={13} aria-hidden />
                Go to Outreach
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function X({ size = 12, ...rest }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden {...rest}>
      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
