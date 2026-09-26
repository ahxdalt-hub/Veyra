"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

/**
 * PurchaseCta — the product page's single primary purchase action.
 *
 * Enters the existing cart by slug (the cart validates against the
 * catalog and opens the drawer); the amount charged is resolved
 * server-side by the same pricing module the label displays. The price
 * price is displayed by the surrounding section — resolved from the
 * pricing module by the server page, never hardcoded at the call site.
 */
export function PurchaseCta({
  slug,
  name,
  size = "lg",
  className = "",
}: {
  slug: string;
  name: string;
  size?: "sm" | "md" | "lg";
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
      className={`whitespace-normal! ${className}`}
      onClick={handleAdd}
    >
      {inCart ? (
        <>
          <CheckIcon className="h-4 w-4" />
          {justAdded ? "Added — in your cart" : "In your cart — view"}
        </>
      ) : (
        <>Get {name}</>
      )}
      <span className="sr-only"> — one-time purchase</span>
    </Button>
  );
}
