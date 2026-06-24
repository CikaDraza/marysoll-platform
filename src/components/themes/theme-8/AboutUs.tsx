import Image from "next/image";
import type { AboutTextLink } from "@/types";
import { renderLinkedText } from "@/helpers/renderLinkedText";
import { FadeUp } from "./FadeUp";
import { Deco } from "./Decorations";

interface Props {
  about: {
    headline?: string;
    paragraphs?: string[];
    links?: AboutTextLink[];
    image?: { src: string; alt: string };
  };
  founderName?: string;
}

const DEFAULT_HEADLINE = "Girl-boss energy, doll-eye results.";
const DEFAULT_PARAGRAPHS = [
  "The Lash Room is Anja's pink corner of the world — part artist studio, part Y2K fever dream. Every set is mapped to your eyes, your features, and the energy you walk in with.",
];
const CHECKLIST = [
  "Certified lash artist",
  "Lash-safe products",
  "By appointment only",
];

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

export function Theme8AboutUs({ about, founderName }: Props) {
  const headline = about.headline || DEFAULT_HEADLINE;
  const paragraphs =
    about.paragraphs && about.paragraphs.filter(Boolean).length > 0
      ? about.paragraphs
      : DEFAULT_PARAGRAPHS;
  const imgSrc = about.image?.src || "/images/theme-8/studio.png";
  const imgAlt = about.image?.alt || `${founderName ?? "The Lash Room"} studio`;

  return (
    <section id="about" className="relative max-w-[1120px] mx-auto my-24 px-5">
      <Deco
        shape="heart"
        size={54}
        fill="#8B16C9"
        motionType="wiggle"
        className="absolute right-[4%] -top-8 z-[5]"
      />
      <FadeUp>
        <div className="relative rotate-[-1.5deg]">
          <div className="absolute -inset-2.5 bg-y2k-paper [filter:url(#y2k-torn2)] shadow-[0_26px_60px_rgba(20,0,30,0.42)]" />
          <div className="relative grid md:grid-cols-[0.8fr_1.2fr] gap-9 items-center p-10">
            {/* portrait */}
            <div className="relative rotate-[2deg]">
              <div className="bg-white p-2.5 pb-3.5 border-2 border-y2k-ink shadow-[5px_9px_18px_rgba(11,11,15,0.28)]">
                <div className="relative w-full h-[300px]">
                  <Image
                    src={imgSrc}
                    alt={imgAlt}
                    fill
                    sizes="(min-width: 768px) 35vw, 90vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="absolute z-10 -bottom-4 -right-3.5 bg-y2k-pink text-white font-bagel text-[18px] px-4 py-2.5 border-[3px] border-y2k-ink rounded-[18px] shadow-[4px_4px_0_#0b0b0f] rotate-[-5deg]">
                the pink room ♡
              </div>
              {/* taped "Anja" polaroid — bottom-left, tilted the opposite way
                  from the hero one, kept inside the About container width */}
              <div className="absolute -bottom-11 left-[-12%] w-[44%] min-w-[140px] rotate-[-5deg] z-[3]">
                <div className="relative bg-white p-2 pb-9 border-2 border-y2k-ink shadow-[6px_10px_22px_rgba(11,11,15,0.3)]">
                  <div className="relative w-full h-[125px]">
                    <Image
                      src="/images/theme-8/anja-kiss.jpg"
                      alt={`${founderName?.split(/\s+/).pop() ?? "Anja"}, your artist`}
                      fill
                      sizes="(min-width: 768px) 18vw, 45vw"
                      className="object-cover object-[50%_33%]"
                    />
                  </div>
                  <span className="absolute left-0 right-0 bottom-2 text-center font-caveat font-bold text-[19px] text-y2k-ink">
                    {founderName?.split(/\s+/).pop() ?? "Anja"}, your artist ♡
                  </span>
                </div>
                {/* sellotape */}
                <div className="absolute -top-2.5 right-7 w-[70px] h-6 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,170,225,0.6))] shadow-[0_3px_7px_rgba(0,0,0,0.18)] rotate-[8deg] pointer-events-none" />
              </div>
            </div>
            {/* copy */}
            <div>
              <span className="inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink mb-2.5">
                About the studio
              </span>
              <h2 className="m-0 mb-4 font-bagel text-[clamp(36px,5.4vw,64px)] leading-[0.92] text-y2k-ink">
                <AccentHeadline headline={headline} />
              </h2>
              <div className="space-y-3.5 max-w-[520px] text-[17px] leading-[1.6] font-medium text-[#241019]">
                {paragraphs.slice(0, 2).map((p, i) => (
                  <p key={i} className="m-0">
                    {renderLinkedText(p, about.links)}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5 mt-5">
                {CHECKLIST.map((item, i) => (
                  <span
                    key={item}
                    className={`bg-white border-[3px] border-y2k-ink rounded-full px-4 py-2.5 font-bold text-[14px] whitespace-nowrap shadow-[3px_3px_0_#0b0b0f] ${
                      i % 2 === 1 ? "rotate-[1.5deg]" : "rotate-[-1deg]"
                    }`}
                  >
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
