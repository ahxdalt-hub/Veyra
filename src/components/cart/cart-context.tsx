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
import { products, type Product } from "@/lib/products";

/**
 * Cart — Phase 1 client-side cart.
 *
 * State lives in localStorage behind a tiny external store consumed via
 * useSyncExternalStore — React 19's recommended pattern for external
 * state. This hydrates without effect-setState cascades, and keeps
 * multiple tabs in sync for free.
 *
 * Phase 2 swaps the store's internals for Supabase-backed line items;
 * the public API (add/remove/count/total) stays identical.
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

type CartContextValue = {
  lines: CartLine[];
  count: number;
  total: number;
  detailedLines: { product: Product; qty: number }[];
  add: (slug: string) => void;
  remove: (slug: string) => void;
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
    // Digital products: one of each, qty is always 1.
    const current = read();
    if (!current.some((l) => l.slug === slug)) {
      write([...current, { slug, qty: 1 }]);
    }
    setIsOpen(true);
  }, []);

  const remove = useCallback((slug: string) => {
    write(read().filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => write(EMPTY), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const detailedLines = lines
      .map((line) => {
        const product = products.find((p) => p.slug === line.slug);
        return product ? { product, qty: line.qty } : null;
      })
      .filter((l): l is { product: Product; qty: number } => l !== null);

    return {
      lines,
      count: lines.length,
      total: detailedLines.reduce(
        (sum, l) => sum + l.product.price * l.qty,
        0
      ),
      detailedLines,
      add,
      remove,
      clear,
      isOpen,
      openCart,
      closeCart,
    };
  }, [lines, isOpen, add, remove, clear, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
