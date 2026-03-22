/**
 * Root page — multi-tenant domain router
 *
 * The middleware (proxy.ts) injects x-domain-type header.
 * This page reads it and renders the correct segment:
 *
 * marysoll.com              → MarketingPage
 * admin.marysoll.com        → AdminApp (redirects to /dashboard)
 * superadmin.marysoll.com   → SuperAdminApp (redirects to /superadmin/dashboard)
 * *.marysoll.com / custom   → ClientPage (tenant salon landing)
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MarketingHomePage } from "@/components/marketing/MarketingHomePage";
import { ClientHomePage } from "@/components/client/ClientHomePage";
import { MarketingHomePageSecond } from "@/components/marketing/MarketingHomePageSecond";

export default async function RootPage() {
  const headersList = await headers();
  const domainType = headersList.get("x-domain-type") ?? "marketing";

  switch (domainType) {
    case "admin":
      redirect("/dashboard");

    case "superadmin":
      redirect("/superadmin/dashboard");

    case "client": {
      const tenantSlug = headersList.get("x-tenant-slug") ?? "";
      return <ClientHomePage tenantSlug={tenantSlug} />;
    }

    case "marketing":
    default:
      return (
        <>
          <MarketingHomePageSecond />
          <MarketingHomePage />
        </>
      );
  }
}
