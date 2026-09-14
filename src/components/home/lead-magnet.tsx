"use client";

import { useState, type FormEvent } from "react";
import { Reveal } from "@/components/motion/reveal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

/**
 * LeadMagnet — Section H.
 * "25-Point Client Acquisition Audit" — email capture only, no
 * unnecessary personal data. One field, one sentence of value, one
 * promise about frequency. Trustworthy by design.
 */

const auditPoints = [
  "Where your leads currently leak out of the funnel",
  "Which follow-ups are missing and what to send instead",
  "How your pipeline stages should map to your services",
  "The onboarding steps most service businesses skip",
];

export function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError(undefined);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage-audit" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Please try again.");
      setStatus("done");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setStatus("error");
    }
  }

  return (
    <section id="audit" className="scroll-mt-24 border-b border-line bg-accent-soft/60">
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <p className="text-eyebrow mb-4">Free resource</p>
            <h2 className="text-display-1">
              The 25-Point Client Acquisition Audit
            </h2>
            <p className="mt-5 max-w-lg text-lead">
              A one-page checklist for diagnosing your current setup — where
              leads leak, which follow-ups are missing, and what to fix first.
              Takes about 20 minutes to complete honestly.
            </p>
            <ul className="mt-8 space-y-3">
              {auditPoints.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="text-sm text-ink-2">{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-md border border-line bg-surface p-6 shadow-sm sm:p-8">
              {status === "done" ? (
                <div className="py-8 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
                    <CheckIcon className="h-5 w-5 text-accent" />
                  </span>
                  <h3 className="mt-4 text-display-2 text-[1.375rem]">
                    Check your inbox
                  </h3>
                  <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-ink-3">
                    The audit is on its way. It arrives as a single PDF — no
                    sequence, no drip campaign.
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-display-2 text-[1.25rem]">
                    Get the audit
                  </h3>
                  <p className="mt-2 text-sm text-ink-3">
                    One email with the PDF. That&rsquo;s the whole arrangement.
                  </p>
                  <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <Input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      label="Email address"
                      placeholder="you@yourstudio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={error}
                      disabled={status === "loading"}
                    />
                    <Button
                      type="submit"
                      variant="accent"
                      size="lg"
                      className="w-full"
                      disabled={status === "loading"}
                    >
                      {status === "loading" ? "Sending…" : "Send me the audit"}
                    </Button>
                  </form>
                  <p className="mt-4 text-center text-xs text-ink-4">
                    No spam. Unsubscribe anytime. We never share your address.
                  </p>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
