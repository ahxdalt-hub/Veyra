"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

/**
 * AuditForm — resources-page variant of the lead capture form.
 * Same endpoint as the homepage (/api/subscribe), tagged 'resources-audit'.
 */

export function AuditForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError(undefined);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "resources-audit" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Please try again.");
      setStatus("done");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-md border border-line bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
          <CheckIcon className="h-5 w-5 text-accent" />
        </span>
        <h3 className="mt-4 text-display-2 text-[1.375rem]">
          Check your inbox
        </h3>
        <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-ink-3">
          The audit PDF is on its way — one email, no sequence.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface p-6 shadow-sm sm:p-8">
      <h3 className="text-display-2 text-[1.25rem]">Get the audit</h3>
      <p className="mt-2 text-sm text-ink-3">
        One email with the PDF. That&rsquo;s the whole arrangement.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          required
          label="Email address"
          placeholder="you@yourstudio.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          disabled={status === "loading"}
        />
        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Sending…" : "Send me the audit"}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-ink-4">
        No spam. Unsubscribe anytime. We never share your address.
      </p>
    </div>
  );
}
