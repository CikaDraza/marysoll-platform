import Image from "next/image";
import type { AboutTextLink } from "@/types";
import { renderLinkedText } from "@/helpers/renderLinkedText";
import { FadeUp } from "./FadeUp";

interface Props {
  about: {
    headline?: string;
    paragraphs?: string[];
    links?: AboutTextLink[];
    image?: { src: string; alt: string };
  };
  founderName?: string;
}

const DEFAULT_HEADLINE = "A little pink sanctuary, built around you.";
const DEFAULT_PARAGRAPHS = [
  "The Lash Room is a calm, neon-lit space where every set is mapped to your eye shape, your features, and the way you want to feel walking out the door.",
  "Anja trained for years to perfect retention, comfort, and that effortless wake-up-ready look — so your lashes stay flawless long after you leave the chair.",
];
const CHECKLIST = [
  "Certified lash artist",
  "Premium, lash-safe products",
  "By appointment only",
];

/** Render a headline with its last word as a neon italic accent. */
function AccentHeadline({ headline }: { headline: string }) {
  const words = headline.trim().split(/\s+/);
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <span className="italic text-neon">{last}</span>
    </>
  );
}

export function Theme7AboutUs({ about, founderName }: Props) {
  const headline = about.headline || DEFAULT_HEADLINE;
  const paragraphs =
    about.paragraphs && about.paragraphs.filter(Boolean).length > 0
      ? about.paragraphs
      : DEFAULT_PARAGRAPHS;
  const imgSrc = about.image?.src || "/images/theme-7/anja-owner.png";
  const imgAlt = about.image?.alt || `${founderName ?? "Anja"}, founder`;

  return (
    <section id="about" className="relative bg-paper">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 pt-28 lg:pt-44 pb-24 lg:pb-32">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <FadeUp className="lg:col-span-5 relative">
            <div className="relative rounded-[24px] overflow-hidden aspect-[4/5] ring-1 ring-black/5 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.4)]">
              <Image
                src={imgSrc}
                alt={imgAlt}
                width={640}
                height={800}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="absolute -bottom-6 -right-4 lg:-right-8 bg-ink text-cream rounded-2xl px-6 py-4 shadow-xl">
              <div className="font-cormorant text-2xl leading-none">
                {founderName ?? "Anja"}
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-neonsoft mt-1.5">
                Founder &amp; lash artist
              </div>
            </div>
          </FadeUp>

          <FadeUp className="lg:col-span-7" delay={0.1}>
            <p className="flex items-center gap-3 text-[12px] uppercase tracking-[0.3em] text-neon mb-6">
              <span className="h-px w-10 bg-neon" /> About the studio
            </p>
            <h2 className="font-cormorant text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-[-0.01em] text-balance">
              <AccentHeadline headline={headline} />
            </h2>
            <div className="mt-8 grid sm:grid-cols-2 gap-7 text-ink/70 text-[17px] leading-relaxed max-w-2xl">
              {paragraphs.slice(0, 2).map((p, i) => (
                <p key={i}>{renderLinkedText(p, about.links)}</p>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4 text-[13px] uppercase tracking-[0.16em] text-ink/60">
              {CHECKLIST.map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="text-neon">✓</span> {item}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
