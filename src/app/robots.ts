import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * robots — index everything except the private areas. /checkout is
 * excluded here as well as noindexed on the page itself (see
 * app/(site)/checkout/layout.tsx); it holds no search value.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/admin", "/api/", "/checkout"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
