/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
  outputFileTracingIncludes: {
    '/app/api/virtual-tracker/**': ['node_modules/@sparticuz/chromium/**'],
  },
};

export default nextConfig;
