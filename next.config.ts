import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The organiser backoffice and admin run on their own subdomains (lib/hosts.ts); in development they are *.localhost.
  allowedDevOrigins: ["*.localhost"],
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
