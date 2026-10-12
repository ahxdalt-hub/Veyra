import type { Metadata } from "next";
import { site } from "@/lib/site";
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
      <div className="container-page flex min-h-[80vh] flex-col justify-center py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left — value & reassurance. Genuine, no invented social proof. */}
          <div className="max-w-lg">
            <p className="text-eyebrow mb-4">Account</p>
            <h1 className="text-display-1">Welcome back</h1>
            <p className="mt-4 text-base leading-relaxed text-ink-3">
              Sign in to your Veyra account — your products, orders, and
              licences are waiting.
            </p>

            <ul className="mt-8 space-y-4 text-sm text-ink-2">
              <li className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                <span>
                  <span className="font-medium text-ink">Sign in how you like.</span>{" "}
                  Email, the username you chose, Google, or a one-time sign-in
                  link.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                <span>
                  <span className="font-medium text-ink">Purchases follow you.</span>{" "}
                  Any order you placed as a guest is linked to your account
                  automatically.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                />
                <span>
                  <span className="font-medium text-ink">Privacy held.</span> Your
                  Veyra workspace data stays on your machine — this account only
                  manages licences and downloads.
                </span>
              </li>
            </ul>
          </div>

          {/* Right — the form, now the full width of its column. */}
          <div className="w-full">
            <div className="rounded-md border border-line bg-surface p-6 shadow-sm sm:p-8">
              {supabaseAuthConfigured() ? (
                <Suspense fallback={null}>
                  <SignInForm />
                </Suspense>
              ) : (
                <p className="text-sm leading-relaxed text-ink-2">
                  Customer accounts aren&rsquo;t enabled on this deployment yet.
                  Purchases currently deliver by email — write to{" "}
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {site.contact.email}
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
    </div>
  );
}
