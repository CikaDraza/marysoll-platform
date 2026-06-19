import type { ReactNode } from "react";

/**
 * Y2KAuthShell — full-screen graffiti-wall backdrop + centered modal card,
 * shared chrome for the Theme-8 auth forms (login / register / forgot / reset).
 *
 * Loads the Theme-8 display fonts itself (Bagel Fat One + Caveat) because the
 * auth routes render outside ThemeLayout, where those fonts aren't otherwise
 * pulled in.
 */
const Y2K_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Caveat:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap";

interface Props {
  children: ReactNode;
  /** Hard offset-shadow colour for the card — "#ff2e97" or "#8B16C9". */
  shadow?: string;
  /** Max card width (Tailwind class). */
  maxWidth?: string;
}

export function Y2KAuthShell({
  children,
  shadow = "#ff2e97",
  maxWidth = "max-w-md",
}: Props) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 font-outfit text-y2k-ink overflow-hidden">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href={Y2K_FONT_HREF} />
      {/* graffiti wall background */}
      <div className="absolute inset-0 bg-[url('/images/theme-8/bg-wallpaper_1_.webp')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(20,2,16,0)_40%,rgba(20,2,16,0.55)_100%)]" />

      <div
        className={`relative w-full ${maxWidth} bg-white border-[4px] border-y2k-ink rounded-[28px] p-7 sm:p-8`}
        style={{ boxShadow: `10px 12px 0 ${shadow}` }}
      >
        {children}
      </div>
    </div>
  );
}
