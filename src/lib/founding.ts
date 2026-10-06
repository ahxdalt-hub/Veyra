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
 * Caching: memoised in-module for FOUNDED_STATE_TTL_MS per isolate, NOT with
 * `unstable_cache`. On this app's Cloudflare Worker build (open-next with no
 * R2 / Durable-Object cache binding — see open-next.config.ts) a cached read
 * awaited during a *page render* never resolves: the route hangs, then the
 * Worker fails with Cloudflare error 1102. The same call from a route handler
 * is fine, which is why only the marketing pages went dark. `no-store` keeps
 * the read out of Next's data cache, so pages render like `/api/*` does, and
 * the memo holds the cost to roughly one HEAD request per isolate per minute.
 * A paid order still refreshes the state immediately via
 * revalidateFoundingStatus (see src/lib/orders.ts), which drops the memo.
 */

import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/config";

/** The flagship product whose founding allocation the banner announces. */
export const FLAGSHIP_SLUG = "client-growth-system";

/** Real commercial limit: founding price is reserved for the first 30
 *  paying customers. Mirrored nowhere else — the banner reads this. */
export const FOUNDING_LIMIT = 30;

export type FoundingState = "active" | "closed";

/** How long one isolate may reuse a counted allocation. */
const FOUNDING_STATE_TTL_MS = 60_000;

/** A page render must never wait on Supabase; fail open to "active" instead. */
const FOUNDING_READ_TIMEOUT_MS = 2_000;

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
      // no-store: this must not enter Next's data cache, or every page render
      // awaits the cache handler this Worker does not have (see the file
      // header). The memo below is what bounds the cost.
      cache: "no-store",
      signal: AbortSignal.timeout(FOUNDING_READ_TIMEOUT_MS),
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
 * Memoised per isolate (see file header) and invalidated on paid/refunded
 * transitions by revalidateFoundingStatus, so the banner reacts to real sales
 * without a cache binding. Fails open to "active" when the count is unknown,
 * which is the truthful state below the limit and the conservative one above:
 * it never turns the founding offer off on a network blip.
 */
let memo: { state: FoundingState; at: number } | null = null;
let inflight: Promise<FoundingState> | null = null;

async function readFoundingState(): Promise<FoundingState> {
  const count = await paidFoundingOrderCount();
  const state: FoundingState =
    count === null || count < FOUNDING_LIMIT ? "active" : "closed";
  memo = { state, at: Date.now() };
  return state;
}

export function getFoundingStatus(): Promise<FoundingState> {
  if (memo && Date.now() - memo.at < FOUNDING_STATE_TTL_MS) {
    return Promise.resolve(memo.state);
  }
  // Concurrent first renders on a cold isolate share one read.
  if (!inflight) inflight = readFoundingState().finally(() => (inflight = null));
  return inflight;
}

/**
 * Invalidate the memoised founding state after an order changes to a
 * state that moves the allocation (pending→paid consumes a slot; a
 * refund releases one). Called from src/lib/orders.ts.
 */
export function revalidateFoundingStatus(): void {
  memo = null;
  try {
    revalidatePath("/", "layout");
  } catch {
    // Outside a request context (scripts, tests) there is nothing rendered
    // to revalidate; dropping the memo is the part that matters.
  }
}
