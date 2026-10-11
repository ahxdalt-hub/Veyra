"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { claimPurchasesAction } from "@/app/(site)/account/actions";
import { signInWithGoogle, useGoogleProviderEnabled } from "@/lib/auth-google";
import { USERNAME_RE } from "@/lib/username";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckIcon, CloseIcon, GoogleIcon, MailIcon } from "@/components/ui/icons";

/**
 * Sign-up form. Creates the account through Supabase Auth; the display
 * name and chosen username travel as signup metadata (display/alias
 * only — never used for authorization). The username is checked for
 * availability as the user types (debounced RPC, never a table read);
 * the database re-checks uniqueness at signup. If the project requires
 * email confirmation, the user completes signup through the emailed
 * link, which lands on /auth/callback and claims guest purchases there.
 */

const MIN_PASSWORD = 8;

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken";

export function SignUpForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Same in-app-only redirect target the sign-in form honours, so a visitor
  // bounced here from a guarded page returns to the page they wanted.
  const rawNext = params.get("next") ?? "/account";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  // Google OAuth — same gated behavior as sign-in.
  const googleEnabled = useGoogleProviderEnabled();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | undefined>();

  async function onGoogle() {
    if (googleBusy || busy) return;
    setGoogleError(undefined);
    setGoogleBusy(true);
    const result = await signInWithGoogle(next);
    if (result.error) {
      setGoogleError(result.error);
      setGoogleBusy(false);
    }
  }

  // Resend affordance on the "check your inbox" screen — a lost/rate-limited
  // email must never strand a signup. Cooldown mirrors GoTrue's 60s window
  // for repeat confirmation requests.
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(
      () => setResendCooldown((c) => c - 1),
      1000
    );
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Live availability — debounced so typing feels instant and the RPC
  // fires only when the user pauses.
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");

  useEffect(() => {
    const timer = setTimeout(async () => {
      const value = username.trim().toLowerCase();
      if (!value) {
        setUsernameStatus("idle");
        return;
      }
      if (!USERNAME_RE.test(value)) {
        setUsernameStatus("invalid");
        return;
      }
      setUsernameStatus("checking");
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.rpc("username_available", {
          p_username: value,
        });
        setUsernameStatus(data ? "available" : "taken");
      } catch {
        // A failed check must never block signup — the database still
        // enforces uniqueness, so degrade to "no live feedback".
        setUsernameStatus("idle");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [username]);

  const usernameError =
    usernameStatus === "invalid"
      ? "3–20 characters — letters, numbers, and underscores only."
      : usernameStatus === "taken"
        ? "That username is taken. Try another."
        : undefined;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(undefined);

    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername && !USERNAME_RE.test(normalizedUsername)) {
      setError(
        "Usernames use 3–20 letters, numbers, or underscores — nothing else."
      );
      return;
    }
    if (usernameStatus === "taken") {
      setError("That username is taken. Try another.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || undefined,
            username: normalizedUsername || undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Faccount`,
        },
      });

      if (error) {
        setError(
          error.status === 429 ||
            error.message.toLowerCase().includes("rate limit")
            ? "Too many attempts — wait a minute, then try again."
            : error.message.toLowerCase().includes("already")
              ? "An account with this email already exists. Try signing in instead."
              : error.message.toLowerCase().includes("password")
                ? `Password must be at least ${MIN_PASSWORD} characters.`
                : "We couldn't create your account. Please try again."
        );
        setBusy(false);
        return;
      }

      if (data.session) {
        // Confirmation not required — signed in immediately. Claiming guest
        // purchases is best-effort: the account and session already exist, so
        // a hiccup here must never be shown as a failed sign-up.
        try {
          await claimPurchasesAction();
        } catch (err) {
          console.error("[sign-up] purchase claim skipped:", err);
        }
        router.replace(next);
        router.refresh();
        return;
      }

      setAwaitingConfirmation(true);
      setBusy(false);
    } catch (err) {
      console.error("[sign-up] unexpected failure:", err);
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  /** Re-sends the signup confirmation — same email, same redirect target. */
  async function onResend() {
    if (resendState === "sending" || resendCooldown > 0) return;
    setResendState("sending");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Faccount`,
        },
      });
      if (error) {
        setResendState("error");
        return;
      }
      setResendState("sent");
      setResendCooldown(60);
    } catch {
      setResendState("error");
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="animate-rise rounded-md border border-line bg-surface p-6 text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-paper"
        >
          <MailIcon className="h-5 w-5 text-accent" />
        </span>
        <h2 className="mt-4 text-display-2 text-[1.25rem]">
          Check your inbox
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-3">
          We sent a confirmation link to{" "}
          <span className="font-medium text-ink-2">{email.trim()}</span>.
          Open it to activate your account — your purchases will be waiting
          when you return. If it hasn&rsquo;t arrived in a few minutes, check the
          Promotions and Spam folders.
        </p>
        <div className="mt-5 flex flex-col items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={resendState === "sending" || resendCooldown > 0}
            onClick={onResend}
          >
            {resendState === "sending"
              ? "Sending…"
              : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend confirmation email"}
          </Button>
          <p role="status" className="min-h-4 text-xs text-ink-3">
            {resendState === "sent"
              ? "Sent again — give it a minute, and check spam."
              : resendState === "error"
                ? "We couldn't resend just now — wait a minute and try again."
                : ""}
          </p>
          <button
            type="button"
            onClick={() => {
              setResendState("idle");
              setAwaitingConfirmation(false);
            }}
            className="text-xs text-ink-3 underline-offset-2 hover:text-ink hover:underline"
          >
            Wrong address? Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      method="post"
      className="stagger-rise space-y-5"
      noValidate
    >
      <Input
        type="text"
        name="name"
        autoComplete="name"
        label="Your name"
        placeholder="First and last"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={busy}
        hint="Optional — how we greet you in your account."
      />
      <Input
        type="text"
        name="username"
        autoComplete="username"
        label="Username"
        placeholder="your_handle"
        value={username}
        onChange={(e) => {
          // Usernames are stored lowercase — reflect that as they type.
          setUsername(e.target.value.toLowerCase());
          setError(undefined);
        }}
        disabled={busy}
        error={usernameError}
        hint={
          usernameError
            ? undefined
            : "Optional — sign in with this instead of your email."
        }
        trailing={
          username.trim() && usernameStatus !== "idle" ? (
            <span className="flex h-6 w-6 items-center justify-center">
              {usernameStatus === "checking" ? (
                <span
                  aria-hidden="true"
                  className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-ink-3"
                />
              ) : usernameStatus === "available" ? (
                <CheckIcon
                  aria-hidden="true"
                  className="animate-pop h-3.5 w-3.5 text-[#6f966f]"
                />
              ) : usernameStatus === "taken" || usernameStatus === "invalid" ? (
                <CloseIcon
                  aria-hidden="true"
                  className="animate-pop h-3 w-3 text-clay"
                />
              ) : null}
            </span>
          ) : null
        }
      />
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
        hint="Use the email you purchased with, and your order appears here automatically."
      />
      <Input
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD}
        label="Password"
        placeholder={`At least ${MIN_PASSWORD} characters`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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
        {busy ? "Creating your account…" : "Create account"}
      </Button>

      {googleEnabled ? (
        <>
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-bg px-3 text-xs text-ink-3">or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full"
            onClick={onGoogle}
            disabled={googleBusy || busy}
          >
            <GoogleIcon className="h-4 w-4" />
            {googleBusy ? "Opening Google…" : "Continue with Google"}
          </Button>
          {googleError ? (
            <p className="text-center text-xs text-clay">{googleError}</p>
          ) : null}
        </>
      ) : null}

      <p className="text-center text-sm text-ink-3">
        Already have an account?{" "}
        <Link
          href="/account/sign-in"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
