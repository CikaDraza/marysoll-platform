import Image from "next/image";
import { FadeUp } from "./FadeUp";

interface Testimonial {
  _id: string;
  clientName: string;
  rating: number;
  comment: string;
  adminReply?: string;
}

interface Props {
  testimonials?: Testimonial[];
  headline?: string;
}

type Card = {
  quote: string;
  name: string;
  meta: string;
  initial: string;
  rating: number;
};

const DEFAULT_CARDS: Card[] = [
  {
    quote: "I get stopped on the street. Anja is a literal artist.",
    name: "Mila K.",
    meta: "Volume Set",
    initial: "M",
    rating: 5,
  },
  {
    quote: "A little pink sanctuary. I leave looking incredible every time.",
    name: "Sara D.",
    meta: "Hybrid Set",
    initial: "S",
    rating: 5,
  },
  {
    quote: "Six months a client & never going anywhere else. Flawless.",
    name: "Lena P.",
    meta: "Lash Lift",
    initial: "L",
    rating: 5,
  },
];

const CARD_STYLES = [
  "rounded-[8px_22px_8px_22px] shadow-[6px_8px_0_#ff2e97] rotate-[-2deg]",
  "rounded-[22px_8px_22px_8px] shadow-[6px_8px_0_#8B16C9] rotate-[1.5deg]",
  "rounded-[8px_22px_8px_22px] shadow-[6px_8px_0_#ff2e97] rotate-[-1.5deg]",
];
const AVATAR_BG = ["bg-y2k-hot", "bg-[#c9a8ff]", "bg-[#ffb3df]"];

export function Theme8TestimonialsSection({ testimonials, headline }: Props) {
  const cards: Card[] =
    testimonials && testimonials.length > 0
      ? testimonials.slice(0, 3).map((t) => ({
          quote: t.comment,
          name: t.clientName,
          meta: "Klijent",
          initial: (t.clientName || "?").trim().charAt(0).toUpperCase(),
          rating: t.rating || 5,
        }))
      : DEFAULT_CARDS;

  return (
    <section id="reviews" className="relative max-w-[1140px] mx-auto my-28 px-5">
      <FadeUp className="text-center mb-10 relative">
        <Image
          src="/images/theme-8/paint-streak.png"
          alt=""
          aria-hidden="true"
          width={760}
          height={240}
          className="absolute left-1/2 top-[54%] w-[760px] max-w-[112%] -translate-x-1/2 -translate-y-1/2 scale-105 opacity-90 z-0 pointer-events-none"
        />
        <span className="relative z-[1] inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink">
          {headline || "Kind words"}
        </span>
        <h2 className="relative z-[1] mt-1.5 font-bagel text-[clamp(40px,6vw,80px)] leading-[0.9] text-y2k-ink rotate-[-1deg]">
          LOVED BY THE CHAIR
        </h2>
      </FadeUp>

      <div className="grid md:grid-cols-3 gap-[22px]">
        {cards.map((c, i) => (
          <FadeUp key={i} delay={i * 0.08}>
            <figure
              className={`h-full bg-white border-[3px] border-y2k-ink p-6 ${
                CARD_STYLES[i % CARD_STYLES.length]
              }`}
            >
              <div className="text-y2k-pink text-[18px] tracking-[2px]">
                {"★".repeat(Math.max(0, Math.min(5, c.rating)))}
                <span className="text-y2k-ink/15">
                  {"★".repeat(5 - Math.max(0, Math.min(5, c.rating)))}
                </span>
              </div>
              <blockquote className="font-caveat font-bold text-[26px] leading-[1.2] my-2.5 mb-4 text-y2k-ink">
                &ldquo;{c.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-2.5">
                <span
                  className={`grid place-items-center w-10 h-10 rounded-full border-2 border-y2k-ink font-extrabold text-y2k-ink ${
                    AVATAR_BG[i % AVATAR_BG.length]
                  }`}
                >
                  {c.initial}
                </span>
                <span className="font-extrabold text-[14px] text-y2k-ink">
                  {c.name}
                  <span className="block font-medium text-[#7a5a6c]">
                    {c.meta}
                  </span>
                </span>
              </figcaption>
            </figure>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}
