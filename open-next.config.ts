import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";

/**
 * OpenNext Cloudflare adapter configuration.
 *
 * `incrementalCache` is NOT optional on this deployment. Without a cache
 * binding the server bundle falls back to a dummy store that throws
 * (`"Dummy" cache does not cache anything`), so every route Next bakes as
 * static — `/`, `/shop`, `/account/sign-in`, all 44 of them — has no entry to
 * read and its render never resolves: the request hangs with zero bytes, and
 * the pages that survived were only the `force-dynamic` ones. That is the same
 * failure this file's predecessor documented for `unstable_cache` in
 * src/lib/founding.ts.
 *
 * The namespace is `NEXT_INC_CACHE_KV` (the binding name the override reads).
 * `opennextjs-cloudflare deploy` writes the build's prerendered entries into
 * it as part of the deploy, so nothing else needs to populate it. KV rather
 * than R2 only because this account has not enabled R2 (API 10042) — switch
 * `kvIncrementalCache` for `r2IncrementalCache`, rebind, and redeploy if R2 is
 * ever turned on; the cache format is identical.
 *
 * `tagCache` is left at its default ("dummy"): `revalidatePath` stays a no-op,
 * which is how every caller here already behaves. Add a D1 tag cache only if
 * the app starts using tag-based revalidation.
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
});
