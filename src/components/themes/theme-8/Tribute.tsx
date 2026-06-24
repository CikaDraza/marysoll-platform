"use client";

/**
 * Theme-8 Tribute — a sentimental, non-CMS section dedicated to the founder's
 * late mother. Reuses the About layout (framed portrait on one side, dedication
 * copy on the other). A ring of hearts/stars hugs the portrait frame: on first
 * scroll-into-view they "slap" onto the frame from the screen (sprite-sticker
 * intro), then rest — each statically tilted at a different angle.
 */
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { FadeUp } from "./FadeUp";
import { Deco } from "./Decorations";

const PINK = "#ff2e97";
const PURPLE = "#8B16C9";
const WHITE = "#fff";

type FrameDeco = {
  /** Tailwind position utilities placing the sticker on the frame perimeter. */
  pos: string;
  shape: "heart" | "star";
  fill: string;
  size: number;
  /** Resting tilt — each one different. */
  rotate: number;
};

/**
 * Hearts (pink / purple / white) + white stars, clustered & overlapping at three
 * corners of the frame — the bottom-right is left clear for the "Zahvalnost" pill.
 * Anchored with pixel offsets so each cluster bunches tightly around its corner
 * regardless of frame width. Order: top-left → top-right → bottom-left.
 */
const FRAME_DECOS: FrameDeco[] = [
  // top-left corner — 5
  {
    pos: "top-[-26px] left-[-20px]",
    shape: "heart",
    fill: PINK,
    size: 42,
    rotate: -14,
  },
  {
    pos: "top-[-30px] left-[30px]",
    shape: "star",
    fill: WHITE,
    size: 32,
    rotate: 9,
  },
  {
    pos: "top-[8px] left-[-26px]",
    shape: "heart",
    fill: PURPLE,
    size: 38,
    rotate: -6,
  },
  {
    pos: "top-[4px] left-[20px]",
    shape: "heart",
    fill: WHITE,
    size: 34,
    rotate: 12,
  },
  {
    pos: "top-[40px] left-[-18px]",
    shape: "heart",
    fill: PINK,
    size: 34,
    rotate: -10,
  },
  // top-right corner — 5
  {
    pos: "top-[-26px] right-[-20px]",
    shape: "heart",
    fill: PINK,
    size: 42,
    rotate: 13,
  },
  {
    pos: "top-[-30px] right-[30px]",
    shape: "star",
    fill: WHITE,
    size: 32,
    rotate: -8,
  },
  {
    pos: "top-[8px] right-[-26px]",
    shape: "heart",
    fill: PURPLE,
    size: 38,
    rotate: 6,
  },
  {
    pos: "top-[4px] right-[20px]",
    shape: "heart",
    fill: WHITE,
    size: 34,
    rotate: -12,
  },
  {
    pos: "top-[40px] right-[-18px]",
    shape: "heart",
    fill: PINK,
    size: 34,
    rotate: 10,
  },
  // bottom-left corner — 6
  {
    pos: "bottom-[-26px] left-[-20px]",
    shape: "heart",
    fill: PINK,
    size: 42,
    rotate: -12,
  },
  {
    pos: "bottom-[-30px] left-[30px]",
    shape: "star",
    fill: WHITE,
    size: 32,
    rotate: 9,
  },
  {
    pos: "bottom-[8px] left-[-26px]",
    shape: "heart",
    fill: PURPLE,
    size: 38,
    rotate: -6,
  },
  {
    pos: "bottom-[4px] left-[20px]",
    shape: "heart",
    fill: WHITE,
    size: 34,
    rotate: 12,
  },
  {
    pos: "bottom-[40px] left-[-18px]",
    shape: "heart",
    fill: PINK,
    size: 34,
    rotate: -10,
  },
  {
    pos: "bottom-[-14px] left-[62px]",
    shape: "heart",
    fill: PURPLE,
    size: 36,
    rotate: 7,
  },
];

/** One perimeter sticker: flies in from the screen once, then rests tilted. */
function FrameSticker({ deco, index }: { deco: FrameDeco; index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className={`absolute ${deco.pos}`}
      style={{ transformPerspective: 900 }}
      initial={
        reduce
          ? { rotate: deco.rotate }
          : { scale: 2.2, z: 200, opacity: 0, rotate: deco.rotate - 10 }
      }
      whileInView={
        reduce ? undefined : { scale: 1, z: 0, opacity: 1, rotate: deco.rotate }
      }
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{
        duration: 0.75,
        ease: [0.34, 1.32, 0.5, 1],
        delay: 0.15 + index * 0.06,
      }}
    >
      <Deco
        shape={deco.shape}
        size={deco.size}
        fill={deco.fill}
        motionType="none"
        className="drop-shadow-[2px_4px_6px_rgba(11,11,15,0.35)]"
      />
    </motion.div>
  );
}

export function Theme8Tribute() {
  return (
    <section
      id="tribute"
      className="relative max-w-[1120px] mx-auto my-24 px-5"
    >
      <FadeUp>
        <div className="relative rotate-[1.2deg]">
          <div className="absolute -inset-2.5 bg-y2k-paper [filter:url(#y2k-torn)] shadow-[0_26px_60px_rgba(20,0,30,0.42)]" />
          <div className="relative grid md:grid-cols-[0.85fr_1.15fr] gap-9 md:gap-12 items-center p-8 sm:p-10">
            {/* portrait + heart ring */}
            <div className="relative rotate-[-2deg]">
              <div className="relative bg-white p-2.5 pb-3.5 border-2 border-y2k-ink shadow-[5px_9px_18px_rgba(11,11,15,0.28)]">
                <div className="relative w-full h-[420px] sm:h-[460px]">
                  <Image
                    src="/images/theme-8/anja&andjela.jpg"
                    alt="Anja sa svojom majkom anđelom čuvarom"
                    fill
                    sizes="(min-width: 768px) 38vw, 90vw"
                    className="object-cover object-top"
                  />
                </div>
              </div>
              <div className="absolute z-10 -bottom-4 -right-3.5 bg-y2k-pink text-white font-bagel text-[18px] px-4 py-2.5 border-[3px] border-y2k-ink rounded-[18px] shadow-[4px_4px_0_#0b0b0f] rotate-[-5deg]">
                Zahvalnost ♡
              </div>
              {/* heart ring — flies onto the frame on first view, then static */}
              <div className="pointer-events-none absolute inset-0 z-20">
                {FRAME_DECOS.map((deco, i) => (
                  <FrameSticker key={i} deco={deco} index={i} />
                ))}
              </div>
            </div>
            {/* dedication copy */}
            <div>
              <span className="inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink mb-2.5">
                Posveta <span className="text-xl">♡</span>
              </span>
              <h2 className="m-0 mb-4 font-bagel text-[clamp(44px,4.8vw,72px)] leading-[0.96] text-y2k-ink">
                Za one koji nas zauvek prate kroz zivot.
              </h2>
              <p className="m-0 max-w-[520px] text-[18px] leading-[1.65] font-medium text-[#241019]">
                Ovaj salon je posvećen ženi koja me je naučila da verujem u
                sebe. Iako nije ovde, njen trag je u svakom mom koraku. Moj prvi
                uzor, moja večna inspiracija.
              </p>
            </div>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
