"use client";

import { useActionState } from "react";
import {
  updatePasswordAction,
  type PasswordFormState,
} from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Change-password form — runs through a server action against the
 * user's own session. New password + confirmation only: Supabase Auth
 * authorizes the change via the existing session cookie.
 */

const initial: PasswordFormState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initial
  );

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <Input
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        label="New password"
        placeholder="At least 8 characters"
        disabled={pending}
      />
      <Input
        type="password"
        name="confirm"
        autoComplete="new-password"
        required
        label="Confirm new password"
        placeholder="Type it once more"
        disabled={pending}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
        {state.saved ? (
          <p role="status" className="text-sm text-ink-3">
            Password updated.
          </p>
        ) : null}
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-clay">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
