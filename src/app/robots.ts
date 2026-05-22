import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/superadmin/",
        "/admin/",
        "/dashboard/",
        "/api/",
        "/login/",
        "/register/",
        "/auth/",
        "/forgot-password/",
        "/reset-password/",
        "/verify-email/",
        "/resend-verification/",
      ],
    },
    sitemap: "https://marysoll.com/sitemap.xml",
  };
}
