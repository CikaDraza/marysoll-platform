import type { PublicEducationArticle } from "@/lib/education/publicContent";
import type { EducationAuthor } from "@/lib/education/presentation";
import { EducationArticleView } from "./EducationArticleView";

interface Props {
  article: PublicEducationArticle;
  basePath: string;
  author: EducationAuthor | null;
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
export function EducationGateView({ article, basePath, author, contact }: Props) {
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
    <EducationArticleView article={article} basePath={basePath} author={author}>
      <section
        aria-label="Pristup sadržaju"
        className="border-ee-border bg-ee-surface mt-12 rounded-[28px] border p-7 sm:p-9"
      >
        <h2 className="font-newsreader text-ee-accent text-[clamp(22px,2.6vw,30px)] leading-tight">
          Ovaj sadržaj je dostupan uz odobrenje.
        </h2>
        <p className="font-instrument-sans text-ee-text-muted mt-3 max-w-[46ch] text-[16px] leading-[1.7]">
          Javite mi se ako želite pristup — dogovorićemo se.
        </p>

        {channels.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {channels.map((channel) => (
              <a
                key={channel.label}
                href={channel.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-ee-accent text-ee-canvas font-instrument-sans rounded-full px-5 py-2.5 text-[14px] font-semibold transition hover:opacity-90"
              >
                {channel.label}
              </a>
            ))}
          </div>
        )}
      </section>
    </EducationArticleView>
  );
}
