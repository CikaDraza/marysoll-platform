/**
 * app/tenant/page.tsx — Salon landing page.
 *
 * Served internally at /tenant when the proxy rewrites:
 *   - kiki-kiss.marysoll.com/     → /tenant
 *   - kikikiss.rs/                → /tenant
 *   - localhost:3006/kiki-kiss/   → /tenant  (dev)
 *
 * Tenant is resolved exclusively from x-tenant-slug header (proxy-injected).
 */
import { headers } from "next/headers";
import { ClientHomePage } from "@/components/client/ClientHomePage";

export default async function TenantHomePage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";

  return <ClientHomePage tenantSlug={tenantSlug} />;
}
