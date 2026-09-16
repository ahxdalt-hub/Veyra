"use client";

import { useState, useTransition } from "react";
import { deactivateActivationAction } from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";

/**
 * LicenceDevices — the machines activated on one licence (Stage 07).
 *
 * Server-rendered list; releasing a device calls a server action that
 * re-verifies everything (RLS visibility + ownership) before the write.
 * "Released" rows stay visible for the audit trail but are inert.
 */

export type DeviceView = {
  id: string;
  deviceLabel: string;
  email: string;
  activatedAt: string;
  lastSeenAt: string;
  active: boolean;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function LicenceDevices({ devices }: { devices: DeviceView[] }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message?: string; error?: string }>({});

  function release(device: DeviceView) {
    startTransition(async () => {
      const result = await deactivateActivationAction(device.id);
      setFeedback(result);
    });
  }

  return (
    <div>
      <h3 className="text-eyebrow">Activated devices</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-3">
        Each activation uses one seat on this licence. Release a device to
        free its seat for another machine — releasing never touches the
        work saved on that computer.
      </p>

      {feedback.message || feedback.error ? (
        <p
          role="status"
          className={`mt-3 rounded-sm border px-3 py-2 text-xs ${
            feedback.error
              ? "border-clay/30 bg-clay-soft text-clay"
              : "border-accent/30 bg-accent-soft text-accent-ink"
          }`}
        >
          {feedback.error ?? feedback.message}
        </p>
      ) : null}

      {devices.length === 0 ? (
        <p className="mt-3 text-xs text-ink-3">
          No devices have activated with this licence yet. Open the app,
          enter the licence key, and the machine appears here.
        </p>
      ) : (
        <ul role="list" className="mt-3 divide-y divide-line rounded-sm border border-line bg-surface">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {d.deviceLabel}
                  <span
                    className={`ml-2 inline-flex items-center rounded-xs border px-1.5 py-0.5 text-[10px] font-medium ${
                      d.active
                        ? "border-accent/30 bg-accent-soft text-accent-ink"
                        : "border-line-strong bg-paper text-ink-3"
                    }`}
                  >
                    {d.active ? "Active" : "Released"}
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-3">
                  {d.email} · activated {formatWhen(d.activatedAt)}
                  {d.active ? ` · last seen ${formatWhen(d.lastSeenAt)}` : ""}
                </p>
              </div>
              {d.active ? (
                <Button
                  variant="ghost"
                  className="shrink-0 text-xs text-ink-3 hover:text-ink"
                  disabled={pending}
                  onClick={() => release(d)}
                >
                  Release
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
