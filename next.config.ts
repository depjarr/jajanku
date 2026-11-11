import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Semua halaman bergantung pada user yang login, jadi dirender per request.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
