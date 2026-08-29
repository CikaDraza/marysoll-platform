import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TenantPageShell } from "@/components/themes/TenantPageShell";
import { EducationListView } from "@/components/tenant/EducationListView";
import {
  hasPublicEducationSurface,
  listPublicEducationContent,
} from "@/lib/education/publicContent";

export const metadata: Metadata = {
  title: "Edukacija",
  description: "Stručni tekstovi, saveti i materijali.",
};

export default async function TenantEducationPage() {
  const headerStore = await headers();
  const tenantId = headerStore.get("x-tenant-id");
  const tenantSlug = headerStore.get("x-tenant-slug") ?? "";
  const basePath = headerStore.get("x-tenant-base-path") ?? "";

  // Tenant bez razrešene edukacije nema ovu površinu — ne prazna strana, nego
  // je nema.
  if (!tenantId || !(await hasPublicEducationSurface(tenantId))) notFound();

  const items = await listPublicEducationContent(tenantId);

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
      <EducationListView items={items} basePath={basePath} />
    </TenantPageShell>
  );
}
