"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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

  // Passwordless (magic link) — lower-friction path for people who sign
  // in rarely (audit redeem, licence lookup). Reuses /auth/callback, which
  // exchanges the code for a session and claims guest purchases.
  const [linkEmail, setLinkEmail] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | undefined>();
  const [linkSent, setLinkSent] = useState(false);

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

  async function onMagicLink(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (linkBusy) return;
    setLinkError(undefined);
    const email = linkEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setLinkError("Enter a valid email address.");
      return;
    }
    setLinkBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (otpError) {
        setLinkError("Couldn't send that link right now. Please try again.");
        return;
      }
      setLinkSent(true);
    } catch {
      setLinkError("Couldn't send that link right now. Please try again.");
    } finally {
      setLinkBusy(false);
    }
  }

  return (
    <div className="stagger-rise space-y-5">
      <form onSubmit={onSubmit} method="post" className="space-y-5" noValidate>
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
      </form>

      {/* Divider */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-bg px-3 text-xs text-ink-3">or</span>
        </div>
      </div>

      {linkSent ? (
        <div className="rounded-lg border border-accent/30 bg-accent-soft/30 p-4 text-center">
          <p className="text-sm font-medium text-ink">Check your email</p>
          <p className="mt-1 text-xs text-ink-3">
            We sent a sign-in link to{" "}
            <strong className="text-ink">{linkEmail.trim().toLowerCase()}</strong>. It
            expires in a few minutes.
          </p>
          <button
            type="button"
            onClick={() => setLinkSent(false)}
            className="mt-3 text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={onMagicLink} className="space-y-3" noValidate>
          <Input
            type="email"
            name="magic-email"
            autoComplete="email"
            label="Email me a sign-in link"
            placeholder="you@yourbusiness.com"
            value={linkEmail}
            onChange={(e) => setLinkEmail(e.target.value)}
            disabled={linkBusy || busy}
            error={linkError}
          />
          <Button
            type="submit"
            variant="outline"
            size="md"
            className="w-full"
            disabled={linkBusy || busy}
          >
            {linkBusy ? "Sending link…" : "Email me a sign-in link"}
          </Button>
        </form>
      )}

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
    </div>
  );
}
