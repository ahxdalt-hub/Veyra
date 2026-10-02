/**
 * Delivery platforms — the shared vocabulary between the download UI,
 * the delivery API, and the product registry (0021).
 *
 * Client-safe (no server imports): the account pages import this for
 * labels and detection, the download route imports it for validation.
 */

export const DELIVERY_PLATFORMS = ["windows", "macos"] as const;

export type DeliveryPlatform = (typeof DELIVERY_PLATFORMS)[number];

export function isDeliveryPlatform(value: unknown): value is DeliveryPlatform {
  return (
    typeof value === "string" &&
    (DELIVERY_PLATFORMS as readonly string[]).includes(value)
  );
}

/** Customer-facing button labels ("Download for Mac", not "for macOS" —
 *  Apple's own download buttons say "Mac"). */
export const PLATFORM_LABEL: Record<DeliveryPlatform, string> = {
  windows: "Windows",
  macos: "Mac",
};

/** Spec-sheet style name used in prose copy and the registry. */
export const PLATFORM_NAME: Record<DeliveryPlatform, string> = {
  windows: "Windows",
  macos: "macOS",
};

/**
 * Best-effort visitor platform detection from a user-agent string —
 * used to decide which download is the PRIMARY action in the UI.
 * It never gates anything: authorization is the session + entitlement +
 * registry check in /api/download, and the customer can always pick the
 * other platform manually.
 */
export function detectPlatform(userAgent: string): DeliveryPlatform | null {
  if (/Macintosh|Mac OS X|CPU.*Mac/i.test(userAgent)) return "macos";
  if (/Windows/i.test(userAgent)) return "windows";
  return null;
}
