import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Web app manifest — name, colours, and the brand icon, so the storefront
 * presents correctly when saved to a home screen. Colours mirror the
 * design tokens; the icon is the /logo.png brand route.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.tagline}`,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    background_color: "#fbfaf8",
    theme_color: "#fbfaf8",
    icons: [{ src: "/logo.png", sizes: "512x512", type: "image/png" }],
  };
}
