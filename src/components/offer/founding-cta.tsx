"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/site";

/**
 * FoundingCta — the offer page's primary action.
 *
 * "Get the Client Growth System — $79". Uses the existing cart and
 * checkout architecture end to end: the slug enters the cart, the drawer
 * opens, and the amount is resolved by the catalog — the $79 shown here
 * is the same number the server charges.
 */
export function FoundingCta({
  slug,
  name,
  price,
  size = "lg",
  className = "",
}: {
  slug: string;
  name: string;
  price: number;
  size?: "md" | "lg";
  className?: string;
}) {
  const { add, detailedLines } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const inCart = detailedLines.some((l) => l.product.slug === slug);

  function handleAdd() {
    add(slug);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  }

  return (
    <Button
      variant="accent"
      size={size}
      // The founding label is long; on narrow cards it wraps instead of
      // overflowing (whitespace-nowrap! beats the Button base's nowrap).
      className={`whitespace-normal! ${className}`}
      onClick={handleAdd}
    >
      {inCart ? (
        <>
          <CheckIcon className="h-4 w-4" />
          {justAdded ? "Added — in your cart" : "In your cart — view"}
        </>
      ) : (
        <>Get the {name} — {formatPrice(price)}</>
      )}
      <span className="sr-only"> — founding customer price, one-time purchase</span>
    </Button>
  );
}
