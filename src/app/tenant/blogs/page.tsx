// src/app/tenant/blogs/page.tsx
import BlogsPageClient from "@/components/tenant/BlogsPageClient";
import { TenantPageShell } from "@/components/themes/TenantPageShell";
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

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
      <Suspense>
        <BlogsPageClient />
      </Suspense>
    </TenantPageShell>
  );
}
