import { FOUNDING_PRICE } from "@/lib/pricing";
import { formatPrice } from "@/lib/site";

/**
 * FoundingPrice — compact price display for cards and CTA strips.
 *
 * While launch pricing is in effect (catalog price above the founding
 * price), the founding price leads and the regular catalog price is
 * struck through. Otherwise the catalog price renders alone. Amounts
 * resolve from the pricing module — the same authority checkout uses.
 */
export function FoundingPrice({
  price,
  size = "md",
  note,
  className = "",
}: {
  /** The catalog's regular price. */
  price: number;
  size?: "sm" | "md";
  /** Optional trailing note, e.g. "one-time". */
  note?: string;
  className?: string;
}) {
  const launchActive = price > FOUNDING_PRICE;

  if (!launchActive) {
    return (
      <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
        <span className="tnum font-medium text-ink">{formatPrice(price)}</span>
        {note ? (
          <span className="text-xs font-normal text-ink-4">{note}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}
    >
      <span
        className={`tnum font-medium text-ink ${
          size === "sm" ? "text-lg" : "text-3xl"
        }`}
      >
        {formatPrice(FOUNDING_PRICE)}
      </span>
      <span
        aria-hidden="true"
        className="tnum text-sm text-ink-4 line-through"
      >
        {formatPrice(price)}
      </span>
      <span className="sr-only">
        Founding customer price {formatPrice(FOUNDING_PRICE)}, regular price{" "}
        {formatPrice(price)}.
      </span>
      <span className="text-xs font-medium text-accent-ink">
        founding price
      </span>
      {note ? (
        <span aria-hidden="true" className="text-xs font-normal text-ink-4">
          · {note}
        </span>
      ) : null}
    </span>
  );
}
