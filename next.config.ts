import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-server HMR from the LAN/loopback origin used in testing.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

// Makes `next dev` behave like the Cloudflare Workers runtime locally
// (bindings/context available in server code). No-op in production builds.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
