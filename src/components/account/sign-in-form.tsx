"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithPasswordAction,
} from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Sign-in form — accepts an email address OR the username chosen at
 * signup. The identifier goes to a server action: a username is
 * resolved to its email server-side (service role, never exposed to
 * the browser) and the password is verified through Supabase Auth,
 * which sets the httpOnly session cookies. After a successful sign-in,
 * guest purchases made with this verified email are claimed server-side
 * before the account opens.
 */

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();

  // In-app redirect target only.
  const rawNext = params.get("next") ?? "/account";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(undefined);
    startTransition(async () => {
      const result = await signInWithPasswordAction(identifier, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="stagger-rise space-y-5" noValidate>
      <Input
        type="text"
        name="identifier"
        autoComplete="username"
        required
        label="Email or username"
        placeholder="you@yourbusiness.com · your_handle"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        disabled={busy}
      />
      <Input
        type="password"
        name="password"
        autoComplete="current-password"
        required
        label="Password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={busy}
        error={error}
      />
      <div className="flex justify-end">
        <Link
          href="/account/forgot-password"
          className="text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button
        type="submit"
        variant="accent"
        size="md"
        className="w-full"
        disabled={busy}
      >
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-ink-3">
        New to Veyra?{" "}
        <Link
          href={`/account/sign-up${
            next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""
          }`}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
