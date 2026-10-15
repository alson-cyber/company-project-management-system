import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Playwright opens the dev server on localhost. Next blocks that host unless it is listed.
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  experimental: {
    // The proxy's default 10 MB cap would reject a legal upload before the attachment
    // policy (ATTACHMENT_MAX_BYTES, default 25 MB) can respond. The policy remains the limit.
    proxyClientMaxBodySize: "30mb",
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Every page is per-user and permission-checked, so pages render at request time.
  // Cache Components / partial prefetching are intentionally off (docs/ARCHITECTURE-PLAN.md §9).
  cacheComponents: false,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
