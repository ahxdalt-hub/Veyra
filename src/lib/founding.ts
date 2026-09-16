/**
 * Founding-release status — the banner's honest scarcity signal.
 *
 * The founding offer ("first 30 customers") is a real commercial limit, not
 * marketing theatre: a customer has claimed a founding slot once their order
 * for the flagship is paid. The count is derived from the existing
 * public.orders table (the single source of truth for purchases) — no new
 * tables, no duplicated commerce state. One paid order = one customer,
 * regardless of seats; a refunded order releases its slot because it stops
 * counting as paid.
 *
 * The banner NEVER renders a live remaining-count: it only distinguishes
 * ACTIVE (fewer than FOUNDING_LIMIT paid flagship orders) from CLOSED
 * (the allocation is reached). Until the limit is genuinely reached,
 * checkout still charges the founding price, so "active" is always the
 * truthful state — including in local dev without Supabase, where the
 * count is unavailable and we fail open.
 *
 * Caching: the result is wrapped in unstable_cache under the "founding"
 * tag and refreshed instantly when an order flips to paid
 * (see revalidateFoundingStatus in src/lib/orders.ts), with an hourly
 * revalidate as a safety net. Marketing pages stay statically rendered.
 */

import "server-only";
import { revalidatePath, unstable_cache, updateTag } from "next/cache";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/config";

/** The flagship product whose founding allocation the banner announces. */
export const FLAGSHIP_SLUG = "client-growth-system";

/** Real commercial limit: founding price is reserved for the first 30
 *  paying customers. Mirrored nowhere else — the banner reads this. */
export const FOUNDING_LIMIT = 30;

export type FoundingState = "active" | "closed";

/**
 * Count of paid flagship orders, or null when it cannot be determined
 * (no Supabase configured, network error, unexpected response). A HEAD
 * request with `Prefer: count=exact` returns only the total in
 * Content-Range — the cheapest honest read of the allocation.
 */
async function paidFoundingOrderCount(): Promise<number | null> {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) return null;

  const endpoint =
    `${url.replace(/\/$/, "")}/rest/v1/orders` +
    `?select=id&product_slug=eq.${FLAGSHIP_SLUG}&status=eq.paid`;

  try {
    const res = await fetch(endpoint, {
      method: "HEAD",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: "0-0",
        "Range-Unit": "items",
        Prefer: "count=exact",
      },
      // The data cache defers to this function's own policy: unstable_cache
      // holds the result (tag "founding" + hourly revalidate), so the fetch
      // must not add its own no-store, which would mark every marketing
      // route dynamic during prerender.
      cache: "default",
    });
    if (!res.ok) return null;
    const range = res.headers.get("content-range"); // e.g. "0-0/12"
    const total = range ? Number(range.split("/")[1]) : NaN;
    return Number.isFinite(total) && total >= 0 ? total : null;
  } catch {
    return null;
  }
}

/**
 * Current founding-release state for the marketing surfaces.
 * Tag "founding" is invalidated by updateOrderStatus on pending→paid,
 * so the banner reacts to real sales without polling.
 */
export const getFoundingStatus = unstable_cache(
  async (): Promise<FoundingState> => {
    const count = await paidFoundingOrderCount();
    if (count === null) return "active";
    return count >= FOUNDING_LIMIT ? "closed" : "active";
  },
  ["founding-status"],
  { tags: ["founding"], revalidate: 3600 }
);

/**
 * Invalidate the cached founding state after an order changes to a
 * state that moves the allocation (pending→paid consumes a slot; a
 * refund releases one). Prerendered marketing pages carry the banner
 * from the (site) layout, so the layout is revalidated on demand too —
 * the next request renders fresh state. Called from src/lib/orders.ts;
 * a no-op if nothing is cached.
 */
export function revalidateFoundingStatus(): void {
  try {
    updateTag("founding");
    revalidatePath("/", "layout");
  } catch {
    // Revalidation outside a request context (e.g. scripts/tests) —
    // the hourly revalidate on the tag is the safety net.
  }
}
