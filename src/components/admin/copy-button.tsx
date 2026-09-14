"use client";

import { useState } from "react";
import { AdminCopyIcon, AdminCheckIcon } from "./admin-icons";

/**
 * CopyButton — click to copy a value (IDs, references). Shows its own
 * transient success state; announces the copy to screen readers.
 */
export function CopyButton({
  value,
  label,
  className = "",
}: {
  value: string;
  /** What this value is, e.g. "customer ID" — used for a11y. */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-xs border border-cc-line text-cc-text-3 transition-colors hover:border-cc-line-strong hover:text-cc-text ${className}`}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? (
        <AdminCheckIcon className="h-3.5 w-3.5 text-cc-good" />
      ) : (
        <AdminCopyIcon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
