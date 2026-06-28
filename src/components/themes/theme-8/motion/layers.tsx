"use client";

/**
 * Theme-8 decoration layer system (Bratz / Y2K graffiti wall).
 *
 *   BackgroundWall  — fixed wallpaper + depth gradients (z-0)
 *   FixedDecorLayer — ALL spray + sticker assets, FIXED on the background,
 *                     hugging the content container, large & visible (z-0).
 *                     sticker-sprite-1/2 get a one-time "slap onto the screen →
 *                     recede along Z into the background" intro, then stop.
 *   DoodleLayer     — hand-drawn doodles that draw themselves (z-3, behind content)
 *   SparkleLayer    — hearts / stars / sparkles, bounce & pulse (z-20, OVER content)
 *
 * Every layer is `pointer-events-none` so nothing blocks text or buttons.
 * Honors prefers-reduced-motion. Counts are trimmed on small screens.
 */
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Deco } from "../Decorations";
import {
  HeartDoodle,
  StarDoodle,
  CrownDoodle,
  QueenAnjaDoodle,
} from "./Doodles";

const SPRAY = "/images/theme-8/spray";
const STICK = "/images/theme-8/stickers";

const SPRAY_COLORS = {
  pink: "#ff2e97",
  hot: "#ff5fd2",
  purple: "#8B16C9",
  red: "#ff2d55",
  white: "#ffffff",
} as const;
type SprayColorKey = keyof typeof SPRAY_COLORS;

/* ── Background wall ─────────────────────────────────────────────────────── */

export function BackgroundWall() {
  return (
    <>
      {/* layer 1 — wallpaper paints immediately (no fade) so the first frame is
          the wall, not a flat colour. The preloader covers the cold-load window.
          Sized to the *large* viewport height (100lvh, h-screen fallback) and
          anchored top-only: this stays a constant size when the mobile URL bar
          shows/hides, so the bg-cover image never rescales/jumps on scroll. */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 w-full h-screen h-[100lvh] z-0 bg-[url('/images/theme-8/bg-wallpaper_1_.webp')] bg-cover bg-center"
      />
      <div className="fixed top-0 left-0 w-full h-screen h-[100lvh] z-0 pointer-events-none bg-[radial-gradient(120%_80%_at_50%_0%,rgba(20,2,16,0)_40%,rgba(20,2,16,0.45)_100%)]" />
      <div className="fixed top-0 left-0 w-full h-screen h-[100lvh] z-0 pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(40,5,30,0.12))]" />
    </>
  );
}

/* ── Fixed decoration layer ──────────────────────────────────────────────── */

/** Neon-tinted spray (filled SVG used as a CSS mask). Static, fixed on bg. */
function SprayStatic({
  src,
  color,
  size,
  className,
  opacity = 0.85,
}: {
  src: string;
  color: SprayColorKey;
  size: number;
  className?: string;
  opacity?: number;
}) {
  const c = SPRAY_COLORS[color];
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        width: size,
        height: size,
        opacity,
        backgroundColor: c,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        filter: `drop-shadow(0 0 12px ${c}aa)`,
      }}
    />
  );
}

/**
 * Sticker that "slaps" onto the screen and recedes along Z to the background.
 * Plays once on mount (page load), then stops at its resting (background) state.
 */
function StickerStick({
  src,
  w,
  h,
  wrapClass,
  delay = 0,
  rotate = 0,
}: {
  src: string;
  w: number;
  h: number;
  wrapClass: string;
  delay?: number;
  rotate?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className={wrapClass}
      style={{ transformPerspective: 900 }}
      initial={
        reduce ? false : { scale: 2, z: 220, opacity: 0, rotate: rotate - 8 }
      }
      animate={reduce ? undefined : { scale: 1, z: 0, opacity: 1, rotate }}
      transition={{ duration: 0.9, ease: [0.34, 1.32, 0.5, 1], delay }}
    >
      <Image
        src={src}
        width={w}
        height={h}
        alt=""
        className="w-full h-auto select-none drop-shadow-[4px_10px_14px_rgba(11,11,15,0.45)]"
      />
    </motion.div>
  );
}

export function FixedDecorLayer() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="fixed top-0 left-0 w-full h-screen h-[100lvh] z-0 overflow-hidden pointer-events-none"
      initial={reduce ? false : { opacity: 0 }}
      animate={reduce ? undefined : { opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
    >
      <div className="relative mx-auto h-full w-full max-w-[1320px] px-2 sm:px-4">
        {/* SPRAYS — hug the content edges, large & noticeable */}
        <SprayStatic
          src={`${SPRAY}/star-spray.svg`}
          color="hot"
          size={300}
          opacity={0.8}
          className="absolute left-[-70px] top-[5%] rotate-[-8deg] hidden md:block"
        />
        <SprayStatic
          src={`${SPRAY}/heart-spray-1.svg`}
          color="pink"
          size={300}
          opacity={0.8}
          className="absolute right-[-20px] sm:right-[-60px] top-[32%] rotate-[10deg]"
        />
        <SprayStatic
          src={`${SPRAY}/queen-anja-spray.svg`}
          color="pink"
          size={360}
          opacity={0.7}
          className="absolute left-[-150px] bottom-[3%] rotate-[-4deg] hidden md:block"
        />
        <SprayStatic
          src={`${SPRAY}/flower-spray.svg`}
          color="hot"
          size={300}
          opacity={0.8}
          className="absolute right-[-25px] sm:right-[-75px] bottom-[8%] rotate-[6deg]"
        />

        {/* STICKERS — static, large */}
        <Image
          src={`${STICK}/heart-sticker.webp`}
          width={480}
          height={550}
          alt=""
          aria-hidden="true"
          className="absolute right-[6px] top-[10%] w-[100px] sm:w-[150px] h-auto rotate-[8deg] select-none drop-shadow-[4px_8px_12px_rgba(11,11,15,0.4)]"
        />
        <Image
          src={`${STICK}/shine-sticker.webp`}
          width={600}
          height={297}
          alt=""
          aria-hidden="true"
          className="absolute left-[-50px] top-[24%] w-[150px] sm:w-[210px] h-auto rotate-[-6deg] select-none hidden sm:block"
        />

        {/* STICKER SPRITES — one-time slap → recede-to-background intro */}
        <StickerStick
          src={`${STICK}/sticker-sprite-1.png`}
          w={806}
          h={1172}
          delay={0.7}
          rotate={-5}
          wrapClass="absolute left-1/4 top-1/3 sm:top-2/5 w-[280px] sm:w-[480px]"
        />
        {/* <StickerStick
          src={`${STICK}/sticker-sprite-2.png`}
          w={449}
          h={734}
          delay={0.95}
          rotate={7}
          wrapClass="absolute right-[-30px] sm:-right-[100px] top-[72%] w-[120px] sm:w-[160px]"
        /> */}
      </div>
    </motion.div>
  );
}

/* ── Doodle layer (drawn-by-hand) ────────────────────────────────────────── */

export function DoodleLayer() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="absolute inset-0 z-[3] overflow-hidden pointer-events-none"
      initial={reduce ? false : { opacity: 0 }}
      animate={reduce ? undefined : { opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.65, ease: "easeOut" }}
    >
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
    </motion.div>
  );
}

/* ── Sparkle layer (over content, non-interactive) ───────────────────────── */

export function SparkleLayer() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="absolute inset-0 z-20 overflow-hidden pointer-events-none"
      initial={reduce ? false : { opacity: 0 }}
      animate={reduce ? undefined : { opacity: 1 }}
      transition={{ duration: 0.6, delay: 1.1, ease: "easeOut" }}
    >
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
        <Deco
          shape="star"
          size={34}
          fill="#ff2e97"
          stroke="#fff"
          strokeWidth={4}
          motionType="bounce"
        />
      </div>
      <div className="absolute left-[9%] top-[51%] rotate-[-10deg] hidden sm:block">
        <Deco
          shape="star"
          size={28}
          fill="#8B16C9"
          stroke="#fff"
          strokeWidth={4}
          motionType="pulse"
        />
      </div>
      <div className="absolute right-[14%] bottom-[11%] rotate-[-6deg]">
        <Deco
          shape="star"
          size={40}
          fill="#fff"
          stroke="#0b0b0f"
          strokeWidth={5}
          motionType="bounce"
        />
      </div>
      {/* twinkling sparkles */}
      <div className="absolute left-[40%] top-[8%]">
        <Deco
          shape="sparkle"
          size={26}
          fill="#fff"
          strokeWidth={0}
          motionType="twinkle"
        />
      </div>
      <div className="absolute right-[36%] top-[58%] hidden sm:block">
        <Deco
          shape="sparkle"
          size={22}
          fill="#ff5fd2"
          strokeWidth={0}
          motionType="twinkle"
        />
      </div>
    </motion.div>
  );
}
