import Image from "next/image";
import type { HeroImage } from "@/types";
import { FadeUp } from "./FadeUp";
import { Deco } from "./Decorations";
import { Theme8AnchorLink } from "./AnchorLink";

interface Cta {
  text: string;
  href: string;
}

interface Props {
  perks: {
    pill?: string;
    eyebrow?: string;
    headline?: string;
    paragraphs?: string[];
    images?: HeroImage[];
    ctas?: {
      primary?: Cta;
      secondary?: Cta;
    };
  };
}

// Theme-8 je Anjin Y2K Lash theme — baked-in default sadržaj se prikazuje dok
// vlasnica ne unese svoj u Landing CMS-u (isti obrazac kao Theme8AboutUs).
const DEFAULT_PILL = "tvoj mali benefit ♡";
const DEFAULT_EYEBROW = "extra ljubav za tebe";
const DEFAULT_HEADLINE = "Sitnice koje čine razliku";
const DEFAULT_PARAGRAPHS = [
  "Nisu u pitanju samo trepavice, već i mali detalji koji celo iskustvo čine lepšim. ✨",
  "Zato je u salonu dostupna i Loyalty kartica, namenjena devojkama koje su mi duže od godinu dana ukazivale poverenje i postale deo moje male zajednice. Kao znak zahvalnosti na vernosti, na svakom petom terminu ostvaruju 50% popusta. 🌸",
  "Svaka devojka koja prvi put radi nadogradnju (ili želi mali podsetnik) dobija i Aftercare karticu sa svim savetima za pravilno održavanje ekstenzija. 💌",
  "A ako želiš da nekome pokloniš osećaj lepote i samopouzdanja, tu su i poklon vaučeri – savršen poklon za rođendan, praznike ili bilo koju posebnu priliku. 🎁🥰",
];
const DEFAULT_IMAGE = "/images/theme-8/byAnja.jpg";

/** Render a headline with its last word as a purple accent. */
function AccentHeadline({ headline }: { headline: string }) {
  const words = headline.trim().split(/\s+/);
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <span className="text-y2k-purple">{last}</span>
    </>
  );
}

function hasCta(cta?: Cta): cta is Cta {
  return Boolean(cta && cta.text.trim() && cta.href.trim());
}

export function Theme8Perks({ perks }: Props) {
  const pill = perks.pill?.trim() || DEFAULT_PILL;
  const eyebrow = perks.eyebrow?.trim() || DEFAULT_EYEBROW;
  const headline = perks.headline?.trim() || DEFAULT_HEADLINE;
  const paragraphs =
    perks.paragraphs && perks.paragraphs.filter(Boolean).length > 0
      ? perks.paragraphs.filter(Boolean)
      : DEFAULT_PARAGRAPHS;

  const images =
    perks.images && perks.images.filter((i) => i?.src).length > 0
      ? perks.images.filter((i) => i?.src)
      : [{ src: DEFAULT_IMAGE, alt: headline }];

  const primary = perks.ctas?.primary;
  const secondary = perks.ctas?.secondary;

  return (
    <section id="perks" className="relative max-w-[1120px] mx-auto my-24 px-5">
      {/* dekori — srce (SVG sticker) + poklončići (emoji) */}
      <Deco
        shape="heart"
        size={50}
        fill="#ff2e97"
        motionType="wiggle"
        className="absolute left-[3%] -top-7 z-[5]"
      />
      <span className="absolute right-[5%] -top-8 text-[40px] rotate-[12deg] z-[5] select-none pointer-events-none">
        🎁
      </span>

      <FadeUp>
        <div className="relative rotate-[1.2deg]">
          <div className="absolute -inset-2.5 bg-y2k-paper [filter:url(#y2k-torn)] shadow-[0_26px_60px_rgba(20,0,30,0.42)]" />
          {/* Desktop: slika levo (1/3), tekst desno (2/3). Mobilni: stack. */}
          <div className="relative grid md:grid-cols-[1fr_2fr] gap-8 md:gap-10 items-center p-8 sm:p-10">
            {/* slika (kolona 1/3) — glavna + eventualne dodatne kao polaroidi */}
            <div className="relative flex flex-col items-center gap-4">
              <div className="relative bg-white p-2.5 pb-4 border-2 border-y2k-ink shadow-[5px_9px_18px_rgba(11,11,15,0.28)] rotate-[-2deg] w-full max-w-[300px]">
                <div className="relative w-full h-[280px] sm:h-[320px]">
                  <Image
                    src={images[0].src}
                    alt={images[0].alt || headline}
                    fill
                    sizes="(min-width: 768px) 28vw, 80vw"
                    className="object-cover"
                  />
                </div>
                <div className="absolute z-10 -bottom-4 -right-3 bg-y2k-pink text-white font-bagel text-[16px] px-4 py-2 border-[3px] border-y2k-ink rounded-[18px] shadow-[4px_4px_0_#0b0b0f] rotate-[-5deg] whitespace-nowrap">
                  {pill}
                </div>
              </div>
              {images.length > 1 && (
                <div className="flex flex-wrap justify-center gap-3 pt-1">
                  {images.slice(1).map((img, i) => (
                    <div
                      key={i}
                      className={`relative bg-white p-2 pb-3 border-2 border-y2k-ink shadow-[4px_7px_14px_rgba(11,11,15,0.26)] w-[120px] sm:w-[140px] ${
                        i % 2 === 0 ? "rotate-[3deg]" : "rotate-[-3deg]"
                      }`}
                    >
                      <div className="relative w-full h-[120px] sm:h-[140px]">
                        <Image
                          src={img.src}
                          alt={img.alt || headline}
                          fill
                          sizes="(min-width: 768px) 12vw, 40vw"
                          className="object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* tekst (kolona 2/3) */}
            <div>
              {/* eyebrow + naslov */}
              <span className="inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink mb-2.5">
                {eyebrow}
              </span>
              <h2 className="m-0 mb-4 font-bagel text-[clamp(32px,5vw,58px)] leading-[0.92] text-y2k-ink">
                <AccentHeadline headline={headline} />
              </h2>

              {/* 4 paragrafa — mali razmak */}
              <div className="space-y-2.5 max-w-[560px] text-[16px] leading-[1.5] font-medium text-[#241019]">
                {paragraphs.map((p, i) => (
                  <p key={i} className="m-0">
                    {p}
                  </p>
                ))}
              </div>

              {/* CTA — prikazuju se samo ako imaju i tekst i URL */}
              {(hasCta(primary) || hasCta(secondary)) && (
                <div className="flex flex-wrap gap-4 mt-6">
                  {hasCta(primary) && (
                  <Theme8AnchorLink
                    href={primary.href}
                    className="inline-flex items-center gap-2.5 bg-y2k-pink text-white font-black text-[16px] tracking-[0.04em] uppercase px-7 py-3.5 border-[4px] border-y2k-ink rounded-[42px_34px_44px_32px/34px_44px_32px_44px] shadow-[6px_6px_0_#0b0b0f] rotate-[-2deg] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0_#0b0b0f] transition-all duration-200"
                  >
                    {primary.text}
                    <Deco shape="sparkle" size={18} strokeWidth={0} />
                  </Theme8AnchorLink>
                )}
                {hasCta(secondary) && (
                  <Theme8AnchorLink
                    href={secondary.href}
                    className="inline-flex items-center gap-2 bg-white text-y2k-purple font-extrabold text-[15px] tracking-[0.03em] uppercase px-6 py-3.5 border-[4px] border-y2k-ink rounded-[36px_44px_32px_42px/44px_32px_44px_34px] shadow-[5px_5px_0_#8B16C9] rotate-[1.5deg] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#8B16C9] transition-all duration-200"
                  >
                    {secondary.text}
                  </Theme8AnchorLink>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
