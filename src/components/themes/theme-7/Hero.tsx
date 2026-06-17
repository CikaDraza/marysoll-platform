"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { formatStatValue } from "@/lib/tenant/tenantStatsUtils";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { FadeUp } from "./FadeUp";

interface Props {
  heroData: {
    headline?: string;
    subheadline?: string;
  };
  cta: {
    primary: { text: string; href: string };
    secondary?: { text: string; href: string };
  };
  tenantStats?: TenantStats;
  yearsOfExperience?: number;
  bookingSlot?: ReactNode;
}

const DEFAULT_DESCRIPTION =
  "Hand-crafted lash and brow artistry in a calm, neon-lit studio — designed around your eyes, your features, and the way you want to feel.";

/** Render a headline with its last word as a neon italic accent. */
function AccentHeadline({ headline }: { headline?: string }) {
  if (!headline) {
    return (
      <>
        Eyes that
        <br />
        <span className="italic text-neon drop-shadow-[0_0_28px_#ff2e88aa]">
          do the talking.
        </span>
      </>
    );
  }
  const words = headline.trim().split(/\s+/);
  const last = words.pop();
  return (
    <>
      {words.join(" ")}{" "}
      <span className="italic text-neon drop-shadow-[0_0_28px_#ff2e88aa]">
        {last}
      </span>
    </>
  );
}

export function Theme7Hero({
  heroData,
  cta,
  tenantStats,
  yearsOfExperience,
  bookingSlot,
}: Props) {
  const setsCrafted = tenantStats
    ? formatStatValue(tenantStats.appointmentCount)
    : "1.2k+";
  const years = yearsOfExperience ? `${yearsOfExperience} yrs` : "6 yrs";

  return (
    <header id="top" className="relative bg-ink text-cream">
      {/* Neon glow layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(55%_55%_at_74%_18%,#ff2e8866_0%,#ff2e8800_68%)]" />
        <div className="absolute -left-40 top-1/3 h-[460px] w-[460px] rounded-full bg-[radial-gradient(closest-side,#ff79b04d,transparent)] blur-2xl" />
        <motion.div
          className="absolute inset-x-0 bottom-0 h-px bg-neon shadow-[0_0_50px_12px_#ff2e88]"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative max-w-[1320px] mx-auto px-6 lg:px-10 pt-36 lg:pt-44 pb-28 lg:pb-56">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-start">
          {/* LEFT */}
          <FadeUp className="lg:col-span-7 max-w-2xl">
            <p className="flex items-center gap-3 text-[12px] uppercase tracking-[0.32em] text-neonsoft mb-7">
              <span className="h-px w-10 bg-neon shadow-[0_0_12px_#ff2e88]" />
              Lash &amp; brow artistry studio
            </p>
            <h1 className="font-cormorant font-semibold leading-[0.92] tracking-[-0.01em] text-6xl sm:text-7xl lg:text-[6.7rem]">
              <AccentHeadline headline={heroData.headline} />
            </h1>
            <p className="mt-8 text-lg lg:text-xl text-cream/70 leading-relaxed max-w-xl">
              {heroData.subheadline || DEFAULT_DESCRIPTION}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href={cta.primary.href}
                className="group inline-flex items-center gap-2 rounded-full bg-neon px-7 py-3.5 text-[13px] uppercase tracking-[0.18em] font-medium text-white shadow-[0_12px_40px_-10px_#ff2e88] hover:-translate-y-0.5 hover:shadow-[0_18px_55px_-10px_#ff2e88] transition-all duration-300"
              >
                {cta.primary.text || "Book your appointment"}
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                  &rarr;
                </span>
              </a>
              <a
                href="#gallery"
                className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.18em] text-cream/80 hover:text-white border-b border-cream/25 hover:border-white pb-1 transition-colors"
              >
                View the work
              </a>
            </div>

            <div className="mt-14 flex items-center gap-10">
              <div>
                <div className="font-cormorant text-4xl">
                  4.9<span className="text-neon">★</span>
                </div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-cream/50 mt-1">
                  Client rating
                </div>
              </div>
              <div className="h-10 w-px bg-cream/15" />
              <div>
                <div className="font-cormorant text-4xl">{setsCrafted}</div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-cream/50 mt-1">
                  Sets crafted
                </div>
              </div>
              <div className="h-10 w-px bg-cream/15" />
              <div>
                <div className="font-cormorant text-4xl">{years}</div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-cream/50 mt-1">
                  Of artistry
                </div>
              </div>
            </div>
          </FadeUp>

          {/* RIGHT: booking card — full column width on desktop, centered & contained on mobile */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none min-w-0 relative z-30 lg:-mb-40">
            {bookingSlot}
          </div>
        </div>
      </div>
    </header>
  );
}
