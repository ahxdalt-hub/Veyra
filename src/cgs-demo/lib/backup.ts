/**
 * Device-switch helpers for the Settings "Switching to a new computer?" flow.
 *
 * Deliberately pure and DOM-free (same rules as the vitest suite): the page
 * owns the Blob/FileReader plumbing, this module owns the three decisions
 * that must be testable — what the one-click export file is called, whether
 * a chosen file is a restorable backup, and the one-line summary shown
 * before the single confirm.
 *
 * The file CONTENT is unchanged: the export path already writes the whole
 * workspace document (JSON.stringify(data)), and an import accepts anything
 * normalizeImported understands — today's backups and older/legacy ones alike.
 */

import { AppData } from "@/cgs-demo/lib/stages";
import { normalizeImported } from "@/cgs-demo/lib/document";
import { stage2 } from "@/cgs-demo/lib/workflow";
import { stage3 } from "@/cgs-demo/lib/delivery";

/**
 * Filename for the one-click export: `Client-Growth-System-Backup-YYYY-MM-DD.json`
 * with today's LOCAL date (an ISO/UTC slice would misdate files exported in
 * the evening). No spaces — the name survives email attachments and drag
 * between machines untouched.
 */
export function backupFileName(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `Client-Growth-System-Backup-${y}-${m}-${d}.json`;
}

export type ParsedBackup =
  | { ok: true; data: AppData }
  | { ok: false; error: string };

/**
 * Parse the text of a chosen backup file and validate it WITHOUT applying
 * anything. Returns the normalized workspace document (ready for
 * store.replaceAll) or a user-facing reason the file can't be restored.
 */
export function parseBackupText(text: string): ParsedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Could not read that file as JSON." };
  }
  const data = normalizeImported(parsed);
  if (!data) {
    return { ok: false, error: "That file is not a valid backup of the Client Growth System — nothing was changed." };
  }
  return { ok: true, data };
}

/**
 * One line describing what the file holds, shown before the confirm so the
 * customer recognises their own data. Only counts that are already in the
 * document — no extra scanning.
 */
export function summarizeBackup(data: AppData): string {
  const s2 = stage2(data);
  const s3 = stage3(data);
  const modules = Object.values(data.status).filter((v) => v === "complete").length;
  return [
    `${modules} ${modules === 1 ? "module" : "modules"} complete`,
    plural(s2.outreach.length, "outreach record"),
    plural(s2.opportunities.length, "opportunity", "opportunities"),
    plural(s3.clients.length, "client"),
  ].join(" · ");
}

function plural(n: number, one: string, many?: string): string {
  return `${n} ${n === 1 ? one : many ?? `${one}s`}`;
}
