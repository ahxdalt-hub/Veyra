"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, CcButton, ActionFeedback } from "@/components/admin/admin-ui";
import {
  revokeLicenceAction,
  reactivateLicenceAction,
  deactivateActivationAction,
  type ActionResult,
} from "@/app/admin/mutations";

/**
 * Licence action buttons — revoke / reactivate / release-device, each
 * behind a strong confirmation that states the consequence. Feedback is
 * the truth: success re-renders server data, failure shows the real
 * error. (Server actions already enforce requireAdmin — the UI hiding
 * these is never the protection.)
 */

function useMutationRunner() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) {
        router.refresh();
        // Drawer hosts that keep local copies of detail refetch on this.
        window.dispatchEvent(new Event("cc:refresh"));
      }
    });
  return { pending, result, run, clear: () => setResult(null) };
}

export function RevokeLicenceButton({ licenceId }: { licenceId: string }) {
  const [open, setOpen] = useState(false);
  const { result, run } = useMutationRunner();
  return (
    <>
      <CcButton variant="danger" size="sm" onClick={() => setOpen(true)}>
        Revoke licence
      </CcButton>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Revoke this licence?"
        body={
          <>
            The customer loses access immediately — every licence
            verification fails from now on, and all devices activated on it
            are released. This is reversible: you can reactivate it later.
            No order, payment, or entitlement data is deleted.
          </>
        }
        confirmLabel="Revoke access"
        pendingLabel="Revoking…"
        onConfirm={async () => {
          await run(() => revokeLicenceAction(licenceId));
          setOpen(false);
        }}
      />
      {result && !result.ok ? (
        <p className="mt-2 text-xs" style={{ color: "var(--cc-error)" }}>{result.error}</p>
      ) : null}
    </>
  );
}

export function ReactivateLicenceButton({ licenceId }: { licenceId: string }) {
  const [open, setOpen] = useState(false);
  const { result, run } = useMutationRunner();
  return (
    <>
      <CcButton variant="outline" size="sm" onClick={() => setOpen(true)}>
        Reactivate licence
      </CcButton>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        danger={false}
        title="Reactivate this licence?"
        body="Access is restored for future verifications. Previously released devices must reactivate normally — that keeps seat accounting honest."
        confirmLabel="Reactivate"
        pendingLabel="Reactivating…"
        onConfirm={async () => {
          await run(() => reactivateLicenceAction(licenceId));
          setOpen(false);
        }}
      />
      {result && !result.ok ? (
        <p className="mt-2 text-xs" style={{ color: "var(--cc-error)" }}>{result.error}</p>
      ) : null}
    </>
  );
}

export function ReleaseDeviceButton({
  activationId,
  deviceLabel,
}: {
  activationId: string;
  deviceLabel: string | null;
}) {
  const [open, setOpen] = useState(false);
  const { result, run } = useMutationRunner();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs underline-offset-2 hover:underline"
        style={{ color: "var(--cc-text-3)" }}
      >
        Release device
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Release ${deviceLabel ?? "this device"}?`}
        body="The machine loses its seat immediately and the seat becomes available for reactivation elsewhere. Nothing else changes."
        confirmLabel="Release device"
        pendingLabel="Releasing…"
        onConfirm={async () => {
          await run(() => deactivateActivationAction(activationId));
          setOpen(false);
        }}
      />
      {result && !result.ok ? (
        <p className="mt-1 text-xs" style={{ color: "var(--cc-error)" }}>{result.error}</p>
      ) : null}
    </>
  );
}

export { ActionFeedback };
