import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // KYC documents are uploaded through a Server Action; the API accepts files up to 10 MB.
    serverActions: { bodySizeLimit: "11mb" },
    // Several root layouts (app/[lang], organizer, admin) need one 404 for unmatched URLs: app/global-not-found.tsx.
    globalNotFound: true,
  },
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
