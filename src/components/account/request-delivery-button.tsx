"use client";

import { useState, useTransition } from "react";
import { requestRedeliveryAction } from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@/components/ui/icons";

/**
 * Re-delivery action for an owned product. Calls a server action that
 * verifies the entitlement server-side (RLS-backed) and records the
 * request against the current catalog version.
 */

export function RequestDeliveryButton({
  entitlementId,
  productName,
}: {
  entitlementId: string;
  productName: string;
}) {
  const [state, setState] = useState<{ message?: string; error?: string }>({});
  const [pending, startTransition] = useTransition();

  function request() {
    startTransition(async () => {
      const result = await requestRedeliveryAction(entitlementId);
      setState(result);
    });
  }

  if (state.message) {
    return (
      <p
        role="status"
        className="animate-rise rounded-sm border border-accent/25 bg-accent-soft px-3.5 py-2.5 text-xs leading-relaxed text-accent-ink"
      >
        {state.message}
      </p>
    );
  }

  return (
    <div>
      <Button
        variant="accent"
        size="sm"
        onClick={request}
        disabled={pending}
        aria-label={`Request the current version of ${productName}`}
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        {pending ? "Sending request…" : "Request delivery"}
      </Button>
      {state.error ? (
        <p role="alert" className="mt-2 text-xs text-clay">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
