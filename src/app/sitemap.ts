import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { site } from "@/lib/site";

/**
 * Sitemap — static pages plus every product page (including coming-soon
 * announcements). URLs derive from the catalog, so a future data-backed
 * catalog flows through automatically.
 *
 * `lastModified` is intentionally omitted: the app has no genuine
 * per-route modification date, and stamping every URL with a build-time
 * `new Date()` marks the whole site as freshly changed on each deploy — a
 * signal search engines learn to distrust. Add a real per-route date here
 * only when one actually exists.
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${site.url}`, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/shop`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site.url}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${site.url}/resources`, changeFrequency: "monthly", priority: 0.7 },
    // /audit is intentionally absent: it's a members' area now — the tool
    // renders only for accounts that claimed the free product. The claim
    // entry (/products/growth-audit) is in the sitemap via the catalog.
    { url: `${site.url}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${site.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/cookie-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${site.url}/refund-policy`, changeFrequency: "yearly", priority: 0.2 },
    
    /* SEO keyword cluster pages */
    { url: `${site.url}/seo/client-growth-system`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site.url}/seo/freelance-client-acquisition`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/seo/agency-client-retention-system`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${site.url}/seo/freelance-project-management`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${site.url}/seo/agency-scaling-system`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${site.url}/seo/service-business-framing`, changeFrequency: "weekly", priority: 0.7 },
  ];

  const productRoutes: MetadataRoute.Sitemap = getProducts().map((p) => ({
    url: `${site.url}/products/${p.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
