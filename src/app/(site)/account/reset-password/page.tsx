import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/account/reset-password-form";
import { supabaseAuthConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Set a new password — Veyra",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="bg-paper">
      <div className="container-tight flex min-h-[70vh] flex-col justify-center py-16 sm:py-20">
        <div className="mx-auto w-full max-w-md">
          <p className="text-eyebrow mb-4">Account</p>
          <h1 className="text-display-1">Set a new password</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">
            Choose a new password for your Veyra account.
          </p>

          <div className="mt-8 rounded-md border border-line bg-surface p-6 sm:p-8">
            {supabaseAuthConfigured() ? (
              <ResetPasswordForm />
            ) : (
              <p className="text-sm leading-relaxed text-ink-2">
                Customer accounts aren&rsquo;t enabled on this deployment yet.
                Write to{" "}
                <a
                  href="mailto:hello@veyra.co"
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  hello@veyra.co
                </a>{" "}
                about your account.
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-ink-4">
            Link expired or already used?{" "}
            <Link
              href="/account/forgot-password"
              className="underline-offset-2 hover:underline"
            >
              Request a new one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
