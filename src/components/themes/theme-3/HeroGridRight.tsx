"use client";

import Image from "next/image";
import Link from "next/link";
import { AnchorLink } from "../shared/AnchorLink";
import { motion } from "framer-motion";
import type { HeroSharedProps } from "./Theme3Hero";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const FALLBACK_IMAGES = [
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1772071241/salon/h4qlp46szqnkosbnjztp.jpg",
    alt: "Beauty treatment",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1772025932/salon/dd8p6j5stlaynb5p83qc.jpg",
    alt: "Salon atmosphere",
  },
  {
    src: "https://res.cloudinary.com/dufo1t5li/image/upload/v1771740371/marysoll-ai-look-1771740341957_nfxa1m.jpg",
    alt: "Professional results",
  },
];

export function HeroGridRight({ data, cta }: HeroSharedProps) {
  const hasPrimary = !!cta.primary.text;
  const hasSecondary = !!cta.secondary?.text;

  const images =
    data?.images && data.images.length > 0
      ? data.images
      : data?.image
      ? [data.image]
      : FALLBACK_IMAGES;

  const [main, secondary, tertiary] = images.slice(0, 3);

  return (
    <section className="bg-[#FAF8F5] min-h-[90vh] flex items-center py-20">
      <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* LEFT: TEXT */}
        <div>
          {data?.whereWhatForWhom && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05, ease }}
              className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase mb-4"
            >
              {data.whereWhatForWhom}
            </motion.p>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.15, ease }}
            className="text-4xl lg:text-5xl xl:text-6xl font-serif font-light text-[#2B2B2B] leading-tight mb-6"
          >
            {data?.headline || "Otkrij svoju prirodnu lepotu"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.25, ease }}
            className="text-[#6B6B6B] text-base lg:text-lg leading-relaxed mb-8 max-w-md"
          >
            {data?.subheadline ||
              "Profesionalna nega i tretmani koji naglašavaju tvoju jedinstvenu lepotu."}
          </motion.p>

          {(hasPrimary || hasSecondary) && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease }}
              className="flex flex-wrap gap-4"
            >
              {hasPrimary && (
                <AnchorLink
                  href={cta.primary.href}
                  className="px-8 py-3.5 bg-[#C9A990] text-white rounded-full text-sm font-semibold hover:bg-[#b8947a] transition-all duration-300 shadow-lg shadow-[#C9A990]/25 hover:-translate-y-0.5"
                >
                  {cta.primary.text}
                </AnchorLink>
              )}
              {hasSecondary && (
                <AnchorLink
                  href={cta.secondary!.href}
                  className="px-8 py-3.5 border border-[#C9A990] text-[#2B2B2B] rounded-full text-sm hover:bg-[#C9A990]/5 transition-all duration-300"
                >
                  {cta.secondary!.text}
                </AnchorLink>
              )}
            </motion.div>
          )}

          {(data?.contact?.location || data?.contact?.phone) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-[#E8E0D5] text-sm text-[#9E7E6E]"
            >
              {data!.contact!.location && (
                <span>📍 {data!.contact!.location}</span>
              )}
              {data!.contact!.phone && (
                <Link
                  href={`tel:${data!.contact!.phone}`}
                  className="hover:text-[#C9A990] transition-colors"
                >
                  📞 {data!.contact!.phone}
                </Link>
              )}
            </motion.div>
          )}
        </div>

        {/* RIGHT: ASYMMETRIC MASONRY GRID */}
        <div className="relative h-[480px] lg:h-[560px]">
          {main && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease }}
              whileHover={{ scale: 1.02 }}
              className="absolute top-0 left-0 w-[58%] h-[74%] rounded-3xl overflow-hidden shadow-xl shadow-[#C9A990]/15 ring-1 ring-[#E8E0D5]"
            >
              <Image src={main.src} alt={main.alt ?? ""} fill className="object-cover" priority />
            </motion.div>
          )}

          {secondary && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.35, ease }}
              whileHover={{ scale: 1.02 }}
              className="absolute top-6 right-0 w-[38%] h-[44%] rounded-2xl overflow-hidden shadow-lg shadow-[#C9A990]/10 ring-1 ring-[#E8E0D5] rotate-1"
            >
              <Image src={secondary.src} alt={secondary.alt ?? ""} fill className="object-cover" />
            </motion.div>
          )}

          {tertiary && (
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.5, ease }}
              whileHover={{ scale: 1.02 }}
              className="absolute bottom-0 right-3 w-[45%] h-[44%] rounded-2xl overflow-hidden shadow-lg shadow-[#C9A990]/10 ring-1 ring-[#E8E0D5] -rotate-1"
            >
              <Image src={tertiary.src} alt={tertiary.alt ?? ""} fill className="object-cover" />
            </motion.div>
          )}

          {/* Soft ambient glow behind the grid */}
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-radial from-[#C9A990]/8 to-transparent blur-3xl" />
        </div>
      </div>
    </section>
  );
}
