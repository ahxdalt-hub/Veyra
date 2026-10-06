"use client";

import { createContext, useContext } from "react";

/**
 * The founding allocation, published to the client tree by the (site) layout.
 *
 * Price displays must show the SAME ladder /api/checkout charges, and the
 * ladder is decided by a real paid-order count that only the server can read.
 * Rather than drill a boolean through every page that renders a card, drawer
 * or upsell, the layout resolves it once and hands it down.
 *
 * Consumers use useFoundingActive(). The default is `true` so a component
 * rendered outside the provider (tests, isolated previews) behaves as it did
 * before the allocation existed.
 */
const FoundingActiveContext = createContext(true);

export function FoundingActiveProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return (
    <FoundingActiveContext.Provider value={value}>
      {children}
    </FoundingActiveContext.Provider>
  );
}

export function useFoundingActive(): boolean {
  return useContext(FoundingActiveContext);
}
