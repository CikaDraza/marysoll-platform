import Image from "next/image";

/**
 * Theme8Preloader — first-paint cover so the very first frame is the graffiti
 * WALL + a big white logo, never the flat background colour.
 *
 * It fades itself out with a pure-CSS animation (the `.y2k-preloader` class in
 * globals.css), so it appears on the first server-rendered paint and disappears
 * on its own — no JS / hydration required. Hidden entirely for reduced-motion.
 * z-[200] keeps it above everything (incl. modals) for its ~1s lifetime.
 */
export function Theme8Preloader({
  logo,
  salonName,
}: {
  logo?: string;
  salonName?: string;
}) {
  const logoSrc = logo || "/images/theme-8/logo-byanja.svg";
  return (
    <div
      aria-hidden="true"
      className="y2k-preloader fixed inset-0 z-[200] grid place-items-center bg-y2k-ink bg-[url('/images/theme-8/bg-wallpaper_1_.webp')] bg-cover bg-center"
    >
      {/* darken the wall so the white logo pops */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,rgba(20,2,16,0.35),rgba(20,2,16,0.72))]" />
      <Image
        src={logoSrc}
        alt={salonName ?? "The Lash Room by Anja"}
        width={420}
        height={420}
        priority
        unoptimized
        className="relative w-[180px] sm:w-[280px] h-auto [filter:brightness(0)_invert(1)] drop-shadow-[0_0_34px_rgba(255,46,151,0.55)] animate-pulse"
      />
    </div>
  );
}
