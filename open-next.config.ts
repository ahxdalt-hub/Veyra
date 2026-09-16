import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext Cloudflare adapter configuration.
 *
 * Defaults only: no incremental cache or tag cache binding is declared
 * because this Cloudflare account has no R2 bucket enabled yet. Server
 * rendering, static assets, middleware, and route handlers all work
 * without it — ISR/`revalidate` pages are simply re-rendered on demand
 * instead of being persisted. Add `incrementalCache: r2IncrementalCache`
 * here (plus an R2 binding in wrangler.jsonc) if that is ever needed.
 */
export default defineCloudflareConfig();