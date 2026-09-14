import type { Metadata } from "next";
import { SignUpForm } from "@/components/account/sign-up-form";
import { supabaseAuthConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Create your account — Veyra",
  description: "Create your Veyra account to manage products and licences.",
  alternates: { canonical: "/account/sign-up" },
  robots: { index: false, follow: true },
};

export default function SignUpPage() {
  return (
    <div className="bg-paper">
      <div className="container-tight flex min-h-[70vh] flex-col justify-center py-16 sm:py-20">
        <div className="mx-auto w-full max-w-md">
          <p className="text-eyebrow mb-4">Account</p>
          <h1 className="text-display-1">Create your account</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-3">
            One place for everything you own from Veyra — products, orders,
            licences, and re-delivery.
          </p>

          <div className="mt-8 rounded-md border border-line bg-surface p-6 sm:p-8">
            {supabaseAuthConfigured() ? (
              <SignUpForm />
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
        </div>
      </div>
    </div>
  );
}
