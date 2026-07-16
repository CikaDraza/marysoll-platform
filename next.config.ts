import type { NextConfig } from "next";

// Bazni domen (env-driven, isto kao proxy/constants.ts). Na staging-u je
// staging.marysoll.com → redirecti ispod prate deployment umesto hardkodovanog prod-a.
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "marysoll.com";

const nextConfig: NextConfig = {
  // Workspace paketi (engine-i) se isporučuju kao TS source — Next ih transpiluje
  transpilePackages: [
    "@panta/diagnostic-engine",
    "@panta/loyalty-engine",
    "@panta/event-bus",
  ],

  images: {
    // Next 16: dozvoljeni quality nivoi moraju biti u ovoj listi (default [75]).
    // 50/60 koristimo za teški theme-8 wallpaper (progresivni load, blur → pun).
    qualities: [50, 60, 75],
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
        // Global CORS za sve API rute OSIM /api/auth/whoami — ta ruta sama echo-uje
        // tačan (same-site marketing) origin uz Allow-Credentials, jer se poziva
        // cross-origin sa credentials:"include" (globalni "*" + credentials je
        // nevalidna kombinacija koju browser odbija). Negativni lookahead izuzima
        // whoami; sve ostale /api rute zadržavaju postojeće ponašanje.
        source: "/api/:path((?!auth/whoami).*)",
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
        destination: `https://${BASE_DOMAIN}/login`,
        permanent: false,
        has: [
          {
            type: "host",
            value: `superadmin.${BASE_DOMAIN}`,
          },
        ],
      },
      {
        source: "/login",
        destination: `https://${BASE_DOMAIN}/login`,
        permanent: false,
        has: [
          {
            type: "host",
            value: `admin.${BASE_DOMAIN}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
