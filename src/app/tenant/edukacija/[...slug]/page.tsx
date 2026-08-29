import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TenantPageShell } from "@/components/themes/TenantPageShell";
import { EducationArticleView } from "@/components/tenant/EducationArticleView";
import { getPublicEducationContent } from "@/lib/education/publicContent";

interface Props {
  params: Promise<{ slug: string[] }>;
}

/** Poslednji segment je slug objavljene verzije. */
async function loadArticle(params: Props["params"]) {
  const { slug } = await params;
  const tenantId = (await headers()).get("x-tenant-id");
  if (!tenantId) return null;

  return getPublicEducationContent(tenantId, slug.at(-1) ?? "");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await loadArticle(params);
  if (!article) return { title: "Edukacija" };

  return {
    title: article.seo?.title || article.title,
    description: article.seo?.description || article.description,
    openGraph: {
      title: article.seo?.title || article.title,
      description: article.seo?.description || article.description,
      images: article.seo?.ogImage ? [article.seo.ogImage] : [],
    },
  };
}

export default async function TenantEducationArticlePage({ params }: Props) {
  const [article, headerStore] = await Promise.all([
    loadArticle(params),
    headers(),
  ]);

  // Nepostojeće, neobjavljeno i neJavno se ponašaju isto: 404, bez signala
  // da zapis možda postoji.
  if (!article) notFound();

  return (
    <TenantPageShell tenantSlug={headerStore.get("x-tenant-slug") ?? ""}>
      <EducationArticleView article={article} />
    </TenantPageShell>
  );
}
