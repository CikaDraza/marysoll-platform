"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { HeroSharedProps } from "./Theme3Hero";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease },
});

export function HeroCenterImage({ data, cta }: HeroSharedProps) {
  const hasPrimary = !!cta.primary.text;
  const hasSecondary = !!cta.secondary?.text;
  const hasImage = !!data?.image?.src;

  return (
    <section className="bg-[#FAF8F5] pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto text-center">
        {data?.whereWhatForWhom && (
          <motion.p
            {...fadeUp(0)}
            className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase mb-4"
          >
            {data.whereWhatForWhom}
          </motion.p>
        )}

        <motion.h1
          {...fadeUp(0.1)}
          className="text-5xl lg:text-6xl font-serif font-light text-[#2B2B2B] leading-tight mb-6"
        >
          {data?.headline || "Otkrij svoju prirodnu lepotu"}
        </motion.h1>

        <motion.p
          {...fadeUp(0.2)}
          className="text-[#6B6B6B] text-lg leading-relaxed mb-8 max-w-lg mx-auto"
        >
          {data?.subheadline ||
            "Profesionalna nega i tretmani koji naglašavaju tvoju jedinstvenu lepotu."}
        </motion.p>

        {(hasPrimary || hasSecondary) && (
          <motion.div
            {...fadeUp(0.3)}
            className="flex flex-wrap gap-4 justify-center mb-12"
          >
            {hasPrimary && (
              <Link
                href={cta.primary.href}
                className="px-8 py-3.5 bg-[#C9A990] text-white rounded-full text-sm font-semibold hover:bg-[#b8947a] transition-all duration-300 shadow-lg shadow-[#C9A990]/25 hover:shadow-[#C9A990]/40 hover:-translate-y-0.5"
              >
                {cta.primary.text}
              </Link>
            )}
            {hasSecondary && (
              <Link
                href={cta.secondary!.href}
                className="px-8 py-3.5 border border-[#C9A990] text-[#2B2B2B] rounded-full text-sm hover:border-[#b8947a] hover:bg-[#C9A990]/5 transition-all duration-300"
              >
                {cta.secondary!.text}
              </Link>
            )}
          </motion.div>
        )}

        {hasImage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.35, ease }}
            whileHover={{ scale: 1.02 }}
            className="relative mx-auto max-w-sm aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl shadow-[#C9A990]/20 ring-1 ring-[#E8E0D5]"
          >
            <Image
              src={data!.image!.src}
              alt={data!.image!.alt || "Hero image"}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2B2B2B]/10 to-transparent" />
          </motion.div>
        )}

        {(data?.contact?.location || data?.contact?.phone) && (
          <motion.div
            {...fadeUp(0.5)}
            className="flex flex-wrap gap-6 justify-center mt-10 text-sm text-[#9E7E6E]"
          >
            {data!.contact!.location && (
              <span className="flex items-center gap-1.5">
                <LocationIcon />
                {data!.contact!.location}
              </span>
            )}
            {data!.contact!.phone && (
              <Link
                href={`tel:${data!.contact!.phone}`}
                className="flex items-center gap-1.5 hover:text-[#C9A990] transition-colors"
              >
                <PhoneIcon />
                {data!.contact!.phone}
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}

function LocationIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" />
    </svg>
  );
}
