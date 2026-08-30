import Link from "next/link";
import { EDUCATION_KIND_LABELS } from "@/lib/education/content-document";
import type { PublicEducationArticle } from "@/lib/education/publicContent";

interface Props {
  article: PublicEducationArticle;
  basePath: string;
  contact: { instagram?: string; whatsapp?: string; phone?: string; email?: string };
}

/**
 * Zaključan sadržaj: postojanje je javno, telo nije.
 *
 * Ovde NIKADA ne sme da se pojavi ijedan blok — `article.blocks` je za `gated`
 * prazno već na serveru, pa zaključan tekst ne napušta bazu.
 *
 * Poruka namerno ne pominje pretplatu ni kupovinu: ti sistemi još ne postoje,
 * pa bismo obećali nešto što ne možemo da ispunimo.
 */
export function EducationGateView({ article, basePath, contact }: Props) {
  const channels = [
    contact.instagram && { label: "Instagram", href: contact.instagram },
    contact.whatsapp && {
      label: "WhatsApp",
      href: `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`,
    },
    contact.phone && { label: "Pozovite", href: `tel:${contact.phone}` },
    contact.email && { label: "Pošaljite e-mail", href: `mailto:${contact.email}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
        {EDUCATION_KIND_LABELS[article.kind] ?? "Edukacija"}
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
        {article.title}
      </h1>
      {article.description && (
        <p className="mt-4 text-lg leading-relaxed text-gray-600">
          {article.description}
        </p>
      )}

      <section className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Ovaj sadržaj je dostupan uz odobrenje.
        </h2>
        <p className="mt-2 text-gray-600">
          Javite mi se ako želite pristup — dogovorićemo se.
        </p>

        {channels.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {channels.map((channel) => (
              <a
                key={channel.label}
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
              >
                {channel.label}
              </a>
            ))}
          </div>
        )}
      </section>

      <Link
        href={`${basePath}/edukacija`}
        className="mt-8 inline-block text-sm font-semibold text-gray-500 underline-offset-4 hover:underline"
      >
        ← Sva edukacija
      </Link>
    </article>
  );
}
