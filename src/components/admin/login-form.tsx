"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin sign-in surface — dark, centered, minimal. The gate to the
 * command center. Deliberately distinct from the storefront's account
 * sign-in: same machinery underneath (Supabase Auth), different door.
 */

export function AdminSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
        notAdmin?: boolean;
      };
      if (!res.ok || !data.ok) {
        if (data.notAdmin) {
          setNotice(
            "That account signed in, but isn't an administrator. Customer accounts live at /account."
          );
        } else {
          setError(data.error ?? "Something went wrong. Please try again.");
        }
        setBusy(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("We lost the connection. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm">
      <div className="mb-10 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-sm border font-display text-lg italic"
          style={{ borderColor: "var(--cc-accent-line)", color: "var(--cc-accent-ink)" }}
        >
          V
        </span>
        <div>
          <p className="cc-label">Veyra Command Center</p>
        </div>
      </div>

      <h1
        className="text-display-2"
        style={{ color: "var(--cc-text)" }}
      >
        Sign in to continue
      </h1>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="cc-label mb-2 block" style={{ color: "var(--cc-text-3)" }}>
            Email
          </span>
          <input
            ref={emailRef}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            placeholder="you@veyra.co"
            className="h-11 w-full rounded-sm border bg-transparent px-3.5 text-sm outline-none transition-colors placeholder:text-[var(--cc-text-4)] disabled:opacity-60"
            style={{ borderColor: "var(--cc-line-strong)", color: "var(--cc-text)" }}
          />
        </label>
        <label className="block">
          <span className="cc-label mb-2 block" style={{ color: "var(--cc-text-3)" }}>
            Password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            placeholder="••••••••"
            className="h-11 w-full rounded-sm border bg-transparent px-3.5 text-sm outline-none transition-colors placeholder:text-[var(--cc-text-4)] disabled:opacity-60"
            style={{ borderColor: "var(--cc-line-strong)", color: "var(--cc-text)" }}
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="animate-shake mt-4 text-sm" style={{ color: "var(--cc-error)" }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-4 text-sm leading-relaxed" style={{ color: "var(--cc-text-3)" }}>
          {notice}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-8 h-11 w-full rounded-sm text-sm font-medium transition-all duration-200 disabled:opacity-60"
        style={{
          backgroundColor: "var(--cc-accent)",
          color: "#141007",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--cc-accent-ink)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--cc-accent)")}
      >
        {busy ? "Verifying…" : "Enter the command center"}
      </button>

      <p className="mt-8 text-xs" style={{ color: "var(--cc-text-4)" }}>
        Authorized Veyra administrators only. All access is logged.
      </p>
    </form>
  );
}
