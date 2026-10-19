import type { NextConfig } from "next";

// Старые адреса сайта (dashboard.html и т.д.) ведут на новые страницы
const OLD_PAGES = ["dashboard", "lessons", "proverbs", "balama", "rating", "profile", "login"];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      ...OLD_PAGES.map((page) => ({ source: `/${page}.html`, destination: `/${page}`, permanent: true })),
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/lesson-detail.html", destination: "/lessons", permanent: true },
    ];
  },
};

export default nextConfig;
