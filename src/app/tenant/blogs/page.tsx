// src/app/tenant/blogs/page.tsx
import BlogsPageClient from "@/components/tenant/BlogsPageClient";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Novosti i Artikli",
    description: "Pročitajte naše najnovije vesti, savete i stručne članke.",
  };
}

export default function BlogsPage() {
  return (
    <Suspense>
      <BlogsPageClient />
    </Suspense>
  );
}
