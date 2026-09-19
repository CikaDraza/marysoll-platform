/**
 * Theme10Footer — `#kontakt`. Kontakt i mreže dolaze iz profila salona (CMS
 * hero `socialLinks` ima prednost, isto kao ostale teme). Prazna polja se ne
 * prikazuju — nema placeholder telefona ni mejla.
 */
import type { Theme10ShellData } from "./nativeData";
import type { Theme10NavItem } from "./Header";
import { EASE, FOCUS_RING, SECTION_X, THEME10_ANCHORS } from "./constants";
import { LightLogo } from "./LightLogo";

const LINK = `text-[14.5px] font-light text-[#cfcdc8] hover:text-ash-gold ${EASE} ${FOCUS_RING}`;
const HEADING = "mb-1.5 text-[11px] uppercase tracking-[0.26em] text-ash-gold";

const SOCIAL_LABELS: [keyof Theme10ShellData["footer"]["social"], string][] = [
  ["instagram", "Instagram"],
  ["telegram", "Telegram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["whatsapp", "WhatsApp"],
];

interface Props {
  footer: Theme10ShellData["footer"];
  nav: Theme10NavItem[];
  privacyHref: string;
}

export function Theme10Footer({ footer, nav, privacyHref }: Props) {
  const socials = SOCIAL_LABELS.filter(([key]) => footer.social[key]);
  const year = new Date().getFullYear();

  return (
    <footer
      id={THEME10_ANCHORS.contact}
      className={`bg-ash-night pt-[clamp(48px,5vw,84px)] pb-7 text-[#cfcdc8] ${SECTION_X}`}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[clamp(28px,3.4vw,56px)]">
        <div className="flex flex-col items-start">
          <LightLogo
            salonName={footer.salonName}
            logo={footer.logo}
            className="h-[72px]"
            textClassName="text-[28px]"
          />
          <span className="mt-[22px] text-[11px] uppercase leading-[2] tracking-[0.26em] text-[#8d8b86]">
            {footer.tagline || "Lepota u detaljima"}
          </span>
        </div>

        {nav.length > 0 && (
          <nav aria-label="Brzi linkovi" className="flex flex-col gap-3">
            <span className={HEADING}>Brzi linkovi</span>
            {nav.map((item) => (
              <a key={item.href} href={item.href} className={LINK}>
                {item.label}
              </a>
            ))}
          </nav>
        )}

        {(footer.address || footer.phone || footer.email) && (
          <div className="flex flex-col gap-3">
            <span className={HEADING}>Kontakt</span>
            {footer.address && (
              <span className="text-[14.5px] font-light">{footer.address}</span>
            )}
            {footer.phone && (
              <a href={`tel:${footer.phone.replace(/\s+/g, "")}`} className={LINK}>
                {footer.phone}
              </a>
            )}
            {footer.email && (
              <a href={`mailto:${footer.email}`} className={`${LINK} break-all`}>
                {footer.email}
              </a>
            )}
          </div>
        )}

        {socials.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className={HEADING}>Pratite nas</span>
            {socials.map(([key, label]) => (
              <a
                key={key}
                href={footer.social[key]}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                {label}
              </a>
            ))}
          </div>
        )}

        <p className="border-l border-ash-paper-2/15 pl-6 font-cormorant text-xl leading-normal text-[#a9a7a2] italic">
          Negovani nokti.
          <br />
          Samopouzdanje
          <br />
          svakog dana.
        </p>
      </div>

      <div className="mt-[clamp(32px,4vw,64px)] flex flex-wrap justify-between gap-4 border-t border-ash-paper-2/12 pt-[22px] text-[12px] text-[#77756f]">
        <span>
          © {year} {footer.salonName}. Sva prava zadržana.
        </span>
        <a href={privacyHref} className={`hover:text-ash-gold ${EASE} ${FOCUS_RING}`}>
          Politika privatnosti
        </a>
      </div>
    </footer>
  );
}
