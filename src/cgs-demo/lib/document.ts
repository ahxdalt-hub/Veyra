/**
 * Whole-workspace document utilities shared between the React store, the
 * SQLite loader and settings import — kept in its own module so neither the
 * store nor the persistence layer imports the other.
 */

import { AppData, MODULES, ModuleData, ModuleId, emptyData } from "@/cgs-demo/lib/stages";
import { normalizeStage2 } from "@/cgs-demo/lib/workflow";
import { normalizeStage3 } from "@/cgs-demo/lib/delivery";

/**
 * Validate + repair a whole-workspace document (settings → import, legacy
 * localStorage adoption, defensive merge of partial documents). Returns null
 * when the shape is wrong enough to risk data loss; tolerable partials are
 * normalized to a complete v1 document.
 */
export function normalizeImported(raw: unknown): AppData | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<AppData>;
  if (p.version !== 1 || !p.modules || typeof p.modules !== "object") return null;
  const base = emptyData();
  const mod = (id: ModuleId) => {
    const m = (p.modules as Record<string, unknown>)[id] as Partial<ModuleData> | undefined;
    return {
      fields: typeof m?.fields === "object" && m.fields ? m.fields : {},
      lists: typeof m?.lists === "object" && m.lists ? m.lists : {},
    };
  };
  return {
    ...base,
    version: 1,
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : base.updatedAt,
    lastModule: p.lastModule && (p.lastModule as string) in MODULES ? (p.lastModule as ModuleId) : null,
    modules: {
      foundation: mod("foundation"),
      positioning: mod("positioning"),
      offer: mod("offer"),
      "ideal-client": mod("ideal-client"),
    },
    status: { ...base.status, ...(p.status ?? {}) },
    log: Array.isArray(p.log) ? p.log.slice(0, 60) : [],
    stage2: normalizeStage2(p.stage2),
    stage3: normalizeStage3(p.stage3),
  };
}
