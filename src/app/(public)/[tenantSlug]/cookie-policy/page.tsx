/**
 * /[tenantSlug]/cookie-policy — Cookie policy page.
 * Server Component — fetches salon profile to replace hardcoded info.
 */
import { headers } from "next/headers";
import type { Metadata } from "next";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";
import CookiePolicyClient from "./CookiePolicyClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tenantSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug } = await params;
  const profile = await fetchPublicSalonProfile(tenantSlug);
  return {
    title: `Politika kolačića — ${profile?.name ?? "Salon"}`,
  };
}

export default async function CookiePolicyPage({ params }: Props) {
  const { tenantSlug } = await params;
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug") || tenantSlug;

  const profile = await fetchPublicSalonProfile(slug);
  const salonName = profile?.name ?? "Salon";
  const contactEmail = profile?.contactEmail ?? profile?.email ?? "";

  return <CookiePolicyClient salonName={salonName} contactEmail={contactEmail} tenantSlug={slug} />;
}
