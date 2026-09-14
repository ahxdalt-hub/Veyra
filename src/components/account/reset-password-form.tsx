"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Set a new password after following the email reset link. The reset link
 * signs the user in (via /auth/callback), so updateUser() runs against
 * that session. Requires the session — the middleware guards this route.
 */

const MIN_PASSWORD = 8;

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(undefined);

    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(
          error.message.toLowerCase().includes("session")
            ? "Your reset link expired. Request a new one and try again."
            : "We couldn't update your password. Please try again."
        );
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="animate-rise text-center" role="status">
        <span
          aria-hidden="true"
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-paper"
        >
          <CheckIcon className="h-5 w-5 text-accent" />
        </span>
        <h2 className="mt-4 text-display-2 text-[1.25rem]">
          Password updated
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-3">
          Your new password is active. Use it next time you sign in.
        </p>
        <div className="mt-6">
          <Button href="/account" variant="accent" size="md" arrow>
            Go to your account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="animate-rise space-y-5" noValidate>
      <Input
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD}
        label="New password"
        placeholder={`At least ${MIN_PASSWORD} characters`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy}
      />
      <Input
        type="password"
        name="confirm"
        autoComplete="new-password"
        required
        label="Confirm new password"
        placeholder="Type it once more"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={busy}
        error={error}
      />
      <Button
        type="submit"
        variant="accent"
        size="md"
        className="w-full"
        disabled={busy}
      >
        {busy ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
