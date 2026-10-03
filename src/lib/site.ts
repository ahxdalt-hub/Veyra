/**
 * Site-wide configuration.
 * Single source of truth for brand, nav, SEO defaults, and contact.
 */

export const site = {
  name: "Veyra",
  /** Parent brand. */
  parent: "Caelmont",
  /** Canonical production origin — override with NEXT_PUBLIC_SITE_URL. */
  url: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://veyra.caelmont.in",
  /** Parent company origin (Caelmont) — override with NEXT_PUBLIC_PARENT_SITE_URL. */
  parentUrl:
    process.env.NEXT_PUBLIC_PARENT_SITE_URL?.replace(/\/$/, "") ?? "https://caelmont.in",
  tagline: "Practical business systems you can actually run.",
  description:
    "Veyra turns important business processes into structured systems for freelancers, consultants, service businesses, and small agencies — packaged so you can put them to work, not just read them.",
  positioning:
    "Veyra, a Caelmont brand, builds practical business systems for freelancers, consultants, service businesses, and small agencies — structured so the work actually gets run, not just documented.",
  contact: {
    email: "Caelmontholdings@gmail.com",
  },
} as const;

export type NavItem = {
  label: string;
  href: string;
  description?: string;
  /** Renders as a new-tab external link (e.g. the parent company site). */
  external?: boolean;
};

/** The Caelmont Partner Program, scoped to Veyra referrals. */
export const partnersUrl = `${site.parentUrl}/partners?product=veyra`;

/** Primary navigation — mirrored in header, mobile drawer, and footer. */
export const primaryNav: NavItem[] = [
  { label: "Products", href: "/shop", description: "The Veyra collection" },
  {
    label: "Client Growth System",
    href: "/products/client-growth-system",
    description: "Our flagship system — available now",
  },
  { label: "About", href: "/about", description: "Why we build systems" },
];

/** Footer link groups — kept intentionally small. */
export const footerNav = {
  products: [
    { label: "Client Growth System", href: "/products/client-growth-system" },
    { label: "All products", href: "/shop" },
  ] as NavItem[],
  company: [
    { label: "About Veyra", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Partners", href: partnersUrl, external: true },
  ] as NavItem[],
  support: [
    { label: "FAQ", href: "/#faq" },
    { label: "Resources", href: "/resources" },
    { label: "Growth Audit — free", href: "/products/growth-audit" },
  ] as NavItem[],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Refund Policy", href: "/refund-policy" },
  ] as NavItem[],
} as const;

/**
 * Approved refund policy — the single source of truth for the refund window.
 * Every surface that states a refund window (product pages, cart, checkout,
 * FAQs, offer page, contact, refund policy page) must resolve through these
 * constants so no contradictory period can drift in.
 */
export const REFUND_WINDOW_DAYS = 4;
export const REFUND_WINDOW_LABEL = `${REFUND_WINDOW_DAYS}-day refund window`;

/** Customer-facing pricing is USD across the entire storefront — product
 *  pages, cards, cart, checkout, and the server-side order amount all
 *  resolve through the catalog, never through client input. */
export const CURRENCY = "USD";

/** Format a price in USD, whole dollars (products are priced flat). */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Amount label for order surfaces: free claims read "Free", not "$0". */
export function formatOrderAmount(amountMinor: number): string {
  return amountMinor === 0 ? "Free" : formatPrice(amountMinor / 100);
}
