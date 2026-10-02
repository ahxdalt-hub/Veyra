"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  AppData,
  BlockMeta,
  EntryItem,
  MODULE_ORDER,
  ModuleData,
  ModuleId,
  ModuleMeta,
  MODULES,
  STAGES,
  TextItem,
  isFieldFilled,
  listFilled,
  missingRequirements,
  moduleStatus,
  requiredCount,
  requiredFilledCount,
  uid,
  LogEntry,
} from "@/cgs-demo/lib/stages";
import { fireDemoBlocked } from "@/cgs-demo/lib/demo-guard";
import { demoSeed } from "@/cgs-demo/lib/demo-seed";
import { normalizeStage2 } from "@/cgs-demo/lib/workflow";
import {
  AcquisitionStrategy,
  FollowUpTask,
  Opportunity,
  OutreachRecord,
  OutreachStatus,
  Proposal,
  Stage2Data,
  applyStatusChange,
  emptyStage2,
  syncFollowUpForOutreach,
} from "@/cgs-demo/lib/workflow";
import {
  Client,
  GrowthReview,
  Onboarding,
  OnboardingTask,
  OnboardingTemplate,
  RetentionAction,
  RetentionReview,
  Stage3Data,
  normalizeStage3,
  reviewCompletionEffects,
} from "@/cgs-demo/lib/delivery";

/* --------------------------------- context -------------------------------- */

interface StoreValue {
  ready: boolean;
  error: string | null;
  data: AppData;
  setField(moduleId: ModuleId, key: string, value: string | string[]): void;
  addItem(moduleId: ModuleId, block: BlockMeta): void;
  updateItem(
    moduleId: ModuleId,
    blockId: string,
    itemId: string,
    patch: Partial<TextItem & EntryItem>,
  ): void;
  removeItem(moduleId: ModuleId, blockId: string, itemId: string): void;
  completeModule(moduleId: ModuleId): void;
  reopenModule(moduleId: ModuleId): void;
  setLastModule(moduleId: ModuleId): void;
  clearAll(): void;
  /** Replace the whole workspace document (settings → import). Validates before storing. */
  replaceAll(next: AppData): boolean;
  retryPersist(): void;

  /* Stage 2 — ACQUIRE + SELL */
  s2: Stage2Data;
  setStrategy(patch: Partial<AcquisitionStrategy>): void;
  addOutreach(rec: OutreachRecord): void;
  updateOutreach(id: string, patch: Partial<OutreachRecord>): void;
  setOutreachStatus(ids: string[], status: OutreachStatus): void;
  removeOutreach(ids: string[]): void;
  addFollowUp(task: FollowUpTask): void;
  updateFollowUp(id: string, patch: Partial<FollowUpTask>): void;
  completeFollowUp(id: string): void;
  reopenFollowUp(id: string): void;
  removeFollowUp(id: string): void;
  addOpportunity(opp: Opportunity): void;
  updateOpportunity(id: string, patch: Partial<Opportunity>): void;
  logOpportunity(id: string, text: string): void;
  removeOpportunity(id: string): void;
  addProposal(p: Proposal): void;
  updateProposal(id: string, patch: Partial<Proposal>): void;
  removeProposal(id: string): void;

  /* Stage 3 — DELIVER + RETAIN + GROW */
  s3: Stage3Data;
  saveTemplate(t: OnboardingTemplate): void;
  removeTemplate(id: string): void;
  addOnboarding(ob: Onboarding, logText?: string): void;
  updateOnboarding(id: string, patch: Partial<Onboarding>): void;
  setOnboardingTaskStatus(obId: string, taskId: string, status: OnboardingTask["status"]): void;
  updateOnboardingTask(obId: string, taskId: string, patch: Partial<OnboardingTask>): void;
  addOnboardingTask(obId: string, task: OnboardingTask): void;
  removeOnboardingTask(obId: string, taskId: string): void;
  completeOnboarding(obId: string): Client | null;
  archiveOnboarding(obId: string): void;
  addClient(c: Client, logText?: string): void;
  updateClient(id: string, patch: Partial<Client>): void;
  removeClient(id: string): void;
  addRetentionAction(a: RetentionAction): void;
  updateRetentionAction(id: string, patch: Partial<RetentionAction>): void;
  completeRetentionAction(id: string): void;
  reopenRetentionAction(id: string): void;
  removeRetentionAction(id: string): void;
  addReview(r: RetentionReview): void;
  updateReview(id: string, patch: Partial<RetentionReview>): void;
  completeReview(id: string): void;
  removeReview(id: string): void;
  addGrowthReview(g: GrowthReview): void;
  updateGrowthReview(id: string, patch: Partial<GrowthReview>): void;
  removeGrowthReview(id: string): void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Demo: the workspace is a fictional studio seeded synchronously at load.
  // There is no database to hydrate from, so the app is ready on frame one.
  const [ready] = useState(true);
  const [error] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(() => demoSeed());

  // Demo guard: every content mutation in the app flows through this helper.
  // Here it performs no state change and reports the attempt to the block
  // popup instead. The `fn` transforms remain wired to each action exactly as
  // the desktop app defines them — they simply never run.
  const mutate = useCallback((_fn: (d: AppData) => AppData) => {
    fireDemoBlocked("edit");
  }, []);

  const log = (d: AppData, text: string, moduleId?: ModuleId): LogEntry[] => {
    const entry: LogEntry = { id: uid(), at: new Date().toISOString(), text, module: moduleId };
    return [entry, ...d.log].slice(0, 60);
  };

  const setField = useCallback(
    (moduleId: ModuleId, key: string, value: string | string[]) =>
      mutate((d) => ({
        ...d,
        modules: {
          ...d.modules,
          [moduleId]: {
            ...d.modules[moduleId],
            fields: { ...d.modules[moduleId].fields, [key]: value },
          },
        },
      })),
    [mutate],
  );

  const listItems = (m: ModuleData, blockId: string): (TextItem | EntryItem)[] =>
    m.lists[blockId] ?? [];

  const addItem = useCallback(
    (moduleId: ModuleId, block: BlockMeta) => {
      if (!block.list) return;
      mutate((d) => {
        const m = d.modules[moduleId];
        const items = listItems(m, block.id);
        const next =
          block.list!.itemKind === "text"
            ? [...items, { id: uid(), text: "" } as TextItem]
            : [...items, { id: uid(), title: "", detail: "" } as EntryItem];
        return {
          ...d,
          modules: { ...d.modules, [moduleId]: { ...m, lists: { ...m.lists, [block.id]: next } } },
        };
      });
    },
    [mutate],
  );

  const updateItem = useCallback(
    (moduleId: ModuleId, blockId: string, itemId: string, patch: Partial<TextItem & EntryItem>) =>
      mutate((d) => {
        const m = d.modules[moduleId];
        const items = (m.lists[blockId] ?? []).map((i) =>
          i.id === itemId ? { ...i, ...patch } : i,
        );
        return {
          ...d,
          modules: { ...d.modules, [moduleId]: { ...m, lists: { ...m.lists, [blockId]: items } } },
        };
      }),
    [mutate],
  );

  const removeItem = useCallback(
    (moduleId: ModuleId, blockId: string, itemId: string) =>
      mutate((d) => {
        const m = d.modules[moduleId];
        const items = (m.lists[blockId] ?? []).filter((i) => i.id !== itemId);
        return {
          ...d,
          modules: { ...d.modules, [moduleId]: { ...m, lists: { ...m.lists, [blockId]: items } } },
        };
      }),
    [mutate],
  );

  const completeModule = useCallback(
    (moduleId: ModuleId) =>
      mutate((d) => {
        const meta = MODULES[moduleId];
        const missing = missingRequirements(meta, d.modules[moduleId]);
        if (missing.length > 0) return d;
        return {
          ...d,
          status: { ...d.status, [moduleId]: "complete" },
          log: log(d, `Completed “${meta.title}”`, moduleId),
        };
      }),
    [mutate],
  );

  const reopenModule = useCallback(
    (moduleId: ModuleId) =>
      mutate((d) => ({
        ...d,
        status: { ...d.status, [moduleId]: "draft" },
        log: log(d, `Reopened “${MODULES[moduleId].title}” for editing`, moduleId),
      })),
    [mutate],
  );

  const setLastModule = useCallback(
    (moduleId: ModuleId) =>
      setData((prev) =>
        prev.lastModule === moduleId ? prev : { ...prev, lastModule: moduleId },
      ),
    [],
  );

  const clearAll = useCallback(() => {
    fireDemoBlocked("reset");
  }, []);

  const replaceAll = useCallback((_next: AppData): boolean => {
    fireDemoBlocked("import");
    return false;
  }, []);

  const retryPersist = useCallback(() => {}, []);

  /* ------------------------------ Stage 2 -------------------------------- */

  // Stage-2 record ops share one helper so every mutation stays inside the
  // same debounced persistence path as BUILD edits.
  const mutateS2 = useCallback(
    (fn: (s: Stage2Data) => Stage2Data) =>
      mutate((d) => ({ ...d, stage2: fn(d.stage2 ?? emptyStage2()) })),
    [mutate],
  );

  const setStrategy = useCallback(
    (patch: Partial<AcquisitionStrategy>) =>
      mutateS2((s) => ({
        ...s,
        strategy: { ...s.strategy, ...patch, updatedAt: new Date().toISOString() },
      })),
    [mutateS2],
  );

  const addOutreach = useCallback(
    (rec: OutreachRecord) =>
      mutateS2((s) => {
        const synced = syncFollowUpForOutreach(s.followUps, rec);
        return { ...s, outreach: [rec, ...s.outreach], followUps: synced };
      }),
    [mutateS2],
  );

  const updateOutreach = useCallback(
    (id: string, patch: Partial<OutreachRecord>) =>
      mutateS2((s) => {
        const outreach = s.outreach.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
        );
        const rec = outreach.find((r) => r.id === id);
        // The record may have been deleted in another window — save the edit
        // without trying to sync a follow-up for a record that no longer exists.
        return { ...s, outreach, followUps: rec ? syncFollowUpForOutreach(s.followUps, rec) : s.followUps };
      }),
    [mutateS2],
  );

  const setOutreachStatus = useCallback(
    (ids: string[], status: OutreachStatus) =>
      mutateS2((s) => {
        const outreach = s.outreach.map((r) =>
          ids.includes(r.id) ? applyStatusChange(r, status) : r,
        );
        let followUps = s.followUps;
        for (const rec of outreach)
          if (ids.includes(rec.id)) followUps = syncFollowUpForOutreach(followUps, rec);
        return { ...s, outreach, followUps };
      }),
    [mutateS2],
  );

  const removeOutreach = useCallback(
    (ids: string[]) =>
      mutateS2((s) => {
        const set = new Set(ids);
        return {
          ...s,
          outreach: s.outreach.filter((r) => !set.has(r.id)),
          // Detach rather than delete: a follow-up may be evidence of work done.
          followUps: s.followUps.map((t) =>
            t.outreachId && set.has(t.outreachId) ? { ...t, outreachId: null, origin: "manual" as const } : t,
          ),
        };
      }),
    [mutateS2],
  );

  const addFollowUp = useCallback(
    (task: FollowUpTask) =>
      mutateS2((s) => ({ ...s, followUps: [{ ...task, origin: "manual" }, ...s.followUps] })),
    [mutateS2],
  );

  const updateFollowUp = useCallback(
    (id: string, patch: Partial<FollowUpTask>) =>
      mutateS2((s) => ({
        ...s,
        followUps: s.followUps.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),
    [mutateS2],
  );

  const completeFollowUp = useCallback(
    (id: string) =>
      mutateS2((s) => {
        const task = s.followUps.find((t) => t.id === id);
        const followUps = s.followUps.map((t) =>
          t.id === id ? { ...t, completedAt: new Date().toISOString() } : t,
        );
        // Clear the mirrored date on the record, or the next record edit
        // would recreate this very task.
        if (!task || task.completedAt || !task.outreachId) return { ...s, followUps };
        return {
          ...s,
          followUps,
          outreach: s.outreach.map((r) =>
            r.id === task.outreachId ? { ...r, nextFollowUpDate: null, updatedAt: new Date().toISOString() } : r,
          ),
        };
      }),
    [mutateS2],
  );

  const reopenFollowUp = useCallback(
    (id: string) =>
      mutateS2((s) => {
        const task = s.followUps.find((t) => t.id === id);
        const followUps = s.followUps.map((t) => (t.id === id ? { ...t, completedAt: null } : t));
        if (!task || !task.outreachId) return { ...s, followUps };
        return {
          ...s,
          followUps,
          outreach: s.outreach.map((r) =>
            r.id === task.outreachId ? { ...r, nextFollowUpDate: task.dueDate, updatedAt: new Date().toISOString() } : r,
          ),
        };
      }),
    [mutateS2],
  );

  const removeFollowUp = useCallback(
    (id: string) =>
      mutateS2((s) => {
        const task = s.followUps.find((t) => t.id === id);
        const followUps = s.followUps.filter((t) => t.id !== id);
        // Deleting an open task that mirrors a record must clear the record's
        // date, or the next record edit would resurrect the task.
        if (task && task.outreachId && !task.completedAt) {
          return {
            ...s,
            followUps,
            outreach: s.outreach.map((r) =>
              r.id === task.outreachId ? { ...r, nextFollowUpDate: null, updatedAt: new Date().toISOString() } : r,
            ),
          };
        }
        return { ...s, followUps };
      }),
    [mutateS2],
  );

  const addOpportunity = useCallback(
    (opp: Opportunity) =>
      mutate((d) => {
        const s = d.stage2 ?? emptyStage2();
        const entry: LogEntry = {
          id: uid(),
          at: new Date().toISOString(),
          text: `Sales opportunity opened for ${opp.company || opp.prospect}.`,
        };
        return {
          ...d,
          stage2: { ...s, opportunities: [opp, ...s.opportunities] },
          log: [entry, ...(d.log ?? [])].slice(0, 60),
        };
      }),
    [mutate],
  );

  const updateOpportunity = useCallback(
    (id: string, patch: Partial<Opportunity>) =>
      mutateS2((s) => {
        const substantive = Object.keys(patch).some(
          (k) => k !== "activities" && k !== "lastActivityAt",
        );
        return {
          ...s,
          opportunities: s.opportunities.map((o) =>
            o.id === id
              ? {
                  ...o,
                  ...patch,
                  lastActivityAt: patch.lastActivityAt ?? (substantive ? new Date().toISOString() : o.lastActivityAt),
                }
              : o,
          ),
        };
      }),
    [mutateS2],
  );

  const logOpportunity = useCallback(
    (id: string, text: string) =>
      mutateS2((s) => ({
        ...s,
        opportunities: s.opportunities.map((o) => {
          if (o.id !== id) return o;
          const entry = { id: uid(), at: new Date().toISOString(), text };
          return {
            ...o,
            activities: [entry, ...o.activities].slice(0, 80),
            lastActivityAt: entry.at,
          };
        }),
      })),
    [mutateS2],
  );

  const removeOpportunity = useCallback(
    (id: string) =>
      mutateS2((s) => ({
        ...s,
        opportunities: s.opportunities.filter((o) => o.id !== id),
        proposals: s.proposals.map((p) => (p.opportunityId === id ? { ...p, opportunityId: null } : p)),
      })),
    [mutateS2],
  );

  const addProposal = useCallback(
    (p: Proposal) =>
      mutateS2((s) => ({ ...s, proposals: [p, ...s.proposals] })),
    [mutateS2],
  );

  const updateProposal = useCallback(
    (id: string, patch: Partial<Proposal>) =>
      mutateS2((s) => ({
        ...s,
        proposals: s.proposals.map((p) =>
          p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
        ),
      })),
    [mutateS2],
  );

  const removeProposal = useCallback(
    (id: string) =>
      mutateS2((s) => ({
        ...s,
        proposals: s.proposals.filter((p) => p.id !== id),
      })),
    [mutateS2],
  );

  /* ------------------------------ Stage 3 -------------------------------- */

  const mutateS3 = useCallback(
    (fn: (s: Stage3Data) => Stage3Data) =>
      mutate((d) => ({ ...d, stage3: fn(normalizeStage3(d.stage3)) })),
    [mutate],
  );

  const s3Log = (d: AppData, text: string): AppData => {
    const entry: LogEntry = { id: uid(), at: new Date().toISOString(), text };
    return { ...d, log: [entry, ...(d.log ?? [])].slice(0, 60) };
  };

  const saveTemplate = useCallback(
    (t: OnboardingTemplate) =>
      mutateS3((s) => {
        const exists = s.templates.some((x) => x.id === t.id);
        const stamped = { ...t, updatedAt: new Date().toISOString() };
        return {
          ...s,
          templates: exists
            ? s.templates.map((x) => (x.id === t.id ? stamped : x))
            : [...s.templates, stamped],
        };
      }),
    [mutateS3],
  );

  const removeTemplate = useCallback(
    (id: string) =>
      mutateS3((s) => ({
        ...s,
        // Built-ins are structural defaults; instances snapshot their template
        // name, so removing a custom template never rewrites history.
        templates: s.templates.filter((t) => t.id !== id || t.builtIn),
      })),
    [mutateS3],
  );

  const addOnboarding = useCallback(
    (ob: Onboarding, logText?: string) =>
      mutate((d) => {
        const s = normalizeStage3(d.stage3);
        const text = logText ?? `Onboarding started for ${ob.company || ob.contact}.`;
        return s3Log({ ...d, stage3: { ...s, onboardings: [ob, ...s.onboardings] } }, text);
      }),
    [mutate],
  );

  const updateOnboarding = useCallback(
    (id: string, patch: Partial<Onboarding>) =>
      mutateS3((s) => ({
        ...s,
        onboardings: s.onboardings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      })),
    [mutateS3],
  );

  const setOnboardingTaskStatus = useCallback(
    (obId: string, taskId: string, status: OnboardingTask["status"]) =>
      mutateS3((s) => ({
        ...s,
        onboardings: s.onboardings.map((o) => {
          if (o.id !== obId) return o;
          const tasks = o.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status,
                  completedAt: status === "done" || status === "skipped" ? new Date().toISOString() : null,
                }
              : t,
          );
          return { ...o, tasks };
        }),
      })),
    [mutateS3],
  );

  const updateOnboardingTask = useCallback(
    (obId: string, taskId: string, patch: Partial<OnboardingTask>) =>
      mutateS3((s) => ({
        ...s,
        onboardings: s.onboardings.map((o) =>
          o.id === obId
            ? { ...o, tasks: o.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
            : o,
        ),
      })),
    [mutateS3],
  );

  const addOnboardingTask = useCallback(
    (obId: string, task: OnboardingTask) =>
      mutateS3((s) => ({
        ...s,
        onboardings: s.onboardings.map((o) =>
          o.id === obId ? { ...o, tasks: [...o.tasks, task] } : o,
        ),
      })),
    [mutateS3],
  );

  const removeOnboardingTask = useCallback(
    (obId: string, taskId: string) =>
      mutateS3((s) => ({
        ...s,
        onboardings: s.onboardings.map((o) =>
          o.id === obId ? { ...o, tasks: o.tasks.filter((t) => t.id !== taskId) } : o,
        ),
      })),
    [mutateS3],
  );

  // Demo: the desktop version creates the client and routes you to it; here
  // the attempt is intercepted and nothing is created.
  const completeOnboarding = useCallback((_obId: string): Client | null => {
    fireDemoBlocked("complete");
    return null;
  }, []);

  const archiveOnboarding = useCallback(
    (obId: string) =>
      mutateS3((s) => ({
        ...s,
        onboardings: s.onboardings.map((o) =>
          o.id === obId ? { ...o, status: "archived" as const } : o,
        ),
      })),
    [mutateS3],
  );

  const addClient = useCallback(
    (c: Client, logText?: string) =>
      mutate((d) => {
        const s = normalizeStage3(d.stage3);
        const text = logText ?? `Client added: ${c.company || c.contact}.`;
        return s3Log({ ...d, stage3: { ...s, clients: [c, ...s.clients] } }, text);
      }),
    [mutate],
  );

  const updateClient = useCallback(
    (id: string, patch: Partial<Client>) =>
      mutateS3((s) => ({
        ...s,
        clients: s.clients.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
        ),
      })),
    [mutateS3],
  );

  const removeClient = useCallback(
    (id: string) =>
      mutateS3((s) => ({
        ...s,
        clients: s.clients.filter((c) => c.id !== id),
        actions: s.actions.filter((a) => a.clientId !== id),
        reviews: s.reviews.filter((r) => r.clientId !== id),
      })),
    [mutateS3],
  );

  const addRetentionAction = useCallback(
    (a: RetentionAction) =>
      mutateS3((s) => ({ ...s, actions: [a, ...s.actions] })),
    [mutateS3],
  );

  const updateRetentionAction = useCallback(
    (id: string, patch: Partial<RetentionAction>) =>
      mutateS3((s) => ({
        ...s,
        actions: s.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),
    [mutateS3],
  );

  const completeRetentionAction = useCallback(
    (id: string) =>
      mutateS3((s) => ({
        ...s,
        actions: s.actions.map((a) =>
          a.id === id ? { ...a, completedAt: new Date().toISOString() } : a,
        ),
      })),
    [mutateS3],
  );

  const reopenRetentionAction = useCallback(
    (id: string) =>
      mutateS3((s) => ({
        ...s,
        actions: s.actions.map((a) => (a.id === id ? { ...a, completedAt: null } : a)),
      })),
    [mutateS3],
  );

  const removeRetentionAction = useCallback(
    (id: string) =>
      mutateS3((s) => ({ ...s, actions: s.actions.filter((a) => a.id !== id) })),
    [mutateS3],
  );

  const addReview = useCallback(
    (r: RetentionReview) => mutateS3((s) => ({ ...s, reviews: [r, ...s.reviews] })),
    [mutateS3],
  );

  const updateReview = useCallback(
    (id: string, patch: Partial<RetentionReview>) =>
      mutateS3((s) => ({
        ...s,
        reviews: s.reviews.map((r) =>
          r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r,
        ),
      })),
    [mutateS3],
  );

  // Completing a review is the RETAIN write-back moment: the answers update
  // the client and queue the follow-up action, per the pure rule in delivery.ts.
  const completeReview = useCallback(
    (id: string) =>
      mutate((d) => {
        const s = normalizeStage3(d.stage3);
        const review = s.reviews.find((r) => r.id === id);
        const client = review ? s.clients.find((c) => c.id === review.clientId) : undefined;
        if (!review || !client) return d;
        const nowIso = new Date().toISOString();
        const { clientPatch, newAction } = reviewCompletionEffects(review, client);
        return s3Log(
          {
            ...d,
            stage3: {
              ...s,
              reviews: s.reviews.map((r) =>
                r.id === id ? { ...r, completedAt: nowIso, updatedAt: nowIso } : r,
              ),
              clients: s.clients.map((c) =>
                c.id === client.id ? { ...c, ...clientPatch, updatedAt: nowIso } : c,
              ),
              actions: newAction ? [newAction, ...s.actions] : s.actions,
            },
          },
          `Retention review completed for ${client.company || client.contact}.`,
        );
      }),
    [mutate],
  );

  const removeReview = useCallback(
    (id: string) =>
      mutateS3((s) => ({ ...s, reviews: s.reviews.filter((r) => r.id !== id) })),
    [mutateS3],
  );

  const addGrowthReview = useCallback(
    (g: GrowthReview) =>
      mutate((d) => {
        const s = normalizeStage3(d.stage3);
        return s3Log(
          { ...d, stage3: { ...s, growthReviews: [g, ...s.growthReviews] } },
          `Growth review opened: ${g.label || g.period}.`,
        );
      }),
    [mutate],
  );

  const updateGrowthReview = useCallback(
    (id: string, patch: Partial<GrowthReview>) =>
      mutateS3((s) => ({
        ...s,
        growthReviews: s.growthReviews.map((g) =>
          g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g,
        ),
      })),
    [mutateS3],
  );

  const removeGrowthReview = useCallback(
    (id: string) =>
      mutateS3((s) => ({
        ...s,
        growthReviews: s.growthReviews.filter((g) => g.id !== id),
      })),
    [mutateS3],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      error,
      data,
      setField,
      addItem,
      updateItem,
      removeItem,
      completeModule,
      reopenModule,
      setLastModule,
      clearAll,
      replaceAll,
      retryPersist,
      s2: normalizeStage2(data.stage2),
      setStrategy,
      addOutreach,
      updateOutreach,
      setOutreachStatus,
      removeOutreach,
      addFollowUp,
      updateFollowUp,
      completeFollowUp,
      reopenFollowUp,
      removeFollowUp,
      addOpportunity,
      updateOpportunity,
      logOpportunity,
      removeOpportunity,
      addProposal,
      updateProposal,
      removeProposal,
      s3: normalizeStage3(data.stage3),
      saveTemplate,
      removeTemplate,
      addOnboarding,
      updateOnboarding,
      setOnboardingTaskStatus,
      updateOnboardingTask,
      addOnboardingTask,
      removeOnboardingTask,
      completeOnboarding,
      archiveOnboarding,
      addClient,
      updateClient,
      removeClient,
      addRetentionAction,
      updateRetentionAction,
      completeRetentionAction,
      reopenRetentionAction,
      removeRetentionAction,
      addReview,
      updateReview,
      completeReview,
      removeReview,
      addGrowthReview,
      updateGrowthReview,
      removeGrowthReview,
    }),
    [
      ready, error, data, setField, addItem, updateItem, removeItem, completeModule,
      reopenModule, setLastModule, clearAll, replaceAll, retryPersist,
      setStrategy, addOutreach, updateOutreach, setOutreachStatus, removeOutreach,
      addFollowUp, updateFollowUp, completeFollowUp, reopenFollowUp, removeFollowUp,
      addOpportunity, updateOpportunity, logOpportunity, removeOpportunity,
      addProposal, updateProposal, removeProposal,
      saveTemplate, removeTemplate, addOnboarding, updateOnboarding,
      setOnboardingTaskStatus, updateOnboardingTask, addOnboardingTask, removeOnboardingTask,
      completeOnboarding, archiveOnboarding, addClient, updateClient, removeClient,
      addRetentionAction, updateRetentionAction, completeRetentionAction,
      reopenRetentionAction, removeRetentionAction,
      addReview, updateReview, completeReview, removeReview,
      addGrowthReview, updateGrowthReview, removeGrowthReview,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* -------------------------------- selectors ------------------------------- */

export interface ModuleProgress {
  id: ModuleId;
  meta: ModuleMeta;
  status: ReturnType<typeof moduleStatus>;
  filled: number;
  total: number;
  missing: string[];
}

export function useBuildProgress(): {
  modules: ModuleProgress[];
  completeCount: number;
  totalModules: number;
  stage: (typeof STAGES)[number];
} {
  const { data } = useStore();
  return useMemo(() => {
    const modules = MODULE_ORDER.map<ModuleProgress>((id) => {
      const meta = MODULES[id];
      const m = data.modules[id];
      return {
        id,
        meta,
        status: moduleStatus(meta, data, id),
        filled: requiredFilledCount(meta, m),
        total: requiredCount(meta),
        missing: missingRequirements(meta, m),
      };
    });
    const stage = STAGES[0];
    return {
      modules,
      completeCount: modules.filter((x) => x.status === "complete").length,
      totalModules: modules.length,
      stage,
    };
  }, [data]);
}

/** The single most useful "work on this next" pick for the dashboard. */
export function useContinueWhere(): ModuleProgress | null {
  const { modules } = useBuildProgress();
  const { data } = useStore();
  return useMemo(() => {
    // Revisit a marked-complete module that lost required content first.
    const review = modules.find((m) => m.status === "needs-review");
    if (review) return review;
    // Then the last module the user actually touched, if unfinished.
    if (data.lastModule) {
      const last = modules.find((m) => m.id === data.lastModule);
      if (last && last.status === "in-progress") return last;
    }
    // Then the first in-progress, then the first untouched (ordered).
    return (
      modules.find((m) => m.status === "in-progress") ??
      modules.find((m) => m.status === "not-started") ??
      null
    );
  }, [modules, data.lastModule]);
}

/** Modules needing attention: in progress with stale gaps, or complete-but-broken. */
export function useNeedsAttention(): ModuleProgress[] {
  const { modules } = useBuildProgress();
  return useMemo(
    () => modules.filter((m) => m.status === "needs-review" || (m.status === "in-progress" && m.filled > 0)),
    [modules],
  );
}

export function fieldFilledCount(meta: ModuleMeta, m: ModuleData): number {
  let n = 0;
  for (const b of meta.blocks) {
    for (const f of b.fields ?? []) if (isFieldFilled(f, m)) n += 1;
    if (b.list && listFilled(b.list, m)) n += 1;
  }
  return n;
}
