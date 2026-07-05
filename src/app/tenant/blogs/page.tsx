// src/app/tenant/blogs/page.tsx
import BlogsPageClient from "@/components/tenant/BlogsPageClient";
import { TenantPageShell } from "@/components/themes/TenantPageShell";
import { Theme8BlogList } from "@/components/themes/theme-8";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Novosti i Artikli",
    description: "Pročitajte naše najnovije vesti, savete i stručne članke.",
  };
}

export default async function BlogsPage() {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug") ?? "";
  const profile = await fetchPublicSalonProfile(tenantSlug);

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
      <Suspense>
        {profile?.landingTheme === "theme-8" ? (
          <Theme8BlogList />
        ) : (
          <BlogsPageClient />
        )}
      </Suspense>
    </TenantPageShell>
  );
}
