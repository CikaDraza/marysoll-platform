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
                <Image
                  src={imgSrc}
                  alt={imgAlt}
                  width={520}
                  height={300}
                  className="block w-full h-[300px] object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-3.5 bg-y2k-pink text-white font-bagel text-[18px] px-4 py-2.5 border-[3px] border-y2k-ink rounded-[18px] shadow-[4px_4px_0_#0b0b0f] rotate-[-5deg]">
                the pink room ♡
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
