"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { resolvePurchasableProduct, type Product } from "@/lib/products";

/**
 * Cart — client-side cart backed by localStorage.
 *
 * State lives in localStorage behind a tiny external store consumed via
 * useSyncExternalStore — React 19's recommended pattern for external
 * state. This hydrates without effect-setState cascades, and keeps
 * multiple tabs in sync for free.
 *
 * Only products the catalog marks purchasable can enter the cart; the
 * checkout API independently re-validates every line server-side, so a
 * stale or tampered cart line can never become an order.
 */

export type CartLine = {
  slug: string;
  qty: number;
};

const STORAGE_KEY = "sp-cart-v1";
const EMPTY: CartLine[] = [];

/* ------------------------------------------------------------------ */
/* External store                                                      */
/* ------------------------------------------------------------------ */

let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (cache !== null) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return (cache = EMPTY);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return (cache = EMPTY);
    cache = parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as CartLine).slug === "string" &&
        typeof (l as CartLine).qty === "number"
    );
    return cache;
  } catch {
    return (cache = EMPTY);
  }
}

function write(next: CartLine[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — in-memory only */
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  // Keep tabs in sync.
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        cache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      window.removeEventListener("storage", onStorage);
      listeners.delete(listener);
    };
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

type DetailedLine = {
  product: Product & { price: number };
  qty: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  total: number;
  detailedLines: DetailedLine[];
  add: (slug: string) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  // SSR renders the empty cart; hydration upgrades to real state.
  const lines = useSyncExternalStore(
    subscribe,
    read,
    () => EMPTY
  );
  const [isOpen, setIsOpen] = useState(false);

  const add = useCallback((slug: string) => {
    // Digital products: one of each, qty is always 1. Only catalog-marked
    // purchasable products may enter the cart — coming-soon products are
    // rejected here as well as at checkout.
    if (!resolvePurchasableProduct(slug)) return;
    const current = read();
    if (!current.some((l) => l.slug === slug)) {
      write([...current, { slug, qty: 1 }]);
    }
    setIsOpen(true);
  }, []);

  const remove = useCallback((slug: string) => {
    write(read().filter((l) => l.slug !== slug));
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    const next = Math.min(Math.max(Math.floor(qty) || 1, 1), 5);
    write(
      read().map((l) => (l.slug === slug ? { ...l, qty: next } : l))
    );
  }, []);

  const clear = useCallback(() => write(EMPTY), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    // Resolve each line through the catalog's purchasable-product gate.
    // Stale or unavailable slugs (e.g. a product that went coming-soon
    // after being added) silently drop out of the display and the total.
    const detailedLines = lines
      .map((line) => {
        const product = resolvePurchasableProduct(line.slug);
        return product ? { product, qty: line.qty } : null;
      })
      .filter((l): l is DetailedLine => l !== null);

    return {
      lines,
      // Count only lines that resolve to a current catalog product, so the
      // badge can never disagree with what the drawer and checkout show.
      count: detailedLines.length,
      total: detailedLines.reduce(
        (sum, l) => sum + l.product.price * l.qty,
        0
      ),
      detailedLines,
      add,
      remove,
      setQty,
      clear,
      isOpen,
      openCart,
      closeCart,
    };
  }, [lines, isOpen, add, remove, setQty, clear, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
