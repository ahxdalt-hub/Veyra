import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/account/sign-in-form";
import { supabaseAuthConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sign in — Veyra",
  description: "Sign in to your Veyra account.",
  alternates: { canonical: "/account/sign-in" },
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <div className="bg-paper">
      <div className="container-tight flex min-h-[70vh] flex-col justify-center py-16 sm:py-20">
        <div className="mx-auto w-full max-w-md">
          <p className="text-eyebrow mb-4">Account</p>
          <h1 className="text-display-1">Welcome back</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">
            Sign in to your Veyra account — your products, orders, and
            licences are waiting.
          </p>

          <div className="mt-8 rounded-md border border-line bg-surface p-6 sm:p-8">
            {supabaseAuthConfigured() ? (
              <Suspense fallback={null}>
                <SignInForm />
              </Suspense>
            ) : (
              <p className="text-sm leading-relaxed text-ink-2">
                Customer accounts aren&rsquo;t enabled on this deployment yet.
                Purchases currently deliver by email — write to{" "}
                <a
                  href="mailto:hello@veyra.co"
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  hello@veyra.co
                </a>{" "}
                about an existing order.
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-ink-4">
            Need a hand?{" "}
            <Link
              href="/contact"
              className="underline-offset-2 hover:underline"
            >
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
