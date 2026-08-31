import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlockList } from "@/components/content-composer/BlockList";
import ClientPanelChrome from "@/components/client/ClientPanelChrome";
import { ContentImage } from "@/components/content-composer/blocks/ContentImage";
import { verifyToken } from "@/lib/auth/auth-server";
import { EDUCATION_KIND_LABELS } from "@/lib/education/content-document";
import { readAssignedEducationContent } from "@/lib/education/entitlement";
import { formatPublishedDate } from "@/lib/education/presentation";

/** Lični prostor se nikada ne indeksira. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Zaštićeni čitač — jedina strana koja prikazuje telo zaključanog i privatnog
 * sadržaja.
 *
 * Javna ruta `/edukacija/{slug}` ovo nikada ne radi, ni za prijavljenu
 * klijentkinju: javna strana ostaje bezlična i keširana, a personalizacija
 * živi ovde. Zato ovde nema `slug`-a nego `id` — ova adresa nije za deljenje.
 */
export default async function AssignedEducationContentPage({ params }: Props) {
  const [{ id }, cookieStore, headerStore] = await Promise.all([
    params,
    cookies(),
    headers(),
  ]);

  // Klijentska sesija stoji u `tenant-access-token` — isti kolačić koji čita i
  // `requireTenantAdmin` na serveru. Ime `token` postoji samo u localStorage-u.
  const token =
    cookieStore.get("tenant-access-token")?.value ??
    cookieStore.get("platform-access-token")?.value;
  const actor = token ? verifyToken(token) : null;
  const basePath = headerStore.get("x-tenant-base-path") ?? "";

  if (!actor?.tenantId || !actor.tenantUserId) notFound();

  const article = await readAssignedEducationContent(
    actor.tenantId,
    actor.tenantUserId,
    id,
  );

  // Nepostojeće, tuđe, nedodeljeno i povučeno izgledaju isto — bez orakla.
  if (!article) notFound();

  return (
    <ClientPanelChrome activeTab="Moj Prostor">
      <div className="mx-auto w-full max-w-[860px]">
        <Link
          href={`${basePath}/panel?tab=${encodeURIComponent("Moj Prostor")}`}
          className="text-sm font-medium text-violet-600 hover:underline"
      >
          ← Moji sadržaji
      </Link>

        <header className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
            {EDUCATION_KIND_LABELS[article.kind] ?? "Edukacija"}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-gray-900">
            {article.title}
          </h1>
          <time
            dateTime={article.publishedAt}
            className="mt-3 block text-sm text-gray-500"
          >
            {formatPublishedDate(article.publishedAt)}
          </time>
      </header>

        {article.cover && (
          <figure className="mt-8">
            <ContentImage
              src={article.cover.src}
              alt={article.title}
              focalPoint={article.cover.focalPoint}
              className="aspect-[16/9] w-full rounded-3xl object-cover"
            />
          </figure>
      )}

        <article className="edu-prose mt-10 space-y-10">
          <BlockList blocks={article.blocks} headingScope="section" />
      </article>
      </div>
    </ClientPanelChrome>
  );
}
