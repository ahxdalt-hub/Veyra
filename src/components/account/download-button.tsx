"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@/components/ui/icons";
import {
  PLATFORM_LABEL,
  detectPlatform,
  type DeliveryPlatform,
} from "@/lib/platforms";

/**
 * DownloadButton — asks /api/download/[slug]?mode=json&platform=…, which
 * authorizes the session + entitlement server-side and answers with a
 * short-lived signed storage URL (or an honest "being published" state).
 * The browser is then pointed at the signed URL; no permanent public
 * storage URL is ever exposed.
 *
 * Platform handling (0021): `platforms` is the full list of platforms the
 * product ships for — both links always render, and the visitor's detected
 * OS decides which one is the PRIMARY (highlighted) action, the other
 * staying one small click away. Detection only orders the buttons, it
 * never gates anything: authorization is the server-side chain, and a
 * platform whose build isn't published yet gets the route's honest
 * "being published — request delivery" answer rather than a fake download.
 */

// useSyncExternalStore plumbing for the browser's user-agent. The UA never
// changes during a session, so the subscription is a no-op and the
// snapshot recomputes cheaply per read.
const subscribeNoop = () => () => {};
function readNavigatorPlatform(): DeliveryPlatform | null {
  return detectPlatform(window.navigator.userAgent);
}

export function DownloadButton({
  slug,
  productName,
  variant = "accent",
  platforms = ["windows"],
}: {
  slug: string;
  productName: string;
  variant?: "accent" | "outline";
  /** Platforms the product ships for — both render, detected OS leads. */
  platforms?: DeliveryPlatform[];
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Visitor OS read after hydration via useSyncExternalStore — the
  // browser-only snapshot (null on the server) decides which button leads.
  // Nothing here gates anything; authorization is server-side.
  const detected = useSyncExternalStore(
    subscribeNoop,
    readNavigatorPlatform,
    () => null
  );

  const available: DeliveryPlatform[] =
    platforms.length > 0 ? platforms : ["windows"];
  const primary: DeliveryPlatform =
    detected && available.includes(detected)
      ? detected
      : available.includes("windows")
        ? "windows"
        : available[0];
  const others = available.filter((p) => p !== primary);

  function download(platform: DeliveryPlatform) {
    setNotice(null);
    startTransition(async () => {
      try {
        // mode=json returns the signed URL in the response body (same-origin
        // fetch can't follow a cross-origin storage redirect itself).
        const res = await fetch(
          `/api/download/${slug}?mode=json&platform=${platform}`,
          { cache: "no-store" }
        );
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
            "This build isn't available yet — open the product's Delivery Center in your library and use Request delivery, and we'll email you the current version."
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
        onClick={() => download(primary)}
        disabled={pending}
        aria-label={`Download the latest version of ${productName} for ${PLATFORM_LABEL[primary]}`}
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        {pending
          ? "Preparing…"
          : `Download for ${PLATFORM_LABEL[primary]}`}
      </Button>
      {others.length > 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-4">
          {others.map((p, i) => (
            <span key={p}>
              {i > 0 ? " · " : ""}
              <button
                type="button"
                onClick={() => download(p)}
                disabled={pending}
                aria-label={`Download the latest version of ${productName} for ${PLATFORM_LABEL[p]}`}
                className="underline-offset-4 hover:text-ink hover:underline disabled:opacity-60"
              >
                Download for {PLATFORM_LABEL[p]}
              </button>
            </span>
          ))}
        </p>
      ) : null}
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
