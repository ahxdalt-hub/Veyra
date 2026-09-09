"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";

/**
 * AddToCartButton — with a brief "added" confirmation state.
 * Opens the cart drawer on add (via context) so the count visibly
 * updates — the micro-interaction confirms the action.
 */
export function AddToCartButton({
  slug,
  name,
}: {
  slug: string;
  name: string;
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
      variant={inCart ? "outline" : "accent"}
      size="lg"
      className="w-full"
      onClick={handleAdd}
    >
      {inCart ? (
        <>
          <CheckIcon className="h-4 w-4" />
          {justAdded ? "Added again" : "In your cart — view"}
        </>
      ) : (
        "Add to cart"
      )}
      <span className="sr-only"> — {name}</span>
    </Button>
  );
}
