import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getFeaturedProduct } from "@/lib/products";
import { formatPrice } from "@/lib/site";

export default function NotFound() {
  const featured = getFeaturedProduct();

  return (
    <div className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="spec text-ink-4">Error 404</p>
      <h1 className="text-display-1 mt-4 max-w-xl">
        This page isn&rsquo;t part of the system.
      </h1>
      <p className="mt-5 max-w-md text-lead">
        The address you followed doesn&rsquo;t exist — possibly moved, possibly
        never built. Everything current is one click below.
      </p>
      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <Button href="/" variant="accent" size="lg" arrow>
          Back to the homepage
        </Button>
        <Button href="/shop" variant="outline" size="lg">
          Browse products
        </Button>
      </div>
      <p className="mt-10 text-xs text-ink-4">
        P.S. — the flagship is{" "}
        <Link
          href={`/products/${featured.slug}`}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          {featured.name}
        </Link>{" "}
        ({formatPrice(featured.price)}).
      </p>
    </div>
  );
}
