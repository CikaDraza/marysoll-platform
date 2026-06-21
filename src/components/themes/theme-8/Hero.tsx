"use client";

import Image from "next/image";
import { formatStatValue } from "@/lib/tenant/tenantStatsUtils";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { FadeUp } from "./FadeUp";
import { Deco } from "./Decorations";
import { useTheme8Modal } from "./Theme8ModalProvider";
import Link from "next/link";

interface Props {
  heroData: {
    headline?: string;
    subheadline?: string;
    image?: { src?: string; alt?: string };
  };
  cta: {
    primary: { text: string; href: string };
    secondary?: { text: string; href: string };
  };
  /** Salon name — used as the giant Y2K wordmark when no CMS headline is set. */
  salonName?: string;
  tenantStats?: TenantStats;
  yearsOfExperience?: number;
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
 *   line 1  → chrome-gradient   (e.g. "LASH")
 *   line 2  → pink, ink-stroked (e.g. "ROOM")
 *   tail    → Caveat purple     (e.g. "by Anja")
 */
function Wordmark({ text }: { text: string }) {
  const words = text
    .replace(/^the\s+/i, "")
    .trim()
    .split(/\s+/);
  const byIdx = words.findIndex((w) => w.toLowerCase() === "by");
  const main = byIdx >= 0 ? words.slice(0, byIdx) : words;
  const tail = byIdx >= 0 ? words.slice(byIdx).join(" ") : "";
  const line1 = main[0] ?? "Lash";
  const line2 = main.slice(1).join(" ");

  return (
    <h1 className="relative z-2 font-bagel leading-[0.82] tracking-[-0.01em] m-0">
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
  tenantStats,
  yearsOfExperience,
}: Props) {
  const { open } = useTheme8Modal();
  // Stats stay on flattering fallbacks until the salon has real traction.
  const appointmentCount = tenantStats?.appointmentCount ?? 0;
  const hasRealTraction =
    appointmentCount > 3 && (tenantStats?.reviewCount ?? 0) > 3;
  const setsCrafted = hasRealTraction
    ? formatStatValue(appointmentCount)
    : "1.2k+";
  const years = yearsOfExperience
    ? `${yearsOfExperience} yrs`
    : `${Math.max(1, new Date().getFullYear() - STUDIO_OPENED_YEAR)} yrs`;

  const wordmark =
    heroData.headline?.trim() || salonName || "Lash Room by Anja";

  return (
    <section className="relative max-w-[1280px] mx-auto px-5 pt-10 pb-24">
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
        <FadeUp className="relative z-[6]">
          <div className="inline-flex items-center gap-2 bg-y2k-ink text-white font-extrabold text-[12px] tracking-[0.22em] uppercase px-4 py-2 rounded-full rotate-[-2deg] mb-4">
            <span className="h-2 w-2 rounded-full bg-y2k-pink" />
            Lash artistry &amp; it-girl energy
          </div>
          <Wordmark text={wordmark} />
          <div className="relative mt-3 text-[15px] text-[#42303a] font-medium max-w-lg">
            <Image
              src="/images/theme-8/paint-streak.png"
              alt=""
              aria-hidden="true"
              width={500}
              height={500}
              className="absolute left-1/2 top-[48%] w-[560px] max-w-[99%] lg:max-w-[104%] h-[380px] lg:h-auto -translate-x-1/2 -translate-y-1/2 scale-150 opacity-90 z-0 pointer-events-none"
            />
            <p className="max-w-[430px] relative z-1 mt-5 text-[18px] leading-[1.55] font-medium text-y2k-plum px-[18px] py-3.5 rounded-[14px]">
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
            <Link
              href={cta.secondary?.href || "#gallery"}
              className="inline-flex items-center gap-2 bg-white text-y2k-purple font-extrabold text-[16px] tracking-[0.03em] uppercase px-6 py-4 border-[4px] border-y2k-ink rounded-[36px_44px_32px_42px/44px_32px_44px_34px] shadow-[6px_6px_0_#8B16C9] rotate-[1.5deg] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0_#8B16C9] transition-all duration-200"
            >
              {cta.secondary?.text || "See the lashes →"}
            </Link>
          </div>
        </FadeUp>

        {/* RIGHT : photo collage */}
        <FadeUp className="relative min-h-[520px] z-[4]">
          <Image
            src="/images/theme-8/sticker-name.png"
            alt={salonName ?? "The Lash Room by Anja"}
            width={360}
            height={200}
            className="absolute right-[-2%] -top-6 w-[46%] min-w-[180px] z-[7] rotate-[6deg] drop-shadow-[4px_8px_10px_rgba(11,11,15,0.4)] h-auto"
          />
          {/* torn cutout */}
          <div className="absolute left-0 top-[60px] w-[74%] rotate-[-4deg] z-[5]">
            <div className="absolute -inset-2 bg-white [filter:url(#y2k-torn)] shadow-[0_22px_44px_rgba(20,0,30,0.4)]" />
            <div className="relative p-[9px] pb-[30px]">
              <Image
                src={heroData.image?.src || "/images/theme-8/bratz-eye.jpg"}
                alt={heroData.image?.alt || "Bratz-inspired lash close up"}
                width={520}
                height={300}
                className="block w-full h-[300px] object-cover object-[50%_36%]"
              />
              <span className="absolute left-3.5 bottom-1.5 font-caveat font-bold text-[24px] text-y2k-ink rotate-[-3deg]">
                that doll-eye effect ✶
              </span>
            </div>
            <div className="absolute -top-3.5 left-10 w-24 h-7 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,170,225,0.6))] shadow-[0_3px_7px_rgba(0,0,0,0.18)] rotate-[-7deg]" />
          </div>
          {/* founder polaroid */}
          <div className="absolute right-[-1%] -bottom-1.5 w-[48%] min-w-[160px] rotate-[7deg] z-[6]">
            <div className="bg-white p-2.5 pb-10 border-2 border-y2k-ink shadow-[6px_10px_22px_rgba(11,11,15,0.3)]">
              <Image
                src="/images/theme-8/anja-owner.png"
                alt={`${salonName ?? "Anja"}, founder`}
                width={320}
                height={200}
                className="block w-full h-[200px] object-cover object-[50%_22%]"
              />
              <span className="absolute left-0 right-0 bottom-2.5 text-center font-caveat font-bold text-[22px] text-y2k-ink">
                {salonName?.split(/\s+/).pop() ?? "Anja"}, your artist ♡
              </span>
            </div>
            <div className="absolute -top-3 right-7 w-20 h-6 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(200,170,255,0.6))] shadow-[0_3px_7px_rgba(0,0,0,0.18)] rotate-[9deg]" />
          </div>
        </FadeUp>
      </div>

      {/* marquee strip — desktop: single wrapping row */}
      <FadeUp className="mt-14 hidden sm:block bg-y2k-ink border-[3px] border-y2k-ink rounded-full overflow-hidden rotate-[-1deg] shadow-[6px_8px_0_rgba(255,46,151,0.55)]">
        <div className="flex flex-wrap items-center justify-center gap-6 px-6 py-3.5 text-white font-bagel text-[20px] tracking-[0.02em] whitespace-nowrap">
          {MARQUEE_ITEMS.map((m) => (
            <span key={m.t} className={m.hot ? "text-y2k-hot" : undefined}>
              {m.t}
            </span>
          ))}
        </div>
      </FadeUp>

      {/* marquee strip — mobile: two-by-two grid */}
      <FadeUp className="mt-12 sm:hidden bg-y2k-ink border-[3px] border-y2k-ink rounded-[34px] overflow-hidden rotate-[-1deg] shadow-[6px_8px_0_rgba(255,46,151,0.55)]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-6 py-4 text-white font-bagel text-[18px] tracking-[0.02em] text-center">
          {MARQUEE_ITEMS.map((m, idx) => (
            <span
              key={m.t}
              className={`${m.hot ? "text-y2k-hot" : ""} ${
                idx === MARQUEE_ITEMS.length - 1 ? "col-span-2" : ""
              }`}
            >
              {m.t}
            </span>
          ))}
        </div>
      </FadeUp>

      {/* stat trio */}
      <FadeUp className="mt-12 flex flex-wrap justify-center gap-5">
        <Stat value="4.9★" label="Client rating" tone="ink" />
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
