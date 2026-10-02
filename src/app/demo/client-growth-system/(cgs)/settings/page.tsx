"use client";

/**
 * Settings — deliberately small. This is a local, single-document app: the
 * only practical settings are what is in the workspace, how to back it up,
 * and how to start over. No accounts, no integrations, no maze.
 */

import { dHref } from "@/cgs-demo/lib/demo-paths";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Check, Download, Settings, TriangleAlert, Upload } from "lucide-react";
import { AppData } from "@/cgs-demo/lib/stages";
import { normalizeImported } from "@/cgs-demo/lib/document";
import { backupFileName, parseBackupText, summarizeBackup } from "@/cgs-demo/lib/backup";
import { useStore } from "@/cgs-demo/lib/store";
import { wasJustBlocked } from "@/cgs-demo/lib/demo-guard";
import { useActivation } from "@/cgs-demo/lib/activation";
import { licenceHelpUrl } from "@/cgs-demo/lib/licensing/config";
import { stage2 } from "@/cgs-demo/lib/workflow";
import { stage3 } from "@/cgs-demo/lib/delivery";
import { Button, SectionTitle, formatWhen } from "@/cgs-demo/components/ui";

export default function SettingsPage() {
  const { data, ready, clearAll, replaceAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importMode, setImportMode] = useState<"merge-warn" | "confirm">("merge-warn");

  const say = (m: string) => {
    if (wasJustBlocked()) return;
    setFlash(m);
    setTimeout(() => setFlash(null), 3500);
  };

  if (!ready) return null;

  const s2 = stage2(data);
  const s3 = stage3(data);
  const counts: [string, number][] = [
    ["Build modules complete", Object.values(data.status).filter((v) => v === "complete").length],
    ["Outreach records", s2.outreach.length],
    ["Follow-ups", s2.followUps.length],
    ["Opportunities", s2.opportunities.length],
    ["Proposals", s2.proposals.length],
    ["Onboardings", s3.onboardings.length],
    ["Clients", s3.clients.length],
    ["Retention reviews", s3.reviews.filter((r) => r.completedAt).length],
    ["Growth reviews", s3.growthReviews.length],
  ];

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `veyra-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    say("Backup downloaded.");
  };

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData;
        if (!normalizeImported(parsed)) {
          say("That file is not a valid Veyra workspace — nothing was changed.");
          return;
        }
        if (replaceAll(parsed)) {
          say("Workspace restored from backup.");
        } else {
          say("Import failed — the file could not be stored.");
        }
      } catch {
        say("Could not read that file as JSON.");
      }
    };
    reader.readAsText(f);
  };

  return (
    <div className="mx-auto max-w-[720px] px-6 py-7 md:px-9">
      <div className="flex items-center gap-2 text-[12px] text-cgs-faint">
        <Settings size={13} aria-hidden />
        <span>Settings</span>
      </div>
      <h2 className="mt-1 font-cgs-display text-[24px] font-semibold leading-tight text-cgs-ink">Settings</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-cgs-muted">
        Everything lives in a local database on this computer. There is no account to manage and nothing to
        sync — just know what is in your workspace and keep a backup.
      </p>

      <div className="mt-7 space-y-6">
        {/* Workspace */}
        <section className="rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card">
          <SectionTitle>Your workspace</SectionTitle>
          <p className="mt-1 text-[12.5px] text-cgs-muted">
            {data.updatedAt ? `Last saved ${formatWhen(data.updatedAt)}.` : "Nothing saved yet."}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
            {counts.map(([label, n]) => (
              <div key={label} className="flex items-baseline justify-between gap-2 border-b border-cgs-line/50 pb-1.5">
                <dt className="text-cgs-muted">{label}</dt>
                <dd className="font-cgs-display text-[15px] font-semibold tabular-nums text-cgs-ink">{n}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] text-cgs-faint">
            Business identity, offer and ideal-client details are edited in{" "}
            <Link href={dHref("/build/foundation")} className="text-cgs-accent underline-offset-2 hover:underline">Build</Link>, not here.
          </p>
        </section>

        {/* Switching devices — the simple, one-click path */}
        <SwitchDeviceSection say={say} />

        {/* Backup */}
        <section className="rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card">
          <SectionTitle>Backup</SectionTitle>
          <p className="mt-1 text-[12.5px] leading-relaxed text-cgs-muted">
            Save a copy of the whole workspace as one JSON file — for moving machines, or before big changes.
            Importing replaces what is currently here.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={exportJson}>
              <Download size={14} aria-hidden /> Export workspace
            </Button>
            <Button variant="secondary" onClick={() => { fileRef.current?.click(); setImportMode("confirm"); }}>
              <Upload size={14} aria-hidden /> Import from file…
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Choose a workspace backup file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onFile(f);
              }}
            />
          </div>
          {importMode === "confirm" && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-cgs-refine" role="note">
              <TriangleAlert size={12} className="mt-0.5 shrink-0" aria-hidden />
              Importing replaces your current workspace with the file&rsquo;s contents. A storage failure keeps the
              current data untouched.
            </p>
          )}
        </section>

        {/* Licence — commercial activation state (Stage 7) */}
        <LicenceSection say={say} />

        {/* Danger — reset */}
        <section className="rounded-xl border border-cgs-danger/30 bg-cgs-danger-soft/40 p-5">
          <SectionTitle>Start over</SectionTitle>
          <p className="mt-1 text-[12.5px] leading-relaxed text-cgs-ink-soft">
            Clears every stage — Build answers, outreach, deals, clients, reviews — and begins an empty workspace.
            There is no undo; export a backup first if there is anything worth keeping.
          </p>
          <div className="mt-3">
            {confirmReset ? (
              <span className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-cgs-danger">
                Really erase everything?
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    clearAll();
                    setConfirmReset(false);
                    say("Workspace reset.");
                  }}
                >
                  Yes, erase everything
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
              </span>
            ) : (
              <Button variant="secondary" onClick={() => setConfirmReset(true)} className="border-cgs-danger/40 text-cgs-danger hover:bg-cgs-danger-soft">
                Reset workspace…
              </Button>
            )}
          </div>
        </section>

        {/* About */}
        <section className="rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card">
          <SectionTitle>About</SectionTitle>
          <p className="mt-1 text-[12.5px] leading-relaxed text-cgs-muted">
            Veyra Client Growth System runs the full client journey — Build, Acquire, Sell, Deliver, Retain,
            Grow — as one workspace, on this machine. Version 1 data format.
          </p>
        </section>
      </div>

      {flash && (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-cgs-ink px-3.5 py-1.5 text-[12.5px] font-medium text-cgs-canvas shadow-cgs-pop" role="status">
          {flash}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Switching to a new computer? — the calm, one-click path onto the existing
 * export/import pipeline. Export writes the same workspace document the
 * Backup section has always written, under a dated, human-readable name;
 * import parses the file first, shows a one-line summary of what it holds,
 * and only then replaces the workspace through store.replaceAll. The "you're
 * set" state that follows points at licence activation on the new machine —
 * it never touches licensing itself.
 */
function SwitchDeviceSection({ say }: { say: (m: string) => void }) {
  const { data, replaceAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ data: AppData; fileName: string; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState<string | null>(null);

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
    say("Backup saved — copy it to the other computer.");
  };

  const onFile = (f: File) => {
    setError(null);
    setPending(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseBackupText(String(reader.result));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPending({ data: result.data, fileName: f.name, summary: summarizeBackup(result.data) });
    };
    reader.readAsText(f);
  };

  const confirmImport = () => {
    if (!pending) return;
    if (replaceAll(pending.data)) {
      setRestored(pending.summary);
      setPending(null);
      setError(null);
    } else {
      setPending(null);
      setError("Import failed — the file could not be stored. Your current workspace is untouched.");
    }
  };

  if (restored !== null) {
    return (
      <section className="rounded-xl border border-cgs-complete/30 bg-cgs-complete-soft p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cgs-complete text-cgs-canvas" aria-hidden>
            <Check size={14} />
          </span>
          <SectionTitle>You&rsquo;re set</SectionTitle>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-cgs-ink-soft">
          Your workspace is on this computer now ({restored}). Everything else stayed on the old one — the
          export file is the only thing that moved.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-cgs-ink-soft">
          If this is a new device, activate it with your Veyra licence before you start work: your key lives in your{" "}
          <a
            href={licenceHelpUrl()}
            className="text-cgs-accent underline-offset-2 hover:underline"
          >
            Veyra account
          </a>
          . If your old device still holds the seat, deactivate it there first (Settings → Licence →
          &ldquo;Deactivate this device&rdquo;) so the licence moves with you.
        </p>
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => setRestored(null)}>Done</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card">
      <div className="flex items-center gap-2">
        <ArrowRightLeft size={14} className="text-cgs-faint" aria-hidden />
        <SectionTitle>Switching to a new computer?</SectionTitle>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-cgs-muted">
        Your whole workspace is a single file. Export it here, carry it over however you like — email, a
        drive, a cable — then choose &ldquo;Import on this computer&rdquo; on the other machine. Nothing
        leaves your computers except the file you&rsquo;re holding.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={exportBackup}>
          <Download size={14} aria-hidden /> Export backup file
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload size={14} aria-hidden /> Import on this computer
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Choose a Client Growth System backup file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onFile(f);
          }}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-cgs-danger/25 bg-cgs-danger-soft px-3 py-2 text-[12.5px] leading-relaxed text-cgs-danger"
        >
          {error}
        </p>
      )}

      {pending && (
        <div className="mt-3 rounded-lg border border-cgs-line-strong bg-cgs-inset px-3.5 py-3">
          <p className="flex items-start gap-1.5 text-[12.5px] leading-relaxed text-cgs-ink-soft" role="note">
            <TriangleAlert size={13} className="mt-0.5 shrink-0 text-cgs-refine" aria-hidden />
            <span>
              <strong className="font-semibold text-cgs-ink">{pending.fileName}</strong> holds {pending.summary}.
              Importing replaces what is currently on this computer; the old machine keeps its own copy.
            </span>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary" onClick={confirmImport}>Replace &amp; import</Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Licence — the activation card. Shows the signed-in licence (reference,
 * email, seats — read from the locally verified entitlement, never over
 * the network), a manual status check, and a device release that frees
 * the seat for another machine. Releasing is safe: it clears only the
 * licence record, never workspace data.
 */
function LicenceSection({ say }: { say: (m: string) => void }) {
  const { phase, deactivateThisDevice, checkLicence } = useActivation();
  const [busy, setBusy] = useState<"check" | "release" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);

  if (phase.kind !== "active") {
    return (
      <section className="rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card">
        <SectionTitle>Licence</SectionTitle>
        <p className="mt-1 text-[12.5px] text-cgs-muted">
          This device is not activated. Restart the app to complete activation.
        </p>
      </section>
    );
  }

  const check = async () => {
    setError(null);
    setBusy("check");
    const message = await checkLicence();
    setBusy(null);
    if (message) setError(message);
    else say("Licence checked — still valid.");
  };

  const release = async () => {
    setError(null);
    setBusy("release");
    const result = await deactivateThisDevice();
    setBusy(null);
    setConfirmRelease(false);
    if (!result.ok) setError(result.message);
  };

  return (
    <section className="rounded-xl border border-cgs-line bg-cgs-surface p-5 shadow-cgs-card">
      <SectionTitle>Licence</SectionTitle>
      <dl className="mt-2 space-y-1.5 text-[13px]">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-cgs-muted">Licence key</dt>
          <dd className="font-mono text-[12.5px] tracking-wide text-cgs-ink">{phase.claims.lic}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-cgs-muted">Account</dt>
          <dd className="text-cgs-ink">{phase.email || "—"}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-cgs-muted">Licensed seats</dt>
          <dd className="font-cgs-display font-semibold tabular-nums text-cgs-ink">{phase.claims.seats}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[12px] leading-relaxed text-cgs-faint">
        One seat is used by this computer. Manage devices and seats from your{" "}
        <a
          href={licenceHelpUrl()}
          className="text-cgs-accent underline-offset-2 hover:underline"
        >
          Veyra account
        </a>
        . Deactivating frees this seat for another machine — your business
        data stays untouched here.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-cgs-danger/25 bg-cgs-danger-soft px-3 py-2 text-[12.5px] leading-relaxed text-cgs-danger"
        >
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => void check()} disabled={busy !== null}>
          {busy === "check" ? "Checking…" : "Check status"}
        </Button>
        {confirmRelease ? (
          <>
            <Button size="sm" variant="danger" onClick={() => void release()} disabled={busy !== null}>
              {busy === "release" ? "Releasing…" : "Confirm — release this device"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRelease(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-cgs-faint hover:text-cgs-danger"
            onClick={() => setConfirmRelease(true)}
            disabled={busy !== null}
          >
            Deactivate this device…
          </Button>
        )}
      </div>
    </section>
  );
}
