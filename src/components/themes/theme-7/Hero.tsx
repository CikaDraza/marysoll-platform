"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { formatStatValue } from "@/lib/tenant/tenantStatsUtils";
import type { TenantStats } from "@/lib/tenant/tenantStatsUtils";
import { FadeUp } from "./FadeUp";
import { AnchorLink } from "../shared/AnchorLink";

interface Props {
  /** Theme-7 hero je čisto tipografski — bez slike (booking kartica je vizual). */
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
  /** Opening year — when set, years of artistry auto-increments each year. */
  openingYear?: number;
  bookingSlot?: ReactNode;
}

/** Salon opened in 2023; "years of artistry" auto-increments one per year. */
const STUDIO_OPENED_YEAR = 2023;

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
  openingYear,
  bookingSlot,
}: Props) {
  // Stats stay on flattering fallbacks until the salon has real traction:
  // more than 3 *completed* appointments AND more than 3 testimonials.
  const completedCount = tenantStats?.completedAppointmentCount ?? 0;
  const hasRealTraction =
    completedCount > 3 && (tenantStats?.reviewCount ?? 0) > 3;
  const setsCrafted = hasRealTraction
    ? formatStatValue(completedCount)
    : "250+";
  // Rating: real testimonials average once there's traction, else a fallback.
  const rating =
    hasRealTraction && tenantStats?.averageRating != null
      ? tenantStats.averageRating.toFixed(1)
      : "4.9";
  // Years of artistry: opening year (auto-increments) wins; else manual CMS
  // value; else auto-counts up from the baked-in opening year.
  const years = openingYear
    ? `${Math.max(1, new Date().getFullYear() - openingYear)} yrs`
    : yearsOfExperience
      ? `${yearsOfExperience} yrs`
      : `${Math.max(1, new Date().getFullYear() - STUDIO_OPENED_YEAR)} yrs`;

  return (
    <section id="top" className="relative bg-ink lg:max-h-screen text-cream">
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

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-36 lg:pt-44 pb-28 lg:pb-56">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-start">
          {/* LEFT */}
          <FadeUp className="lg:col-span-7 max-w-2xl">
            <p className="flex items-center gap-3 text-[12px] uppercase tracking-[0.32em] text-neonsoft mb-7">
              <span className="h-px w-10 bg-neon shadow-[0_0_12px_#ff2e88]" />
              Beauty &amp; artistry studio
            </p>
            <h1 className="font-cormorant font-semibold leading-[0.92] tracking-[-0.01em] text-5xl sm:text-7xl lg:text-[6.7rem] break-words">
              <AccentHeadline headline={heroData.headline} />
            </h1>
            <p className="mt-8 text-lg lg:text-xl text-cream/70 leading-relaxed max-w-xl">
              {heroData.subheadline || DEFAULT_DESCRIPTION}
            </p>

            {/* Mobilni: dugmad jedno ispod drugog preko cele širine kontejnera. */}
            <div className="mt-10 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-4">
              <AnchorLink
                href={cta.primary.href}
                offset={90}
                className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-neon px-7 py-3.5 text-[13px] uppercase tracking-[0.18em] font-medium text-white shadow-[0_12px_40px_-10px_#ff2e88] hover:-translate-y-0.5 hover:shadow-[0_18px_55px_-10px_#ff2e88] transition-all duration-300"
              >
                {cta.primary.text || "Book your appointment"}
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                  &rarr;
                </span>
              </AnchorLink>
              <AnchorLink
                href="#gallery"
                offset={90}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full sm:rounded-none border border-cream/25 sm:border-0 sm:border-b px-7 py-3.5 sm:px-0 sm:py-0 sm:pb-1 text-[13px] uppercase tracking-[0.18em] text-cream/80 hover:text-white hover:border-white transition-colors"
              >
                View the work
              </AnchorLink>
            </div>

            <div className="mt-14 flex items-center gap-5 sm:gap-10">
              <div>
                <div className="font-cormorant text-3xl sm:text-4xl">
                  {rating}
                  <span className="text-neon">★</span>
                </div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-cream/50 mt-1">
                  Client rating
                </div>
              </div>
              <div className="h-10 w-px bg-cream/15" />
              <div>
                <div className="font-cormorant text-3xl sm:text-4xl">{setsCrafted}</div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-cream/50 mt-1">
                  Sets crafted
                </div>
              </div>
              <div className="h-10 w-px bg-cream/15" />
              <div>
                <div className="font-cormorant text-3xl sm:text-4xl">{years}</div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-cream/50 mt-1">
                  Of artistry
                </div>
              </div>
            </div>
          </FadeUp>

          {/* RIGHT: booking card — puna širina kontejnera, centrirano na mobilnom */}
          <div className="lg:col-span-5 w-full mx-auto min-w-0 relative z-30 lg:-mb-40">
            {bookingSlot}
          </div>
        </div>
      </div>
    </section>
  );
}
