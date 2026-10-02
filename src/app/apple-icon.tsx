import { ImageResponse } from "next/og";
import { brandMonogram } from "@/lib/seo/brand-mark";

/**
 * Apple touch icon — the Veyra monogram on the paper background (iOS does
 * not honour transparency, so the mark is opaque). Next injects the
 * <link rel="apple-touch-icon" /> tag automatically.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(brandMonogram(size.width), { ...size });
}
