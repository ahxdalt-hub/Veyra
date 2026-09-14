"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@/components/ui/icons";

/**
 * DownloadButton — asks /api/download/[slug]?mode=json, which authorizes
 * the session + entitlement server-side and answers with a short-lived
 * signed storage URL (or an honest "being published" state). The browser
 * is then pointed at the signed URL; no permanent public storage URL is
 * ever exposed.
 */
export function DownloadButton({
  slug,
  productName,
  variant = "accent",
}: {
  slug: string;
  productName: string;
  variant?: "accent" | "outline";
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function download() {
    setNotice(null);
    startTransition(async () => {
      try {
        // mode=json returns the signed URL in the response body (same-origin
        // fetch can't follow a cross-origin storage redirect itself).
        const res = await fetch(`/api/download/${slug}?mode=json`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };

        if (res.ok && data.url) {
          window.location.assign(data.url);
          return;
        }

        setNotice(
          data.error ??
            "The download couldn't be started — request delivery below and we'll send it to you."
        );
      } catch {
        setNotice(
          "We lost the connection while preparing your download. Please try again."
        );
      }
    });
  }

  return (
    <div>
      <Button
        variant={variant}
        size="sm"
        onClick={download}
        disabled={pending}
        aria-label={`Download the latest version of ${productName}`}
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        {pending ? "Preparing…" : "Download Latest Version"}
      </Button>
      {notice ? (
        <p
          role="status"
          className="animate-rise mt-2 max-w-md text-xs leading-relaxed text-ink-3"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
