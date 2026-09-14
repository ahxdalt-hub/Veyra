"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MailIcon } from "@/components/ui/icons";

/**
 * Forgot-password form. Sends the Supabase reset email; the link lands on
 * /auth/callback, which exchanges the code for a session and continues to
 * /account/reset-password where the new password is set. Deliberately
 * vague on success — the same confirmation shows whether or not the email
 * exists, so the form can't be used to probe for accounts.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(undefined);
    setBusy(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=%2Faccount%2Freset-password`,
      });
      if (error) {
        setError("We couldn't send the reset email. Please try again.");
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-rise text-center" role="status">
        <span
          aria-hidden="true"
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-paper"
        >
          <MailIcon className="h-5 w-5 text-accent" />
        </span>
        <h2 className="mt-4 text-display-2 text-[1.25rem]">Check your inbox</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-3">
          If an account exists for{" "}
          <span className="font-medium text-ink-2">{email.trim()}</span>, we
          sent a link to set a new password. It expires shortly — use it soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="animate-rise space-y-5" noValidate>
      <Input
        type="email"
        name="email"
        autoComplete="email"
        required
        label="Email address"
        placeholder="you@yourbusiness.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        hint="Use the email your Veyra account is tied to."
        error={error}
      />
      <Button
        type="submit"
        variant="accent"
        size="md"
        className="w-full"
        disabled={busy}
      >
        {busy ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
