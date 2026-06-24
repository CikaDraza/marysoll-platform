"use client";

import Image from "next/image";
import Link from "next/link";
import { AnchorLink } from "../shared/AnchorLink";
import { motion } from "framer-motion";
import type { HeroSharedProps } from "./Theme3Hero";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const FALLBACK_IMAGE =
  "https://res.cloudinary.com/dufo1t5li/image/upload/v1772071241/salon/h4qlp46szqnkosbnjztp.jpg";

export function HeroSplitLeft({ data, cta }: HeroSharedProps) {
  const hasPrimary = !!cta.primary.text;
  const hasSecondary = !!cta.secondary?.text;
  const imageSrc = data?.image?.src || FALLBACK_IMAGE;
  const imageAlt = data?.image?.alt || "Salon image";

  return (
    <section className="bg-[#FAF8F5] min-h-[90vh] flex items-stretch">
      <div className="max-w-7xl mx-auto px-6 w-full grid lg:grid-cols-2 items-center py-20 lg:py-0 gap-10 lg:gap-16">
        {/* IMAGE — left on desktop, below text on mobile */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, ease }}
          className="relative aspect-[4/5] lg:aspect-auto lg:h-[80vh] rounded-3xl overflow-hidden shadow-2xl shadow-[#C9A990]/15 order-2 lg:order-1"
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#FAF8F5]/15" />
        </motion.div>

        {/* TEXT — right on desktop, above image on mobile */}
        <div className="order-1 lg:order-2 flex flex-col justify-center lg:pl-4">
          {data?.whereWhatForWhom && (
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease }}
              className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase mb-4"
            >
              {data.whereWhatForWhom}
            </motion.p>
          )}

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease }}
            className="text-4xl lg:text-5xl xl:text-6xl font-serif font-light text-[#2B2B2B] leading-tight mb-6"
          >
            {data?.headline || "Otkrij svoju prirodnu lepotu"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.3, ease }}
            className="text-[#6B6B6B] text-base lg:text-lg leading-relaxed mb-8 max-w-md"
          >
            {data?.subheadline ||
              "Profesionalna nega i tretmani koji naglašavaju tvoju jedinstvenu lepotu."}
          </motion.p>

          {(hasPrimary || hasSecondary) && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease }}
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
              transition={{ duration: 0.5, delay: 0.55 }}
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
      </div>
    </section>
  );
}
