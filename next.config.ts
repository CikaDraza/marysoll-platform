import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudinary.com",
      },
    ],
  },

  /**
   * Multi-tenant domain routing
   *
   * Domain matrix:
   * marysoll.com          → (marketing)
   * admin.marysoll.com    → (admin)
   * superadmin.marysoll.com → (superadmin)
   * app.marysoll.com      → (client) default
   * *.marysoll.com        → (client) tenant subdomain
   * custom-domain.com     → (client) tenant custom domain
   *
   * Detection and routing is handled in proxy.ts (middleware)
   * This config allows all domains to be served from one deployment.
   */

  // Headers for security and CORS
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.ALLOWED_ORIGINS || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-tenant-id",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: `https://marysoll.com/login`,
        permanent: false,
        has: [
          {
            type: "host",
            value: `superadmin.marysoll.com`,
          },
        ],
      },
      {
        source: "/login",
        destination: `https://marysoll.com/login`,
        permanent: false,
        has: [
          {
            type: "host",
            value: `admin.marysoll.com`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
