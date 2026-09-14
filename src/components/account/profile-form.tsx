"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileFormState } from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Profile form — saves display name / business name through a server
 * action. The email is account identity (tied to purchases) and is shown
 * read-only; changing it is a support conversation, not a form field.
 */

const initial: ProfileFormState = {};

export function ProfileForm({
  fullName,
  businessName,
}: {
  fullName: string;
  businessName: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initial
  );

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <Input
        type="text"
        name="fullName"
        autoComplete="name"
        label="Your name"
        defaultValue={fullName}
        disabled={pending}
      />
      <Input
        type="text"
        name="businessName"
        autoComplete="organization"
        label="Business name"
        defaultValue={businessName}
        disabled={pending}
        hint="Shown on licence information for the systems your business runs."
      />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.saved ? (
          <p role="status" className="text-sm text-ink-3">
            Saved.
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
