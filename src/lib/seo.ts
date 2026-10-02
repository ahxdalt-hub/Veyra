import { site } from "@/lib/site";

/**
 * SEO constants and structured-data helpers.
 *
 * Single source of truth for the entity @ids shared across the JSON-LD
 * graph, the brand logo URL used by Organization markup, and the
 * breadcrumb builder. Nothing here renders UI.
 */

/**
 * Stable JSON-LD node identifiers. Giving the Organization and WebSite
 * nodes explicit @ids lets WebSite reference the same Organization node
 * the site layout publishes, instead of repeating an anonymous copy.
 */
export const ORGANIZATION_ID = `${site.url}/#organization`;
export const WEBSITE_ID = `${site.url}/#website`;

/**
 * Brand logo asset. Veyra's mark is typographic, not a bitmap file, so
 * this points at the PNG generated from the design system at /logo.png
 * (see src/app/logo.png/route.ts) — a crawlable, raster image that
 * satisfies structured-data requirements.
 */
export const LOGO_URL = `${site.url}/logo.png`;

export type BreadcrumbItem = { label: string; href?: string };

/**
 * Absolute URL for an internal href, matching the canonical form
 * (the root carries no trailing slash, exactly like `site.url`).
 */
export function absoluteUrl(href: string): string {
  return href === "/" ? site.url : `${site.url}${href}`;
}

/**
 * BreadcrumbList JSON-LD built from an ordered crumb trail. The final
 * crumb is the current page and may omit `href` — schema.org allows the
 * trailing item to carry no URL, which is how the breadcrumb trails on
 * this site are rendered.
 */
export function breadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}
