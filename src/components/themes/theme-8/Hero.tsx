"use client";

import Image from "next/image";
import { formatStatValue } from "@/lib/tenant/tenantStatsUtils";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { FadeUp } from "./FadeUp";
import { Deco } from "./Decorations";
import { useTheme8Modal } from "./theme8ModalContext";
import { Theme8AnchorLink } from "./AnchorLink";

interface Props {
  heroData: {
    headline?: string;
    subheadline?: string;
    image?: { src?: string; alt?: string };
    /** Theme-8 collage: [0] main lash photo, [1] founder polaroid. */
    images?: { src?: string; alt?: string }[];
  };
  cta: {
    primary: { text: string; href: string };
    secondary?: { text: string; href: string };
  };
  /** Salon name — used as the giant Y2K wordmark when no CMS headline is set. */
  salonName?: string;
  /** Salon city — folded into the hero photo alt text for local SEO. */
  salonCity?: string;
  /** Badge above the wordmark. Falls back to the default Y2K line. */
  eyebrow?: string;
  /** Per-span overrides for the stacked wordmark; empty fields fall back to parsing. */
  wordmark?: { prefix?: string; line1?: string; line2?: string; tail?: string };
  /** Marquee strip terms; falls back to the default lash menu. */
  marquee?: string[];
  /** Captions on the hero photo collage. */
  photoCaptions?: { primary?: string; founder?: string };
  tenantStats?: TenantStats;
  yearsOfExperience?: number;
  /** Opening year — when set, years of artistry auto-increments each year. */
  openingYear?: number;
}

/** Salon opened in 2023; "years of artistry" auto-increments one per year. */
const STUDIO_OPENED_YEAR = 2023;

const DEFAULT_DESCRIPTION =
  "Hand-built lashes for the main character. Half artist studio, half Y2K dream-room — book a set and leave looking like the moodboard.";

const CHROME =
  "bg-[linear-gradient(180deg,#ffffff_0%,#e9ebee_26%,#a9adb5_50%,#f6f8fa_64%,#bfc3ca_82%,#8f939b_100%)] bg-clip-text text-transparent";

/** Marquee items — alternating hot-pink / white. Shared by desktop + mobile strips. */
const MARQUEE_ITEMS: { t: string; hot?: boolean }[] = [
  { t: "★ CLASSIC", hot: true },
  { t: "HYBRID" },
  { t: "VOLUMEN", hot: true },
  { t: "LASH LIFT" },
  { t: "REFILL", hot: true },
  { t: "L VOLUMEN" },
  { t: "★ IT-GIRL APPROVED", hot: true },
];

/**
 * Render a salon/CMS name as the stacked Y2K wordmark:
 *   prefix  → small top line     (default "The")
 *   line 1  → chrome-gradient    (e.g. "LASH")
 *   line 2  → pink, ink-stroked  (e.g. "ROOM")
 *   tail    → Caveat purple      (e.g. "by Anja")
 *
 * `override` lets the CMS set any span explicitly; empty fields fall back to
 * parsing `text` (the headline or salon name).
 */
function Wordmark({
  text,
  override,
}: {
  text: string;
  override?: { prefix?: string; line1?: string; line2?: string; tail?: string };
}) {
  const words = text
    .replace(/^the\s+/i, "")
    .trim()
    .split(/\s+/);
  const byIdx = words.findIndex((w) => w.toLowerCase() === "by");
  const main = byIdx >= 0 ? words.slice(0, byIdx) : words;
  const parsedTail = byIdx >= 0 ? words.slice(byIdx).join(" ") : "";

  // Explicit CMS value wins; otherwise fall back to the parsed name.
  const prefix =
    override?.prefix !== undefined ? override.prefix.trim() : "The";
  const line1 = override?.line1?.trim() || main[0] || "Lash";
  const line2 = override?.line2?.trim() ?? main.slice(1).join(" ");
  const tail = override?.tail !== undefined ? override.tail.trim() : parsedTail;

  return (
    <h1 className="relative z-2 font-bagel leading-[0.82] tracking-[-0.01em] m-0">
      {prefix && (
        <span className="[-webkit-text-stroke:1px_pink] block font-bold rotate-[3deg] text-[clamp(16px,11vw,26px)] mb-[-1.2em]">
          {prefix}
        </span>
      )}
      <span
        className={`block text-[clamp(116px,11vw,168px)] rotate-[-2deg] drop-shadow-[3px_3px_0_#0b0b0f] ${CHROME}`}
      >
        {line1.toUpperCase()}
      </span>
      {line2 && (
        <span className="block text-[clamp(112px,11vw,168px)] text-y2k-pink [-webkit-text-stroke:4px_#0b0b0f] [text-shadow:5px_6px_0_rgba(11,11,15,0.25)] rotate-[1deg] ml-[0.12em]">
          {line2.toUpperCase()}
        </span>
      )}
      {tail && (
        <span className="block font-caveat font-bold text-[clamp(64px,7vw,92px)] text-y2k-purple rotate-[-3deg] -mt-1 ml-[0.3em] drop-shadow-[2px_3px_0_rgba(255,255,255,0.7)]">
          {tail}
        </span>
      )}
    </h1>
  );
}

export function Theme8Hero({
  heroData,
  cta,
  salonName,
  salonCity,
  eyebrow,
  wordmark: wordmarkOverride,
  marquee,
  photoCaptions,
  tenantStats,
  yearsOfExperience,
  openingYear,
}: Props) {
  const { open } = useTheme8Modal();
  // Two hero photos: [0] main lash close-up (falls back to legacy single image),
  // [1] founder polaroid. Each falls back to a baked-in default.
  const mainPhoto = heroData.images?.[0] ?? heroData.image;
  const founderPhoto = heroData.images?.[1];
  // Keyword-rich, localised fallback alt for the main hero photo (a real content
  // image), so it carries SEO value when the CMS alt field is left empty.
  const heroImageAlt =
    mainPhoto?.alt?.trim() ||
    `${salonName ?? "Lash Room by Anja"} — trepavice${
      salonCity ? ` u ${salonCity}` : ""
    } i online zakazivanje`;
  const founderAlt =
    founderPhoto?.alt?.trim() || `${salonName ?? "Anja"}, founder`;
  // Stats stay on flattering fallbacks until the salon has real traction —
  // more than 3 *completed* appointments AND more than 3 testimonials.
  const completedCount = tenantStats?.completedAppointmentCount ?? 0;
  const hasRealTraction =
    completedCount > 3 && (tenantStats?.reviewCount ?? 0) > 3;
  const setsCrafted = hasRealTraction
    ? formatStatValue(completedCount)
    : "1.2k+";
  // Rating: real testimonials average once there's traction, else a fallback.
  const rating =
    hasRealTraction && tenantStats?.averageRating != null
      ? `${tenantStats.averageRating.toFixed(1)}★`
      : "4.9★";
  // Opening year (auto-increments) wins; else manual value; else baked-in start.
  const years = openingYear
    ? `${Math.max(1, new Date().getFullYear() - openingYear)} yrs`
    : yearsOfExperience
      ? `${yearsOfExperience} yrs`
      : `${Math.max(1, new Date().getFullYear() - STUDIO_OPENED_YEAR)} yrs`;

  const wordmark =
    heroData.headline?.trim() || salonName || "Lash Room by Anja";

  // Marquee: CMS terms (hot-highlight alternating like the default) or fallback.
  // Blank lines are tolerated so the CMS textarea edits smoothly.
  const cleanMarquee = (marquee ?? []).map((t) => t.trim()).filter(Boolean);
  const marqueeItems: { t: string; hot?: boolean }[] =
    cleanMarquee.length > 0
      ? cleanMarquee.map((t, i) => ({ t, hot: i % 2 === 0 }))
      : MARQUEE_ITEMS;

  return (
    <section className="relative max-w-[1280px] mx-auto px-5 pt-10 pb-24 overflow-x-clip">
      {/* floating decorations */}
      <Deco
        shape="star"
        size={78}
        className="absolute z-10 left-[2%] top-[120px] rotate-[-12deg] drop-shadow-[3px_4px_0_rgba(11,11,15,0.5)]"
      />
      <Deco
        shape="sparkle"
        size={46}
        motionType="twinkle"
        className="absolute left-[46%] top-[38px] z-16"
      />
      <Deco
        shape="heart"
        size={58}
        fill="#ff2e97"
        motionType="bob"
        className="absolute right-[6%] bottom-[30px] rotate-[8deg] z-[5] drop-shadow-[3px_4px_0_rgba(11,11,15,0.5)]"
      />

      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-center">
        {/* LEFT : giant headline */}
        <FadeUp className="relative z-[6] overflow-visible">
          <Wordmark text={wordmark} override={wordmarkOverride} />
          <div className="relative overflow-visible mt-3 text-[15px] text-[#42303a] font-medium max-w-lg">
            <div
              aria-hidden="true"
              className="absolute overflow-visible scale-120 lg:scale-100  left-1/2 top-3/5 lg:top-4/6 w-full h-[250px] -translate-x-1/2 -translate-y-1/2 opacity-90 z-0 pointer-events-none"
            >
              <Image
                src="/images/theme-8/title-background-paint.png"
                alt=""
                aria-hidden="true"
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-cover overflow-visible lg:object-contain object-[50%_50%]"
              />
            </div>
            <div className="inline-flex items-center gap-2 bg-y2k-ink text-white font-extrabold text-[13px] tracking-[0.22em] uppercase px-4 py-2 rounded-full rotate-[-2deg] mt-4">
              <span className="h-2 w-2 rounded-full bg-y2k-pink" />
              {eyebrow?.trim() || "Cute? Always. Basic? Never."}
            </div>
            <p className="max-w-full relative z-1 text-[1.05rem] lg:text-[1rem] leading-[1.45] lg:leading-[1.35] font-semibold text-y2k-plum px-4 lg:px-8 py-3.5">
              {heroData.subheadline || DEFAULT_DESCRIPTION}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 mt-6 items-center">
            <button
              type="button"
              onClick={() => open("book")}
              className="inline-flex items-center gap-2.5 bg-y2k-pink text-white font-black text-[17px] tracking-[0.04em] uppercase px-7 py-4 border-[4px] border-y2k-ink rounded-[42px_34px_44px_32px/34px_44px_32px_44px] shadow-[7px_7px_0_#0b0b0f] rotate-[-2deg] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[10px_10px_0_#0b0b0f] transition-all duration-200 cursor-pointer"
            >
              {cta.primary.text || "Book your slot"}
              <Deco shape="sparkle" size={20} strokeWidth={0} />
            </button>
            <Theme8AnchorLink
              href={cta.secondary?.href || "#gallery"}
              className="inline-flex items-center gap-2 bg-white text-y2k-purple font-extrabold text-[16px] tracking-[0.03em] uppercase px-6 py-4 border-[4px] border-y2k-ink rounded-[36px_44px_32px_42px/44px_32px_44px_34px] shadow-[6px_6px_0_#8B16C9] rotate-[1.5deg] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0_#8B16C9] transition-all duration-200"
            >
              {cta.secondary?.text || "Pogledaj ponudu →"}
            </Theme8AnchorLink>
          </div>
        </FadeUp>

        {/* RIGHT : photo collage */}
        <FadeUp className="relative min-h-[520px] z-[4]">
          <Image
            src="/images/theme-8/sticker-name.png"
            alt={salonName ?? "The Lash Room by Anja"}
            width={360}
            height={200}
            className="absolute right-0 sm:right-[-2%] -top-6 w-[46%] min-w-[180px] z-[7] rotate-[6deg] drop-shadow-[4px_8px_10px_rgba(11,11,15,0.4)] h-auto"
          />
          {/* torn cutout */}
          <div className="absolute left-0 top-[60px] w-[74%] rotate-[-4deg] z-[5]">
            <div className="absolute -inset-2 bg-white [filter:url(#y2k-torn)] shadow-[0_22px_44px_rgba(20,0,30,0.4)]" />
            <div className="relative p-[9px] pb-[30px]">
              <div className="relative w-full h-[300px]">
                <Image
                  src={mainPhoto?.src || "/images/theme-8/bratz-eye.jpg"}
                  alt={heroImageAlt}
                  fill
                  sizes="(min-width: 1024px) 30vw, 70vw"
                  className="object-cover object-[50%_36%]"
                />
              </div>
              <span className="absolute left-3.5 bottom-1.5 font-caveat font-bold text-[24px] text-y2k-ink rotate-[-3deg]">
                {photoCaptions?.primary?.trim() || "that cat's eye effect ✶"}
              </span>
            </div>
            <div className="absolute -top-3.5 left-10 w-24 h-7 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,170,225,0.6))] shadow-[0_3px_7px_rgba(0,0,0,0.18)] rotate-[-7deg]" />
          </div>
          {/* founder polaroid */}
          <div className="absolute right-0 sm:right-[-1%] -bottom-1.5 w-[48%] min-w-[160px] rotate-[7deg] z-[6]">
            <div className="bg-white p-2.5 pb-10 border-2 border-y2k-ink shadow-[6px_10px_22px_rgba(11,11,15,0.3)]">
              <div className="relative w-full h-[200px]">
                <Image
                  src={
                    founderPhoto?.src || "/images/theme-8/anja-your-artist.jpg"
                  }
                  alt={founderAlt}
                  fill
                  sizes="(min-width: 1024px) 22vw, 50vw"
                  className="object-cover object-[50%_22%]"
                />
              </div>
              <span className="absolute left-0 right-0 bottom-2.5 text-center font-caveat font-bold text-[22px] text-y2k-ink">
                {photoCaptions?.founder?.trim() ||
                  `${salonName?.split(/\s+/).pop() ?? "Anja"}, your artist ♡`}
              </span>
            </div>
            <div className="absolute -top-3 right-7 w-20 h-6 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(200,170,255,0.6))] shadow-[0_3px_7px_rgba(0,0,0,0.18)] rotate-[9deg]" />
          </div>
        </FadeUp>
      </div>

      {/* marquee strip — single wrapping row; items wrap (never overflow) and
          each term stays intact. Sizing scales down on mobile. */}
      <FadeUp className="mt-12 sm:mt-14 bg-y2k-ink border-[3px] border-y2k-ink rounded-[28px] sm:rounded-full overflow-hidden rotate-[-1deg] shadow-[6px_8px_0_rgba(255,46,151,0.55)]">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 sm:gap-6 px-4 sm:px-6 py-3 sm:py-3.5 text-white font-bagel text-[16px] sm:text-[20px] tracking-[0.02em]">
          {marqueeItems.map((m) => (
            <span
              key={m.t}
              className={`whitespace-nowrap ${m.hot ? "text-y2k-hot" : ""}`}
            >
              {m.t}
            </span>
          ))}
        </div>
      </FadeUp>

      {/* stat trio */}
      <FadeUp className="mt-12 flex flex-wrap justify-center gap-5">
        <Stat value={rating} label="Client rating" tone="ink" />
        <Stat value={setsCrafted} label="Sets crafted" tone="pink" />
        <Stat value={years} label="Of artistry" tone="white" />
      </FadeUp>
    </section>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "ink" | "pink" | "white";
}) {
  const styles = {
    ink: "rotate-[-3deg] bg-y2k-ink text-white shadow-[6px_7px_0_rgba(255,46,151,0.6)]",
    pink: "rotate-[2deg] bg-y2k-pink text-white border-[4px] border-y2k-ink shadow-[6px_7px_0_#0b0b0f]",
    white:
      "rotate-[-2deg] bg-white text-y2k-ink border-[4px] border-y2k-ink shadow-[6px_7px_0_#8B16C9]",
  }[tone];
  const valueColor =
    tone === "ink" ? "text-y2k-hot" : tone === "white" ? "text-y2k-purple" : "";
  return (
    <div
      className={`rounded-3xl px-7 py-6 min-w-[180px] text-center ${styles}`}
    >
      <div className={`font-bagel text-5xl leading-none ${valueColor}`}>
        {value}
      </div>
      <div className="font-bold text-[13px] tracking-[0.14em] uppercase mt-1.5">
        {label}
      </div>
    </div>
  );
}
