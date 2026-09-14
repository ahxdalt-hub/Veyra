"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-context";
import { formatPrice, REFUND_WINDOW_LABEL } from "@/lib/site";
import { formatDiscountPercent } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckIcon } from "@/components/ui/icons";
import { AnimatedNumber } from "@/components/motion/animated-number";
import type { RazorpayOptions, RazorpayErrorResponse } from "@/lib/razorpay-client";

/**
 * Checkout — one page, one email field, one payment action.
 *
 * Flow:
 *   1. POST /api/checkout with slugs + email ONLY. The server resolves the
 *      amount from the catalog and creates the Razorpay order.
 *   2. Razorpay's checkout.js modal opens; the customer pays there.
 *   3. On success, POST /api/checkout/verify lets the server authenticate
 *      the result (signature + Razorpay payment state) before the UI ever
 *      says "confirmed".
 *
 * UI states: idle → creating → paying → verifying → redirect on success;
 * failed / cancelled / not-configured are explicit, recoverable states.
 */

type Phase =
  | "idle"
  | "creating"
  | "paying"
  | "verifying"
  | "failed"
  | "cancelled"
  | "not-configured";

function loadRazorpay(): Promise<NonNullable<Window["Razorpay"]>> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay checkout failed to load."));
    };
    script.onerror = () => reject(new Error("Razorpay checkout failed to load."));
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { detailedLines, total } = useCart();

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | undefined>();

  const busy = phase === "creating" || phase === "paying" || phase === "verifying";

  async function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || detailedLines.length === 0) return;

    setError(undefined);
    setPhase("creating");

    try {
      // 1. Server creates the order — we send no prices.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          items: detailedLines.map((l) => ({ slug: l.product.slug, qty: l.qty })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        orderId?: string;
        razorpayOrderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        productName?: string;
      };

      if (res.status === 503 && data.code === "payments_not_configured") {
        setPhase("not-configured");
        return;
      }
      if (
        !res.ok ||
        !data.orderId ||
        !data.razorpayOrderId ||
        !data.keyId ||
        typeof data.amount !== "number" ||
        !data.currency
      ) {
        throw new Error(data.error ?? "We couldn't start your payment.");
      }

      // 2. Open Razorpay's checkout.
      const Razorpay = await loadRazorpay();
      setPhase("paying");

      const options: RazorpayOptions = {
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        name: "Veyra",
        description: data.productName,
        prefill: { email },
        theme: { color: "#17150f" },
        modal: {
          ondismiss: () => {
            // Customer closed the modal — no charge was made.
            setPhase("cancelled");
            fetch("/api/checkout/cancel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderId }),
            }).catch(() => null);
          },
        },
        handler: (response) => {
          // 3. The browser's response is a claim — the server decides.
          void confirmPayment(data.orderId!, response);
        },
      };

      const rzp = new Razorpay(options);
      rzp.on("payment.error", (arg: never) => {
        const err = arg as unknown as RazorpayErrorResponse;
        setPhase("failed");
        setError(
          err?.description ??
            "The payment didn't go through. You have not been charged."
        );
      });
      rzp.open();
    } catch (err) {
      setPhase("failed");
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't start your payment. Please try again."
      );
    }
  }

  async function confirmPayment(
    orderId: string,
    response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  ) {
    setPhase("verifying");
    try {
      const res = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...response }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        error?: string;
      };

      if (res.ok && data.status === "paid") {
        // Server-confirmed — only now show the purchase as complete.
        router.replace(`/checkout/complete?order=${orderId}`);
        return;
      }

      if (data.status === "pending") {
        // Signature valid, confirmation still in flight. The result page
        // polls the order status — the UI never fakes confirmation.
        router.replace(`/checkout/complete?order=${orderId}`);
        return;
      }

      setPhase("failed");
      setError(data.error ?? "Payment could not be verified.");
    } catch {
      setPhase("failed");
      setError(
        "We lost the connection while verifying your payment. Check the result page in a moment, or contact us if you were charged."
      );
    }
  }

  /* ------------------------------------------------------------------ */

  if (detailedLines.length === 0) {
    return (
      <div className="bg-paper">
        <div className="container-tight flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface font-display text-lg italic text-ink-3"
          >
            V
          </span>
          <h1 className="mt-5 text-display-2">Your cart is empty.</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-3">
            Add a product to your cart and it will show up here for checkout.
          </p>
          <Button
            href="/products/client-growth-system"
            variant="outline"
            size="md"
            className="mt-6"
          >
            View Client Growth System
          </Button>
        </div>
      </div>
    );
  }

  const line = detailedLines[0];
  const product = line.product;
  const tier = line.tier;

  return (
    <div className="bg-paper">
      <div className="container-page py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-xs text-ink-4">
            <li><Link href="/" className="hover:text-ink">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink-2">Checkout</li>
          </ol>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          {/* ---------------------------------------------------------- */}
          {/* Payment column                                              */}
          {/* ---------------------------------------------------------- */}
          <div>
            <h1 className="text-display-1">Checkout</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-3">
              One product, one payment, delivered digitally. You&rsquo;re
              buying licences for {tier.seats === 1 ? "1 seat" : `${tier.seats} seats`} —
              confirm the amount in Razorpay&rsquo;s secure window before
              anything is charged.
            </p>

            {phase === "not-configured" ? (
              <div
                role="status"
                className="mt-8 rounded-md border border-dashed border-line-strong bg-surface p-6"
              >
                <p className="spec text-ink-4">Payments not live yet</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">
                  Online payments aren&rsquo;t enabled on this deployment yet,
                  so checkout can&rsquo;t start. Nothing has been charged —
                  write to{" "}
                  <a
                    href="mailto:hello@veyra.co"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    hello@veyra.co
                  </a>{" "}
                  and we&rsquo;ll arrange your purchase directly.
                </p>
              </div>
            ) : (
              <form onSubmit={onPay} className="mt-8 max-w-md">
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
                  hint="Your order and delivery details are tied to this address."
                />

                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="mt-6 w-full"
                  disabled={busy}
                >
                  {phase === "creating" && "Preparing your payment…"}
                  {phase === "paying" && "Complete payment in the secure window…"}
                  {phase === "verifying" && "Verifying your payment…"}
                  {phase === "idle" &&
                    `Pay ${formatPrice(total)} securely`}
                  {(phase === "failed" || phase === "cancelled") &&
                    `Try again — pay ${formatPrice(total)}`}
                </Button>

                <p className="mt-3 text-center text-xs text-ink-4">
                  Processed by Razorpay · {REFUND_WINDOW_LABEL}
                </p>
              </form>
            )}

            {phase === "cancelled" ? (
              <div
                role="status"
                className="mt-6 max-w-md rounded-md border border-line bg-surface p-4"
              >
                <p className="text-sm font-medium text-ink">
                  Payment cancelled.
                </p>
                <p className="mt-1 text-sm text-ink-3">
                  The payment window was closed before completion — no charge
                  was made. You can retry whenever you&rsquo;re ready.
                </p>
              </div>
            ) : null}

            {phase === "failed" && error ? (
              <div
                role="alert"
                className="mt-6 max-w-md rounded-md border border-line bg-clay-soft/60 p-4"
              >
                <p className="text-sm font-medium text-ink">Payment failed.</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">
                  {error} If money left your account but this message
                  appeared, contact{" "}
                  <a
                    href="mailto:hello@veyra.co"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    hello@veyra.co
                  </a>{" "}
                  and we&rsquo;ll sort it out.
                </p>
              </div>
            ) : null}
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Order summary                                               */}
          {/* ---------------------------------------------------------- */}
          <aside aria-label="Order summary">
            <div className="rounded-md border border-line bg-surface p-6 shadow-sm">
              <h2 className="text-eyebrow">Order summary</h2>

              <div className="mt-5 flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-accent/25 bg-accent-soft font-display text-lg italic text-accent-ink"
                >
                  {product.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{product.name}</p>
                  <p className="mt-0.5 text-xs text-ink-3">{product.tagline}</p>
                  <p className="mt-2 spec text-ink-4">
                    {tier.seats === 1 ? "1 seat" : `${tier.seats} seats`} · Digital delivery
                  </p>
                </div>
              </div>

              <dl className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-3">
                    Seats × per-seat price
                  </dt>
                  <dd className="tnum text-ink-2">
                    {tier.seats} ×{" "}
                    <span className="mr-1.5 text-ink-4 line-through">
                      {formatPrice(tier.regularPerSeat)}
                    </span>
                    {formatPrice(tier.perSeat)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-3">Subtotal</dt>
                  <dd className="tnum text-ink-2">
                    <AnimatedNumber value={tier.subtotal} format={formatPrice} />
                  </dd>
                </div>
                {tier.teamSavings > 0 ? (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-3">
                      Team discount (
                      {formatDiscountPercent(tier.discountPercent)})
                    </dt>
                    <dd className="tnum text-accent-ink">
                      −
                      <AnimatedNumber
                        value={tier.teamSavings}
                        format={formatPrice}
                      />
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <dt className="font-medium text-ink">Total</dt>
                  <dd className="text-base font-medium tnum text-ink">
                    <AnimatedNumber value={tier.total} format={formatPrice} />
                  </dd>
                </div>
              </dl>

              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                {[
                  "One-time payment — no subscription",
                  `Licences for ${tier.seats === 1 ? "1 seat" : `${tier.seats} seats`} — delivered after payment is confirmed`,
                  REFUND_WINDOW_LABEL,
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span className="text-xs leading-relaxed text-ink-3">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/products/client-growth-system"
              className="mt-4 inline-block text-xs text-ink-3 underline-offset-4 hover:text-ink hover:underline"
            >
              ← Back to the product
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
