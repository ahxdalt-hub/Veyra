import { ImageResponse } from "next/og";
import { brandWordmark } from "@/lib/seo/brand-mark";

/**
 * /logo.png — the Veyra brand mark as a crawlable PNG.
 *
 * Structured data (Organization.logo) and the web manifest need a stable
 * image URL rather than a hashed metadata route, so the mark is served
 * from this fixed path. Rendered at build time from the design tokens.
 */

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(brandWordmark(512), {
    width: 512,
    height: 512,
  });
}
