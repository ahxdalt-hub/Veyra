"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LicenceDrawer } from "@/components/admin/licence-drawer";
import type { LicenceDetail } from "@/lib/admin/data";

/**
 * LicenceDrawerHost — opens when ?focus=<id> is present. The server page
 * resolves the product name so the drawer labels products properly.
 * Closing clears the URL param — the address bar always tells the truth
 * about what's open.
 *
 * State discipline: detail is tagged with the id it was fetched for and
 * only set from async callbacks; rendering gates on that tag matching
 * the current focus, so a stale drawer can never flash for a newly
 * opened licence and no effect body ever calls setState synchronously.
 */
export function LicenceDrawerHost({
  focus,
  productName,
}: {
  focus: string | null;
  productName: string;
}) {
  const router = useRouter();
  const [nonce, setNonce] = useState(0);
  const [fetched, setFetched] = useState<{ id: string; detail: LicenceDetail } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // After any licence mutation the action buttons fire "cc:refresh" so
  // the drawer refetches its own copy (it lives in client state, outside
  // router.refresh's server-render coverage).
  useEffect(() => {
    const on = () => setNonce((n) => n + 1);
    window.addEventListener("cc:refresh", on);
    return () => window.removeEventListener("cc:refresh", on);
  }, []);

  useEffect(() => {
    if (!focus) return;
    let cancelled = false;
    void fetch(`/api/admin/licences/${focus}`)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data: { detail: LicenceDetail }) => {
        if (!cancelled) {
          setFetched({ id: focus, detail: data.detail });
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("This licence could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [focus, nonce]);

  const close = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("focus");
    router.replace(`/admin/licences${params.toString() ? `?${params}` : ""}`, {
      scroll: false,
    });
    setFetched(null);
    setError(null);
  };

  if (error) {
    return (
      <div
        className="fixed bottom-5 right-5 z-[65] rounded-md border px-4 py-3 text-sm shadow-xl"
        style={{ backgroundColor: "var(--cc-surface)", borderColor: "var(--cc-error)", color: "var(--cc-text)" }}
      >
        {error}
        <button
          type="button"
          onClick={close}
          className="ml-3 underline"
          style={{ color: "var(--cc-text-3)" }}
        >
          close
        </button>
      </div>
    );
  }

  if (!focus || fetched?.id !== focus) return null;
  return <LicenceDrawer detail={fetched.detail} productName={productName} onClose={close} />;
}
