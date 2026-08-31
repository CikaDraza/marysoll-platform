import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { TenantPageShell } from "@/components/themes/TenantPageShell";
import { EducationArticleView } from "@/components/tenant/EducationArticleView";
import { EducationGateView } from "@/components/tenant/EducationGateView";
import { fetchPublicSalonProfile } from "@/lib/tenant/fetchTenantData";
import { educationAuthorFromSalon } from "@/lib/education/presentation";
import {
  getPublicEducationContent,
  resolvePublicEducationRoute,
} from "@/lib/education/publicContent";
import { educationArticleMetadata } from "@/lib/education/seo";
import { getPublicSiteContext } from "@/lib/seo/public-site";

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
  const [article, headerStore] = await Promise.all([
    loadArticle(params),
    headers(),
  ]);
  if (!article) return { title: "Edukacija" };

  const tenantSlug = headerStore.get("x-tenant-slug") ?? "";
  return educationArticleMetadata({
    profile: await fetchPublicSalonProfile(tenantSlug),
    context: getPublicSiteContext({
      domainType: headerStore.get("x-domain-type") ?? "marketing",
      tenantSlug,
      tenantCustomDomain: headerStore.get("x-tenant-custom-domain") ?? "",
      publicHost: headerStore.get("x-public-host") ?? "",
    }),
    article,
  });
}

export default async function TenantEducationArticlePage({ params }: Props) {
  const [{ slug }, headerStore] = await Promise.all([params, headers()]);
  const tenantId = headerStore.get("x-tenant-id");
  const basePath = headerStore.get("x-tenant-base-path") ?? "";

  const route = await resolvePublicEducationRoute(tenantId, slug.at(-1) ?? "");

  // Stara javna adresa preživljava promenu slug-a: podeljen link i indeksirana
  // strana nastavljaju da rade umesto da postanu 404.
  if (route.kind === "redirect") {
    permanentRedirect(`${basePath}/edukacija/${route.slug}`);
  }

  // Nepostojeće, neobjavljeno i neJavno se ponašaju isto: 404, bez signala
  // da zapis možda postoji.
  if (route.kind !== "article") notFound();

  const tenantSlug = headerStore.get("x-tenant-slug") ?? "";
  const salon = await fetchPublicSalonProfile(tenantSlug);
  const author = educationAuthorFromSalon(salon);

  // Zaključan sadržaj: telo je već na serveru odsečeno, pa deli isto zaglavlje
  // i dobija gate umesto članka. Kontakt kanali dolaze iz javnog profila.
  if (route.article.accessMode === "gated") {
    return (
      <TenantPageShell tenantSlug={tenantSlug}>
        <EducationGateView
          article={route.article}
          basePath={basePath}
          author={author}
          contact={{
            instagram: salon?.social?.instagram || undefined,
            whatsapp: salon?.social?.whatsapp || undefined,
            phone: salon?.phone || undefined,
            email: salon?.email || undefined,
          }}
        />
      </TenantPageShell>
    );
  }

  return (
    <TenantPageShell tenantSlug={tenantSlug}>
      <EducationArticleView
        article={route.article}
        basePath={basePath}
        author={author}
      />
    </TenantPageShell>
  );
}
