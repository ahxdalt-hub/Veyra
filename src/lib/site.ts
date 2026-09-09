/**
 * Site-wide configuration.
 * Single source of truth for brand, nav, SEO defaults, and contact.
 */

export const site = {
  name: "Standard Practice",
  /** Canonical production origin — override with NEXT_PUBLIC_SITE_URL. */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://standardpractice.co",
  tagline: "Ready-to-use business systems for client work.",
  description:
    "Downloadable business systems — lead management, outreach, follow-up, and onboarding — built as Notion and Google Sheets workspaces you can put into action the same day.",
  positioning:
    "We build practical, ready-to-use systems for consultants, freelancers, and small studios who want a repeatable way to win and keep clients.",
  contact: {
    email: "hello@standardpractice.co",
  },
} as const;

export type NavItem = {
  label: string;
  href: string;
  description?: string;
};

/** Primary navigation — mirrored in header, mobile drawer, and footer. */
export const primaryNav: NavItem[] = [
  { label: "Shop", href: "/shop", description: "All systems, one place" },
  {
    label: "Categories",
    href: "/categories/client-acquisition",
    description: "Browse by workflow",
  },
  { label: "About", href: "/about", description: "Why we build these" },
  { label: "Resources", href: "/resources", description: "Free guides & audits" },
];

/** Footer link groups — kept intentionally small. */
export const footerNav = {
  shop: [
    { label: "All systems", href: "/shop" },
    { label: "Client Acquisition", href: "/categories/client-acquisition" },
    { label: "Sales Pipeline", href: "/categories/sales-pipeline" },
    { label: "Client Onboarding", href: "/categories/client-onboarding" },
  ] as NavItem[],
  resources: [
    { label: "Client Acquisition Audit", href: "/resources#audit" },
    { label: "All resources", href: "/resources" },
  ] as NavItem[],
  support: [
    { label: "Contact", href: "/contact" },
    { label: "FAQ", href: "/#faq" },
  ] as NavItem[],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Refund Policy", href: "/refund-policy" },
  ] as NavItem[],
} as const;

/** Format a price in USD, whole dollars (products are priced flat). */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
