"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/site";
import { Button } from "@/components/ui/button";

/**
 * Order result — the only place a purchase is ever shown as complete.
 *
 * The status comes from GET /api/orders/[id], which reads the orders
 * table — never from anything the browser received during payment. While
 * verification is still pending (e.g. Razorpay's API was slow to confirm),
 * the page polls briefly and communicates honestly that confirmation is
 * in flight. Razorpay webhooks resolve pending orders durably even if
 * this page is never opened again.
 */

type OrderStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

type PublicOrder = {
  id: string;
  status: OrderStatus;
  productName: string;
  quantity: number;
  amount: number; // cents
  currency: string;
  createdAt: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function CompletePage() {
  return (
    <Suspense fallback={null}>
      <CompleteContent />
    </Suspense>
  );
}

function CompleteContent() {
  const params = useSearchParams();
  const orderId = params.get("order") ?? "";

  return (
    <div className="bg-paper">
      <div className="container-tight py-16 sm:py-24">
        {UUID_RE.test(orderId) ? (
          <OrderResult orderId={orderId} />
        ) : (
          <div className="text-center">
            <h1 className="text-display-1">Order not found.</h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-3">
              We couldn&rsquo;t find that order reference. If you just
              completed a payment, check the link you were redirected to — or
              contact us and we&rsquo;ll look it up.
            </p>
            <div className="mt-8">
              <Button href="/" variant="outline" size="md">
                Back to the storefront
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderResult({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const pollsLeft = useRef(6); // ~30s of gentle polling while pending

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as PublicOrder;
        if (cancelled) return;
        setOrder(data);
        setLoading(false);
        if (data.status === "pending" && pollsLeft.current > 0) {
          pollsLeft.current -= 1;
          timer = setTimeout(poll, 5000);
        }
      } catch {
        if (!cancelled && pollsLeft.current > 0) {
          pollsLeft.current -= 1;
          timer = setTimeout(poll, 5000);
        } else if (!cancelled) {
          // Exhausted retries — render the not-found/failure branch.
          setLoading(false);
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="py-16 text-center" role="status">
        <p className="text-eyebrow">Checking your order…</p>
        <h1 className="mt-4 text-display-2">One moment.</h1>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center">
        <h1 className="text-display-1">Order not found.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-3">
          We couldn&rsquo;t load this order. If your payment went through,
          contact us and we&rsquo;ll confirm it manually.
        </p>
        <ContactUs />
      </div>
    );
  }

  if (order.status === "paid") {
    return <PaidOrder order={order} />;
  }

  if (order.status === "pending") {
    return (
      <div className="text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface spec text-ink-3"
        >
          …
        </span>
        <h1 className="mt-6 text-display-1">
          Payment received — verification in progress.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-3">
          Your payment for {order.productName} is being confirmed. This
          usually takes a moment. Your order reference is{" "}
          <span className="tnum font-medium text-ink-2">{order.id}</span> —
          keep it until your order is confirmed.
        </p>
        <p className="mx-auto mt-3 max-w-md text-xs text-ink-4">
          This page will update once verification completes. If it stays
          pending, contact us with your order reference.
        </p>
        <ContactUs />
      </div>
    );
  }

  // failed / cancelled / refunded
  const headline =
    order.status === "failed"
      ? "Payment didn't go through."
      : order.status === "cancelled"
        ? "Payment was cancelled."
        : "This order was refunded.";

  return (
    <div className="text-center">
      <h1 className="text-display-1">{headline}</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-3">
        {order.status === "refunded"
          ? `The order for ${order.productName} was refunded.`
          : `No charge was completed for ${order.productName}. You can start a new checkout whenever you're ready.`}
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          href="/products/client-growth-system"
          variant="accent"
          size="md"
          arrow
        >
          Back to the product
        </Button>
        <ContactUs button />
      </div>
    </div>
  );
}

function PaidOrder({ order }: { order: PublicOrder }) {
  return (
    <div>
      <div className="text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent-soft"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-5 w-5 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 8.5 3.5 3.5L13 4.5" />
          </svg>
        </span>
        <p className="text-eyebrow mt-6">Payment confirmed</p>
        <h1 className="mt-4 text-display-1">
          {order.productName} is ready.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-3">
          Your payment was verified and your order is recorded — a licence
          for {order.quantity === 1 ? "1 seat" : `${order.quantity} seats`}{" "}
          has been issued with it. Everything you need is in your account:
          product access, your licence, and the Quick Start guide.
        </p>
      </div>

      {/* Order record — quiet, factual */}
      <dl className="mx-auto mt-10 max-w-md divide-y divide-line rounded-md border border-line bg-surface px-6 py-2 text-sm">
        <Row label="Product">
          <span className="font-medium text-ink">{order.productName}</span>
        </Row>
        <Row label="Licensed seats">
          <span className="tnum text-ink-2">{order.quantity}</span>
        </Row>
        <Row label="Licence">
          <span className="text-ink-2">Active · one-time purchase</span>
        </Row>
        <Row label="Amount paid">
          <span className="tnum font-medium text-ink">
            {formatPrice(order.amount / 100)}
          </span>
        </Row>
        <Row label="Order reference">
          <span className="tnum text-xs text-ink-2">{order.id}</span>
        </Row>
        <Row label="Date">
          <span className="tnum text-ink-2">
            {new Date(order.createdAt).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </Row>
      </dl>

      <p className="mx-auto mt-8 max-w-md text-center text-xs leading-relaxed text-ink-4">
        Questions about your order? Write to{" "}
        <a
          href="mailto:hello@veyra.co"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          hello@veyra.co
        </a>{" "}
        with your order reference.
      </p>

      <div className="mx-auto mt-8 max-w-md rounded-md border border-line bg-surface p-5 sm:p-6">
        <p className="text-sm font-medium text-ink">
          Welcome to the Client Growth System
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-3">
          Your system is ready. Start by building the foundation, then move
          through acquisition, sales, delivery, retention, and growth.
        </p>
        <p className="mt-3 spec text-ink-4" aria-hidden="true">
          Build → Acquire → Sell → Deliver → Retain → Grow
        </p>
        <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button href="/account/sign-up" variant="accent" size="sm" arrow>
            Create your account
          </Button>
          <Button href="/account/sign-in" variant="ghost" size="sm">
            Already have one? Sign in
          </Button>
        </div>
        <p className="mt-3 text-center text-xs leading-relaxed text-ink-4">
          Use the email on this order — your product, licence, seats, and
          Quick Start will be waiting in your account.
        </p>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back to the storefront
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <dt className="spec text-ink-4">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function ContactUs({ button = false }: { button?: boolean }) {
  if (button) {
    return (
      <Button href="/contact" variant="outline" size="md">
        Contact us
      </Button>
    );
  }
  return (
    <div className="mt-8">
      <Button href="/contact" variant="outline" size="md">
        Contact us
      </Button>
    </div>
  );
}
