"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, CcButton } from "@/components/admin/admin-ui";
import { setRedeemCodeStatusAction } from "@/app/admin/mutations";

/**
 * Pull a marketplace code out of circulation, or put it back. A redeemed code
 * gets no button: its claim already minted a licence, so re-issuing the key
 * would hand a second copy to whoever retries it.
 */
export function RedeemCodeAction({
  code,
  status,
}: {
  code: string;
  status: "available" | "redeemed" | "deactivated";
}) {
  const to = status === "available" ? "deactivated" : "available";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "redeemed") {
    return (
      <span className="text-xs" style={{ color: "var(--cc-text-4)" }}>
        —
      </span>
    );
  }

  return (
    <>
      <CcButton
        variant={to === "deactivated" ? "outline" : "ghost"}
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {to === "deactivated" ? "Pull code" : "Restore code"}
      </CcButton>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        danger={to === "deactivated"}
        title={to === "deactivated" ? "Pull this code?" : "Return this code to circulation?"}
        confirmLabel={to === "deactivated" ? "Pull code" : "Restore code"}
        pendingLabel="Applying…"
        body={
          to === "deactivated" ? (
            <>
              <code className="font-mono">{code.toUpperCase()}</code> stops validating
              immediately — anyone who tries it is told the code is not recognised. Nothing is
              deleted: the row stays here so a replacement key can be issued for the same sale.
              No order, licence, or entitlement data is touched.
            </>
          ) : (
            <>
              <code className="font-mono">{code.toUpperCase()}</code> will validate again and
              issue a full-price order plus licence to whoever claims it first. Only do this for
              a code you meant to pull.
            </>
          )
        }
        onConfirm={async () => {
          const result = await setRedeemCodeStatusAction(code, to);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setOpen(false);
          router.refresh();
        }}
      />
      {error ? (
        <p className="mt-1 text-xs" style={{ color: "var(--cc-error)" }}>
          {error}
        </p>
      ) : null}
    </>
  );
}
