import type { MetadataRoute } from "next";
import { platformUrl } from "@/lib/platform/host-context";

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
    sitemap: platformUrl("/sitemap.xml"),
  };
}
