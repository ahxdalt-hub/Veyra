import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/account/forgot-password-form";
import { supabaseAuthConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Reset your password — Veyra",
  description: "Request a link to reset your Veyra account password.",
  alternates: { canonical: "/account/forgot-password" },
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <div className="bg-paper">
      <div className="container-tight flex min-h-[70vh] flex-col justify-center py-16 sm:py-20">
        <div className="mx-auto w-full max-w-md">
          <p className="text-eyebrow mb-4">Account</p>
          <h1 className="text-display-1">Reset your password</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">
            Enter your email and we&rsquo;ll send a link to set a new
            password.
          </p>

          <div className="mt-8 rounded-md border border-line bg-surface p-6 sm:p-8">
            {supabaseAuthConfigured() ? (
              <ForgotPasswordForm />
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
            Remembered it?{" "}
            <Link
              href="/account/sign-in"
              className="underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
