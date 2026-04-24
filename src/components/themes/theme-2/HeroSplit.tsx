"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface Theme2HeroSplitProps {
  imageUrl?: string;
  headline?: string;
  subheadline?: string;
  cta?: {
    primary: { text: string; href: string };
    secondary?: { text: string; href: string };
  };
  salonName?: string;
}

export function Theme2HeroSplit({
  imageUrl,
  headline,
  subheadline,
  cta,
  salonName,
}: Theme2HeroSplitProps) {
  return (
    <section className="w-full min-h-screen flex flex-col lg:flex-row bg-black text-white">
      {/* ── LEFT: IMAGE ───────────────────────────────────────── */}
      <div className="relative w-full lg:w-3/5 h-[60vh] lg:h-auto overflow-hidden">
        <motion.img
          src={
            imageUrl ||
            "https://res.cloudinary.com/dufo1t5li/image/upload/v1775746913/salons/salon-kiki-kiss/pvr9gnj8bs2ldr3z4xsk.png"
          }
          alt={`${salonName || "Salon"} luksuzni tretmani`}
          className="w-full h-full object-cover"
          initial={{ scale: 1 }}
          animate={{ scale: 1.05 }}
          transition={{ duration: 8, ease: "easeOut" }}
        />

        {/* Overlay gradient (luxury feel) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
      </div>

      {/* ── RIGHT: CONTENT ───────────────────────────────────── */}
      <div className="w-full lg:w-2/5 flex items-center justify-center px-6 py-12 lg:py-0">
        <div className="max-w-md w-full">
          {/* H1 — SEO critical */}
          <h1 className="text-3xl lg:text-5xl font-serif leading-tight mb-6">
            {headline || "Ekskluzivni tretmani za savršen izgled"}
          </h1>

          {/* H2 (subheadline) */}
          <p className="text-gray-300 text-base lg:text-lg mb-8">
            {subheadline ||
              "Personalizovana nega i profesionalni rezultati koji traju."}
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Primary CTA */}
            <Link
              href={cta?.primary?.href || "/termini"}
              className="px-6 py-3 text-center font-medium rounded-md bg-[var(--secondary-color)] text-black hover:opacity-90 transition"
            >
              {cta?.primary?.text || "Zakaži termin"}
            </Link>

            {/* Secondary CTA */}
            {cta?.secondary && (
              <a
                href={cta.secondary.href}
                className="px-6 py-3 text-center font-medium rounded-md border border-gray-600 hover:border-white transition"
              >
                {cta.secondary.text}
              </a>
            )}
          </div>

          {/* Micro trust line */}
          <p className="text-xs text-gray-500 mt-6">
            Profesionalna usluga • Vrhunski rezultati • Zadovoljni klijenti
          </p>
        </div>
      </div>
    </section>
  );
}
