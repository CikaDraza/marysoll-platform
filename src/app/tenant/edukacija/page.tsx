import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TenantPageShell } from "@/components/themes/TenantPageShell";
import { EducationListView } from "@/components/tenant/EducationListView";
import {
  hasPublicEducationSurface,
  listPublicEducationContent,
} from "@/lib/education/publicContent";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";
import { educationAuthorFromSalon } from "@/lib/education/presentation";
import { resolveEducationTaxonomyForTenant } from "@/lib/education/taxonomy-server";
import {
  getPublicSiteContext,
  tenantPageMetadata,
} from "@/lib/seo/public-site";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const tenantSlug = headerStore.get("x-tenant-slug") ?? "";
  const profile = await fetchPublicSalonProfile(tenantSlug);

  return tenantPageMetadata(
    profile,
    getPublicSiteContext({
      domainType: headerStore.get("x-domain-type") ?? "marketing",
      tenantSlug,
      tenantCustomDomain: headerStore.get("x-tenant-custom-domain") ?? "",
      publicHost: headerStore.get("x-public-host") ?? "",
    }),
    "/edukacija",
    profile?.name ? `Edukacija · ${profile.name}` : "Edukacija",
    profile?.shortDescription || "Stručni tekstovi, vodiči i materijali.",
  );
}

export default async function TenantEducationPage() {
  const headerStore = await headers();
  const tenantId = headerStore.get("x-tenant-id");
  const tenantSlug = headerStore.get("x-tenant-slug") ?? "";
  const basePath = headerStore.get("x-tenant-base-path") ?? "";

  // Tenant bez razrešene edukacije nema ovu površinu — ne prazna strana, nego
  // je nema.
  if (!tenantId || !(await hasPublicEducationSurface(tenantId))) notFound();

  const [items, salon, taxonomy] = await Promise.all([
    listPublicEducationContent(tenantId),
    fetchPublicSalonProfile(tenantSlug),
    resolveEducationTaxonomyForTenant(tenantId),
  ]);

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
      <EducationListView
        items={items}
        basePath={basePath}
        author={educationAuthorFromSalon(salon)}
        intro={salon?.shortDescription}
        taxonomy={taxonomy}
      />
    </TenantPageShell>
  );
}
