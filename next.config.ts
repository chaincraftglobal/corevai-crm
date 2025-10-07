import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@sparticuz/chromium",
      "puppeteer-core",
    ],
  },
  outputFileTracingIncludes: {
    "/api/virtual-tracker/**": [
      "node_modules/@sparticuz/chromium/**",
    ],
  },
};

export default nextConfig;
