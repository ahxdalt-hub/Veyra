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

/**
 * Checkout (client) — one page, one email field, one payment action.
 *
 * Flow:
 *   1. POST /api/checkout with slugs + email ONLY. The server resolves the
 *      amount from the catalog and creates a hosted Lemon Squeezy checkout.
 *   2. The browser is redirected to that checkout; the customer pays there.
 *   3. Lemon Squeezy redirects back to /checkout/complete?order=<id>, where
 *      the result page polls the ORDERS TABLE. Confirmation comes only from
 *      the signed order_created webhook — the redirect back here is
 *      decoration, never proof.
 *
 * UI states: idle → creating → redirecting on success; failed / cancelled /
 * not-configured are explicit, recoverable states.
 *
 * `mode` / `configured` are resolved SERVER-SIDE (page.tsx) from env
 * presence only — no credential ever crosses into this component. They are
 * display facts so a test-mode deployment says so honestly.
 */

type CheckoutProps = {
  /** Resolved store mode this deployment is wired to. */
  mode: "test" | "live";
  /** Whether Lemon Squeezy credentials + variant mappings exist. When
   *  false the page states plainly that payments aren't enabled yet. */
  configured: boolean;
};

type Phase =
  | "idle"
  | "creating"
  | "redirecting"
  | "failed"
  | "not-configured";

export default function CheckoutClient({ mode, configured }: CheckoutProps) {
  const router = useRouter();
  const { detailedLines } = useCart();

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | undefined>();

  // Coupon — a proposal, nothing more. The server re-validates and
  // decides at order creation; the UI only mirrors what the validate
  // endpoint returns (a preview, never the charged number).
  const [couponCode, setCouponCode] = useState("");
  const [couponState, setCouponState] = useState<
    | { status: "idle" }
    | { status: "checking" }
    | { status: "applied"; code: string; label: string; discountDollars: number }
    | { status: "rejected"; message: string }
  >({ status: "idle" });

  const seatQty = detailedLines.reduce((sum, l) => sum + l.qty, 0) || 1;

  async function applyCoupon() {
    const code = couponCode.trim();
    if (!code || couponState.status === "checking" || couponState.status === "applied") return;
    setCouponState({ status: "checking" });
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email, qty: seatQty }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        message?: string;
        error?: string;
        code?: string;
        label?: string;
        discountDollars?: number;
      };
      if (res.ok && data.valid) {
        setCouponState({
          status: "applied",
          code: data.code ?? code.toLowerCase(),
          label: data.label ?? code.toUpperCase(),
          discountDollars: data.discountDollars ?? 0,
        });
      } else {
        setCouponState({
          status: "rejected",
          message:
            data.message ?? data.error ?? "We couldn't apply that code. Check for typos.",
        });
      }
    } catch {
      setCouponState({
        status: "rejected",
        message: "We couldn't check that code right now.",
      });
    }
  }

  const busy = phase === "creating" || phase === "redirecting";

  async function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || detailedLines.length === 0) return;

    setError(undefined);
    setPhase("creating");

    try {
      // 1. Server creates the order + hosted checkout — we send no prices.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          items: detailedLines.map((l) => ({ slug: l.product.slug, qty: l.qty })),
          coupon: couponState.status === "applied" ? couponState.code : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        orderId?: string;
        checkoutUrl?: string;
        amount?: number;
        currency?: string;
        productName?: string;
        free?: boolean;
        status?: string;
      };

      if (res.status === 503 && data.code === "payments_not_configured") {
        setPhase("not-configured");
        return;
      }

      // Free checkout — the coupon covered the full amount, so the server
      // has ALREADY confirmed the order and granted the licence. There is
      // no payment page to open: go straight to the result page, which
      // links into the account where the product and licence appear.
      if (res.ok && data.free && data.orderId && data.status === "paid") {
        router.replace(`/checkout/complete?order=${data.orderId}`);
        return;
      }
      if (!res.ok || !data.orderId || !data.checkoutUrl) {
        throw new Error(data.error ?? "We couldn't start your payment.");
      }

      // 2. Hand the customer over to Lemon Squeezy's hosted checkout.
      //    Confirmation is NOT this page's job — the webhook confirms, and
      //    /checkout/complete reads the orders table.
      setPhase("redirecting");
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setPhase("failed");
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't start your payment. Please try again."
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

  // The charged amount mirrors the server's validation preview; when no
  // coupon is applied this equals the plain tier total.
  const couponDiscount =
    couponState.status === "applied" ? couponState.discountDollars : 0;
  const payable = Math.max(0, tier.total - couponDiscount);

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
              {payable === 0 && couponState.status === "applied" ? (
                <>
                  Your coupon covers the full amount — nothing will be
                  charged. Your licences are issued the moment you confirm,
                  and everything lands in your account.
                </>
              ) : (
                <>
                  One product, one payment, delivered digitally. You&rsquo;re
                  buying licences for{" "}
                  {tier.seats === 1 ? "1 seat" : `${tier.seats} seats`} —
                  confirm the amount in Lemon Squeezy&rsquo;s secure checkout
                  before anything is charged.
                </>
              )}
            </p>

            {phase === "not-configured" || !configured ? (
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
                  {phase === "redirecting" && "Opening secure checkout…"}
                  {phase === "idle" &&
                    (payable === 0 && couponState.status === "applied"
                      ? "Complete your free order"
                      : `Pay ${formatPrice(payable)} securely`)}
                  {phase === "failed" &&
                    `Try again — pay ${formatPrice(payable)}`}
                </Button>

                <p className="mt-3 text-center text-xs text-ink-4">
                  Processed by Lemon Squeezy · {REFUND_WINDOW_LABEL}
                </p>

                {mode === "test" ? (
                  <p className="mt-4 rounded-sm border border-line bg-paper px-3 py-2 text-center text-xs leading-relaxed text-ink-3">
                    <span className="font-medium text-ink-2">Test mode.</span>{" "}
                    This deployment runs Lemon Squeezy&rsquo;s test checkout —
                    no real money moves and live cards are never accepted.
                  </p>
                ) : null}

                {/* Coupon — a preview only; the server decides at payment. */}
                <div className="mt-6 border-t border-line pt-5">
                  {couponState.status === "applied" ? (
                    <div className="flex items-center justify-between rounded-sm border border-accent/25 bg-accent-soft/50 px-3 py-2.5">
                      <p className="text-sm text-accent-ink">
                        <span className="font-medium">{couponState.code.toUpperCase()}</span>
                        {" · "}
                        {couponState.label}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setCouponState({ status: "idle" });
                          setCouponCode("");
                        }}
                        className="text-xs font-medium text-ink-3 underline-offset-2 hover:text-ink hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="coupon" className="spec text-ink-4">
                        Discount code
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input
                          id="coupon"
                          type="text"
                          autoComplete="off"
                          spellCheck={false}
                          value={couponCode}
                          disabled={busy}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            if (couponState.status === "rejected")
                              setCouponState({ status: "idle" });
                          }}
                          placeholder="CODE"
                          className="h-10 min-w-0 flex-1 rounded-sm border border-line bg-surface px-3 font-mono text-sm tracking-wider text-ink placeholder:text-ink-4/70 focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-accent/15 disabled:opacity-60"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="md"
                          onClick={() => void applyCoupon()}
                          disabled={busy || !couponCode.trim() || couponState.status === "checking"}
                        >
                          {couponState.status === "checking" ? "Checking…" : "Apply"}
                        </Button>
                      </div>
                      {couponState.status === "rejected" ? (
                        <p role="alert" className="mt-2 text-xs text-clay">
                          {couponState.message}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </form>
            )}

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
                {couponDiscount > 0 ? (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-3">
                      Coupon ({couponState.status === "applied" ? couponState.code.toUpperCase() : ""})
                    </dt>
                    <dd className="tnum text-accent-ink">
                      −{formatPrice(couponDiscount)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-line pt-3">
                  <dt className="font-medium text-ink">Total</dt>
                  <dd className="text-base font-medium tnum text-ink">
                    <AnimatedNumber value={payable} format={formatPrice} />
                  </dd>
                </div>
              </dl>

              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                {[
                  "One-time payment — no subscription",
                  payable === 0 && couponState.status === "applied"
                    ? "Full discount applied — licences issued instantly, no payment needed"
                    : `Licences for ${tier.seats === 1 ? "1 seat" : `${tier.seats} seats`} — delivered after payment is confirmed`,
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
