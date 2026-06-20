"use client";

/**
 * Theme-8 decoration layer system (Bratz / Y2K graffiti wall).
 *
 *   BackgroundWall  — fixed wallpaper + depth gradients (z-0)
 *   SprayLayer      — neon graffiti sprays that spray-on once (z-1, behind content)
 *   StickerLayer    — floating WebP/PNG stickers (z-2, behind content)
 *   DoodleLayer     — hand-drawn doodles that draw themselves (z-3, behind content)
 *   SparkleLayer    — hearts / stars / sparkles, bounce & pulse (z-20, OVER content)
 *
 * Every layer is `pointer-events-none` so nothing blocks text or buttons; the
 * over-content sparkle layer only overlaps visually. All loops honor
 * prefers-reduced-motion (via <Deco> / <FloatImg>). Counts are trimmed on mobile.
 */
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Deco } from "../Decorations";
import { SprayReveal } from "./SprayReveal";
import {
  HeartDoodle,
  StarDoodle,
  CrownDoodle,
  QueenAnjaDoodle,
} from "./Doodles";

const SPRAY = "/images/theme-8/spray";
const STICK = "/images/theme-8/stickers";

/* ── Background wall ─────────────────────────────────────────────────────── */

export function BackgroundWall() {
  return (
    <>
      <div className="fixed inset-0 z-0 bg-[url('/images/theme-8/bg-wallpaper_1_.webp')] bg-cover bg-center" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(120%_80%_at_50%_0%,rgba(20,2,16,0)_40%,rgba(20,2,16,0.45)_100%)]" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(40,5,30,0.12))]" />
    </>
  );
}

/* ── Spray layer ─────────────────────────────────────────────────────────── */

export function SprayLayer() {
  return (
    <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
      <SprayReveal
        src={`${SPRAY}/star-spray.svg`}
        color="hot"
        size={210}
        opacity={0.5}
        className="absolute left-[-4%] top-[9%] rotate-[-8deg]"
      />
      <SprayReveal
        src={`${SPRAY}/heart-spray-1.svg`}
        color="pink"
        size={240}
        opacity={0.45}
        className="absolute right-[-5%] top-[30%] rotate-[10deg]"
      />
      <SprayReveal
        src={`${SPRAY}/queen-anja-spray.svg`}
        color="purple"
        size={300}
        opacity={0.4}
        className="absolute left-[-7%] top-[58%] rotate-[-4deg] hidden sm:block"
      />
      <SprayReveal
        src={`${SPRAY}/flower-spray.svg`}
        color="hot"
        size={230}
        opacity={0.5}
        className="absolute right-[-4%] bottom-[7%] rotate-[6deg]"
      />
    </div>
  );
}

/* ── Sticker layer ───────────────────────────────────────────────────────── */

const FLOAT_LOOPS = {
  bob: {
    animate: { y: [0, -12, 0] },
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const },
  },
  wiggle: {
    animate: { rotate: [-5, 5, -5] },
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" as const },
  },
};

function FloatImg({
  src,
  w,
  h,
  wrapClass,
  motionType = "bob",
}: {
  src: string;
  w: number;
  h: number;
  wrapClass: string;
  motionType?: "bob" | "wiggle";
}) {
  const reduce = useReducedMotion();
  const loop = reduce ? undefined : FLOAT_LOOPS[motionType];
  return (
    <div className={wrapClass}>
      <motion.div animate={loop?.animate} transition={loop?.transition}>
        <Image
          src={src}
          width={w}
          height={h}
          alt=""
          className="w-full h-auto select-none"
        />
      </motion.div>
    </div>
  );
}

export function StickerLayer() {
  return (
    <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
      <FloatImg
        src={`${STICK}/heart-sticker.webp`}
        w={480}
        h={550}
        motionType="bob"
        wrapClass="absolute right-[4%] top-[13%] w-[60px] sm:w-[92px] rotate-[8deg]"
      />
      <FloatImg
        src={`${STICK}/shine-sticker.webp`}
        w={600}
        h={297}
        motionType="wiggle"
        wrapClass="absolute left-[5%] top-[27%] w-[88px] sm:w-[128px] rotate-[-6deg]"
      />
      <FloatImg
        src={`${STICK}/sticker-sprite-1.png`}
        w={806}
        h={1172}
        motionType="bob"
        wrapClass="absolute left-[3%] top-[63%] w-[70px] sm:w-[104px] rotate-[-5deg] hidden sm:block"
      />
      <FloatImg
        src={`${STICK}/sticker-sprite-2.png`}
        w={449}
        h={734}
        motionType="bob"
        wrapClass="absolute right-[6%] bottom-[15%] w-[58px] sm:w-[82px] rotate-[7deg]"
      />
    </div>
  );
}

/* ── Doodle layer (drawn-by-hand) ────────────────────────────────────────── */

export function DoodleLayer() {
  return (
    <div className="absolute inset-0 z-[3] overflow-hidden pointer-events-none">
      <HeartDoodle
        glow="pink"
        className="absolute left-[5%] top-[7%] rotate-[-8deg] w-[58px] sm:w-[84px]"
      />
      <StarDoodle
        glow="purple"
        className="absolute right-[7%] top-[19%] rotate-[10deg] w-[52px] sm:w-[76px]"
      />
      <CrownDoodle
        glow="pink"
        className="absolute left-[9%] top-[43%] rotate-[-6deg] w-[60px] sm:w-[84px] hidden sm:block"
      />
      <QueenAnjaDoodle
        glow="pink"
        className="absolute right-[3%] top-[71%] rotate-[-3deg] w-[190px] sm:w-[300px]"
      />
      <HeartDoodle
        glow="red"
        stroke="#ff2d55"
        className="absolute right-[12%] bottom-[9%] rotate-[6deg] w-[50px] sm:w-[68px]"
      />
    </div>
  );
}

/* ── Sparkle layer (over content, non-interactive) ───────────────────────── */

export function SparkleLayer() {
  return (
    <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
      {/* 3 hearts — different sizes, bounce / pulse */}
      <div className="absolute left-[7%] top-[16%] rotate-[-14deg]">
        <Deco shape="heart" size={30} fill="#ff2e97" motionType="pulse" />
      </div>
      <div className="absolute right-[9%] top-[39%] rotate-[12deg] hidden sm:block">
        <Deco shape="heart" size={46} fill="#ff5fd2" motionType="bounce" />
      </div>
      <div className="absolute left-[13%] bottom-[17%] rotate-[8deg]">
        <Deco shape="heart" size={38} fill="#ff2d55" motionType="bounce" />
      </div>
      {/* 3 stars — like the footer star */}
      <div className="absolute right-[6%] top-[11%] rotate-[10deg]">
        <Deco shape="star" size={34} fill="#ff2e97" stroke="#fff" strokeWidth={4} motionType="bounce" />
      </div>
      <div className="absolute left-[9%] top-[51%] rotate-[-10deg] hidden sm:block">
        <Deco shape="star" size={28} fill="#8B16C9" stroke="#fff" strokeWidth={4} motionType="pulse" />
      </div>
      <div className="absolute right-[14%] bottom-[11%] rotate-[-6deg]">
        <Deco shape="star" size={40} fill="#fff" stroke="#0b0b0f" strokeWidth={5} motionType="bounce" />
      </div>
      {/* twinkling sparkles */}
      <div className="absolute left-[40%] top-[8%]">
        <Deco shape="sparkle" size={26} fill="#fff" strokeWidth={0} motionType="twinkle" />
      </div>
      <div className="absolute right-[36%] top-[58%] hidden sm:block">
        <Deco shape="sparkle" size={22} fill="#ff5fd2" strokeWidth={0} motionType="twinkle" />
      </div>
    </div>
  );
}
