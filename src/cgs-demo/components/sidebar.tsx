"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { STAGES } from "@/cgs-demo/lib/stages";
import { ModuleStatus } from "@/cgs-demo/lib/stages";
import { dHref, relPath } from "@/cgs-demo/lib/demo-paths";
import { useBuildProgress, useStore } from "@/cgs-demo/lib/store";
import { countFollowUps, openOpportunities } from "@/cgs-demo/lib/workflow";
import {
  clientReviewStatus,
  countRetentionActions,
  dueOnboardingTasks,
  onboardingProgress,
} from "@/cgs-demo/lib/delivery";

const STATUS_DOT: Record<ModuleStatus, string> = {
  "not-started": "bg-cgs-line-strong",
  "in-progress": "bg-cgs-accent",
  complete: "bg-cgs-complete",
  "needs-review": "bg-cgs-refine",
};

function NavItem({
  href,
  active,
  disabled,
  children,
  trailing,
  indent,
}: {
  href: string;
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  indent?: boolean;
}) {
  const reduce = useReducedMotion();
  const cls = `group relative flex items-center justify-between gap-2 rounded-lg py-[7px] pr-2.5 text-[13px] transition-colors duration-150 ${
    indent ? "pl-8" : "pl-2.5"
  } ${
    disabled
      ? "cursor-default text-cgs-faint"
      : active
        ? "bg-cgs-accent-faint text-cgs-accent-deep font-medium"
        : "text-cgs-ink-soft hover:bg-cgs-inset hover:text-cgs-ink"
  }`;
  if (disabled) {
    return (
      <span className={cls} aria-disabled="true" title="Coming in a later stage of the system">
        {children}
        {trailing}
      </span>
    );
  }
  return (
    <Link href={dHref(href)} className={cls} aria-current={active ? "page" : undefined}>
      {children}
      {trailing}
      {active && !reduce && (
        <motion.span
          layoutId="nav-active"
          className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-cgs-accent"
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      )}
      {active && reduce && (
        <span className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-cgs-accent" />
      )}
    </Link>
  );
}

function CountBadge({ n, urgent }: { n: number; urgent?: boolean }) {
  if (n <= 0) return null;
  return (
    <span
      aria-label={`${n} needing attention`}
      className={`min-w-4.5 rounded-full px-1.5 py-px text-center text-[10px] font-semibold tabular-nums ${
        urgent ? "bg-cgs-danger text-[#fbf1ef]" : "bg-cgs-inset text-cgs-muted"
      }`}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export default function Sidebar() {
  // Demo copy: map the browser pathname back to the desktop app's shape so
  // active-state comparisons against stages.ts hrefs keep working.
  const pathname = relPath(usePathname());
  const { modules } = useBuildProgress();
  const { data, s2, s3 } = useStore();
  const build = STAGES[0];
  const acquire = STAGES[1];
  const sell = STAGES[2];
  const deliver = STAGES[3];
  const retain = STAGES[4];
  const grow = STAGES[5];
  const now = new Date();
  const fu = countFollowUps(s2.followUps, now);
  const attention = fu.overdue + fu.dueToday;
  const openOpps = openOpportunities(data).length;
  const wonWaiting = s2.opportunities.filter(
    (o) => o.outcome === "won" && !s3.onboardings.some((ob) => ob.opportunityId === o.id),
  ).length;
  const activeOb = s3.onboardings.filter((o) => o.status === "active");
  const obOverdue = dueOnboardingTasks(s3.onboardings, now).length;
  const obReady = activeOb.filter((o) => onboardingProgress(o).canComplete).length;
  const obAttention = obOverdue + obReady;
  const liveClients = s3.clients.filter((c) => ["active", "at-risk", "paused"].includes(c.status)).length;
  const ra = countRetentionActions(s3.actions, now);
  const retainDue =
    ra.overdue +
    ra.dueToday +
    s3.clients.filter((c) => {
      const st = clientReviewStatus(c, s3.reviews, now);
      return st === "overdue" || st === "due";
    }).length;
  const retainOverdue = ra.overdue > 0;

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-cgs-line bg-cgs-surface">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cgs-ink text-cgs-canvas font-cgs-display text-[15px] font-semibold">
          V
        </div>
        <div className="leading-tight">
          <div className="font-cgs-display text-[15px] font-semibold text-cgs-ink">Veyra</div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-cgs-faint">Client Growth</div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-6 pt-2" aria-label="Primary">
        <div className="space-y-0.5">
          <NavItem href="/" active={pathname === "/"}>
            Dashboard
          </NavItem>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between px-2.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cgs-faint">
              {build.number} · {build.label}
            </span>
          </div>
          <div className="space-y-0.5">
            {build.modules.map((m, i) => {
              const p = modules[i];
              return (
                <NavItem
                  key={m.id}
                  href={m.href}
                  active={pathname === m.href}
                  trailing={
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[p.status]}`}
                      title={p.status}
                      aria-hidden
                    />
                  }
                >
                  <span className="truncate">
                    <span className="mr-1.5 text-[11px] tabular-nums text-cgs-faint">{m.step}</span>
                    {m.title}
                  </span>
                </NavItem>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cgs-faint">
            {acquire.number} · {acquire.label}
          </div>
          <div className="space-y-0.5">
            {acquire.nav?.map((item) => (
              <NavItem
                key={item.id}
                href={item.href}
                active={pathname === item.href}
                trailing={
                  item.id === "follow-ups" ? (
                    <CountBadge n={attention} urgent={fu.overdue > 0} />
                  ) : item.id === "outreach" ? (
                    <CountBadge n={s2.outreach.filter((r) => r.status === "qualified").length} />
                  ) : undefined
                }
              >
                <span className="truncate">{item.label}</span>
              </NavItem>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cgs-faint">
            {sell.number} · {sell.label}
          </div>
          <div className="space-y-0.5">
            {sell.nav?.map((item) => (
              <NavItem
                key={item.id}
                href={item.href}
                active={pathname === item.href}
                trailing={item.id === "opportunities" ? <CountBadge n={openOpps} /> : undefined}
              >
                <span className="truncate">{item.label}</span>
              </NavItem>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cgs-faint">
            {deliver.number} · {deliver.label}
          </div>
          <div className="space-y-0.5">
            {deliver.nav?.map((item) => (
              <NavItem
                key={item.id}
                href={item.href}
                active={pathname === item.href}
                trailing={
                  <CountBadge
                    n={wonWaiting + obAttention}
                    urgent={obOverdue > 0}
                  />
                }
              >
                <span className="truncate">{item.label}</span>
              </NavItem>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cgs-faint">
            {retain.number} · {retain.label}
          </div>
          <div className="space-y-0.5">
            {retain.nav?.map((item) => (
              <NavItem
                key={item.id}
                href={item.href}
                active={pathname === item.href}
                trailing={
                  item.id === "clients" ? (
                    <CountBadge n={liveClients} />
                  ) : (
                    <CountBadge n={retainDue} urgent={retainOverdue} />
                  )
                }
              >
                <span className="truncate">{item.label}</span>
              </NavItem>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-cgs-faint">
            {grow.number} · {grow.label}
          </div>
          <div className="space-y-0.5">
            {grow.nav?.map((item) => (
              <NavItem key={item.id} href={item.href} active={pathname === item.href}>
                <span className="truncate">{item.label}</span>
              </NavItem>
            ))}
          </div>
        </div>

        <div className="space-y-0.5 border-t border-cgs-line/70 pt-4">
          <NavItem href="/settings" active={pathname === "/settings"}>
            Settings
          </NavItem>
        </div>
      </nav>

      <div className="border-t border-cgs-line/70 px-4 py-3 text-[11px] leading-relaxed text-cgs-faint">
        Interactive demo — browse freely.
        <br />
        Editing is switched off.
      </div>
    </aside>
  );
}
