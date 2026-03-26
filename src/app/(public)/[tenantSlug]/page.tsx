/**
 * (public)/[tenantSlug] — Salon landing page.
 *
 * Handles two routing modes:
 *   - Path-based:    marysoll.com/kiki-makeup
 *   - Custom domain: kikikiss.beauty  (middleware sets x-tenant-slug header)
 *   - Subdomain:     kiki-makeup.marysoll.com (middleware sets x-tenant-slug)
 *
 * The middleware already filters out reserved paths (dashboard, login, api…)
 * before they reach this page, so no RESERVED guard needed here.
 */
import { headers } from "next/headers";
import { ClientHomePage } from "@/components/client/ClientHomePage";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantSlugPage({ params }: Props) {
  const { tenantSlug } = await params;

  const headersList = await headers();
  // Middleware injects x-tenant-slug — on custom domains this is the DB slug,
  // on path-based it matches tenantSlug from params.
  const slugFromHeader = headersList.get("x-tenant-slug") || tenantSlug;

  return <ClientHomePage tenantSlug={slugFromHeader} />;
}
