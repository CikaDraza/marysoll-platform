/**
 * app/tenant/cookie-policy — Cookie policy page.
 * Tenant resolved exclusively from x-tenant-slug header (proxy-injected).
 */
import { headers } from "next/headers";
import type { Metadata } from "next";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";
import CookiePolicyClient from "./CookiePolicyClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const profile = await fetchPublicSalonProfile(tenantSlug);
  return {
    title: `Politika kolačića — ${profile?.name ?? "Salon"}`,
  };
}

export default async function CookiePolicyPage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";

  const profile = await fetchPublicSalonProfile(tenantSlug);
  const salonName = profile?.name ?? "Salon";
  const contactEmail = profile?.contactEmail ?? profile?.email ?? "";

  return (
    <CookiePolicyClient
      salonName={salonName}
      contactEmail={contactEmail}
      tenantSlug={tenantSlug}
    />
  );
}
