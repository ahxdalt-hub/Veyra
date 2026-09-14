import type { Metadata } from "next";
import Link from "next/link";
import {
  createSupabaseServerClient,
  requireAccountUser,
} from "@/lib/supabase/server";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import type { ProfileRow } from "@/lib/supabase/types";
import { AccountShell, AccountCard } from "@/components/account/account-shell";
import { ProfileForm } from "@/components/account/profile-form";
import { PasswordForm } from "@/components/account/password-form";
import { signOutAction } from "@/app/(site)/account/actions";

export const metadata: Metadata = {
  title: "Settings — Veyra",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  if (!supabaseAuthConfigured()) {
    return (
      <AccountShell title="Settings">
        <AccountCard>
          <p className="text-sm leading-relaxed text-ink-2">
            Customer accounts aren&rsquo;t enabled on this deployment yet.{" "}
            <Link href="/account" className="font-medium text-accent underline-offset-2 hover:underline">
              Back to your account
            </Link>
          </p>
        </AccountCard>
      </AccountShell>
    );
  }

  const user = await requireAccountUser();
  const supabase = await createSupabaseServerClient();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileRow ?? null) as ProfileRow | null;

  return (
    <AccountShell
      crumb="Settings"
      title="Settings"
      lead="Your account details and sign-in preferences."
    >
      <div className="max-w-2xl space-y-6">
        {/* Account identity */}
        <AccountCard>
          <h2 className="text-eyebrow">Account</h2>
          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="spec text-ink-4">Email</dt>
              <dd className="text-ink-2">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5">
              <dt className="spec text-ink-4">Member since</dt>
              <dd className="tnum text-ink-2">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
          </dl>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-ink-4">
            Your email is tied to your purchases and licences. To change it,
            write to{" "}
            <a
              href="mailto:hello@veyra.co"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              hello@veyra.co
            </a>{" "}
            and we&rsquo;ll take care of it.
          </p>
        </AccountCard>

        {/* Profile */}
        <AccountCard>
          <h2 className="text-eyebrow">Profile</h2>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-ink-3">
            Optional details that personalize your account.
          </p>
          <div className="mt-5">
            <ProfileForm
              fullName={profile?.full_name ?? ""}
              businessName={profile?.business_name ?? ""}
            />
          </div>
        </AccountCard>

        {/* Security */}
        <AccountCard>
          <h2 className="text-eyebrow">Password</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-2">
            Change the password you use to sign in.
          </p>
          <div className="mt-5">
            <PasswordForm />
          </div>
        </AccountCard>

        {/* Sign out */}
        <AccountCard>
          <h2 className="text-eyebrow">Session</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-2">
            Sign out of your Veyra account on this device.
          </p>
          <form action={signOutAction} className="mt-4">
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-sm border border-line-strong bg-surface px-4 text-sm font-medium text-ink transition-colors duration-200 hover:border-ink/30 hover:bg-accent-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Sign out
            </button>
          </form>
        </AccountCard>
      </div>
    </AccountShell>
  );
}
