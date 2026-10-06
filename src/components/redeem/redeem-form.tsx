"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { site } from "@/lib/site";

/** The one purchasable product (src/lib/products.ts). Third-party codes
 *  redeem a single seat; extra seats are a manual adjustment, not a form
 *  field, so a buyer can never ask for more than they paid for. */
const PRODUCT_SLUG = "client-growth-system";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Phase = "form" | "working" | "redeemed" | "failed";

export function RedeemForm() {
  const [phase, setPhase] = useState<Phase>("form");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [productName, setProductName] = useState("");

  async function onRedeem(event: FormEvent) {
    event.preventDefault();
    if (phase === "working") return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      setPhase("failed");
      return;
    }
    if (!code.trim()) {
      setError("Please enter your redemption code.");
      setPhase("failed");
      return;
    }

    setPhase("working");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          items: [{ slug: PRODUCT_SLUG, qty: 1 }],
          coupon: code.trim(),
        }),
      });
      const data = (await response.json()) as {
        free?: boolean;
        status?: string;
        productName?: string;
        error?: string;
      };

      // Only an order the server actually completed counts. A partial
      // discount would come back with a gateway URL instead of `free`.
      if (!response.ok || data.free !== true || data.status !== "paid") {
        setError(
          data.error ||
            "We couldn't redeem that code. Check it and try again — the exact characters matter."
        );
        setPhase("failed");
        return;
      }

      setProductName(data.productName || "Client Growth System");
      setEmail(trimmedEmail);
      setPhase("redeemed");
    } catch {
      setError(
        "We couldn't reach our ordering service. Try again in a moment."
      );
      setPhase("failed");
    }
  }

  if (phase === "redeemed") {
    return (
      <div className="rounded-md border border-line-strong bg-surface p-6">
        <p className="spec text-accent">Code redeemed</p>
        <h2 className="mt-3 text-display-2">{productName} is yours.</h2>
        <ol className="mt-5 space-y-4 text-sm leading-relaxed text-ink-2">
          <li className="flex gap-3">
            <span className="font-display italic text-ink-3">1</span>
            <span>
              <strong className="font-medium text-ink">Check your email.</strong>{" "}
              A receipt with your licence key and download instructions is on
              its way to{" "}
              <strong className="font-medium text-ink">{email}</strong>. It may
              take a few seconds, and it can land in promotions or spam.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-display italic text-ink-3">2</span>
            <span>
              Create a Veyra account with that same address. Your purchase
              attaches to it automatically — you are not buying it again.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-display italic text-ink-3">3</span>
            <span>
              Open{" "}
              <Link
                href="/account/library"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Library
              </Link>{" "}
              to download — Windows and macOS are both offered, your current
              system is the one selected.{" "}
              <Link
                href="/account/licences"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Licences
              </Link>{" "}
              is where activations and seats live.
            </span>
          </li>
        </ol>
        <p className="mt-5 text-xs leading-relaxed text-ink-4">
          Nothing was charged — this code already covered the purchase. If the
          licence does not appear within a minute, write to{" "}
          <a
            href={`mailto:${site.contact.email}`}
            className="underline underline-offset-2"
          >
            {site.contact.email}
          </a>{" "}
          from {email} with your code.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onRedeem} className="max-w-md space-y-5">
      <Input
        label="Redemption code"
        name="code"
        autoComplete="one-time-code"
        spellCheck={false}
        placeholder="ASV-XXXXX-XXXXX"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        disabled={phase === "working"}
      />
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        hint="Your licence is keyed to this address, so use one you can sign in to."
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={phase === "working"}
      />

      {phase === "failed" && error ? (
        <p role="alert" className="text-sm leading-relaxed text-clay">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={phase === "working"}>
        {phase === "working" ? "Checking…" : "Redeem code"}
      </Button>

      <p className="text-xs leading-relaxed text-ink-4">
        One code installs one copy on one seat. Codes are single-use and are
        spent the moment this page succeeds.
      </p>
    </form>
  );
}
