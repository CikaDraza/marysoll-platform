/**
 * Theme9Footer — forest podloga, četiri kolone, donji red sa copyrightom.
 */
import Link from "next/link";
import { AnchorLink } from "../shared/AnchorLink";

export interface Theme9FooterProps {
  salonName: string;
  tagline?: string;
  email?: string;
  instagramUrl?: string;
  tenantSlug?: string;
}

export function Theme9Footer({
  salonName,
  tagline,
  email,
  instagramUrl,
  tenantSlug,
}: Theme9FooterProps) {
  const base = tenantSlug ? `/${tenantSlug}` : "";
  const year = new Date().getFullYear();

  // Bez `/usluge` i `/termini`: to je salonski Service Booking tok, a ova tema
  // je education-first (vidi Theme9Header). Anchor linkovi su prefiksovani sa
  // `base` + `/` da rade i sa podstranica, ne samo sa početne.
  const columns: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: "Edukacija",
      links: [{ label: "Teme", href: `${base}/blogs` }],
    },
    {
      title: "O meni",
      links: [{ label: "Biografija", href: `${base}/#o-meni` }],
    },
    {
      title: "Kontakt",
      links: [
        ...(instagramUrl ? [{ label: "Instagram", href: instagramUrl }] : []),
        ...(email ? [{ label: email, href: `mailto:${email}` }] : []),
      ],
    },
  ];

  return (
    <footer className="bg-ee-accent text-ee-canvas">
      <div className="mx-auto max-w-[1240px] px-5 pt-12 pb-9 md:px-8 md:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-7 border-b border-[color-mix(in_oklab,#c6d5a8_18%,transparent)] pb-10 lg:gap-[54px]">
          <div className="flex flex-col gap-3">
            <span className="font-newsreader text-[24px]">{salonName}</span>
            {tagline && (
              <p className="max-w-[34ch] text-[13.5px] leading-relaxed text-[color-mix(in_oklab,#faf8f3_72%,transparent)]">
                {tagline}
              </p>
            )}
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-3">
              <span className="text-ee-accent-contrast text-[11px] tracking-[0.14em] uppercase">
                {col.title}
              </span>
              {col.links.map((l) =>
                l.href.startsWith("#") ? (
                  <AnchorLink
                    key={l.label}
                    href={l.href}
                    className="text-[13.5px] text-[color-mix(in_oklab,#faf8f3_78%,transparent)] hover:text-ee-accent-contrast"
                  >
                    {l.label}
                  </AnchorLink>
                ) : (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="text-[13.5px] text-[color-mix(in_oklab,#faf8f3_78%,transparent)] hover:text-ee-accent-contrast"
                  >
                    {l.label}
                  </Link>
                ),
              )}
            </nav>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 text-[12px] text-[color-mix(in_oklab,#faf8f3_52%,transparent)]">
          <span>
            © {year} {salonName} · Sva prava zadržana
          </span>
          <span>Marysoll platforma</span>
        </div>
      </div>
    </footer>
  );
}
