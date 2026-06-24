"use client";

import { PhoneArrowUpRightIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Link from "next/link";
import { AnchorLink } from "../shared/AnchorLink";

interface Theme2Hero {
  imageUrl?: string;
  headline?: string;
  subheadline?: string;
  cta?: {
    primary: { text: string; href: string };
    secondary?: { text: string; href: string };
  };
  salonName?: string;
  salonDescription?: string;
  salonPhone?: string;
  salonCity?: string;
  salonStreet?: string;
}

export function Theme2Hero({
  imageUrl,
  headline,
  subheadline,
  cta,
  salonName,
  salonDescription,
  salonPhone,
  salonCity,
  salonStreet,
}: Theme2Hero) {
  return (
    <section className="w-full min-h-screen overflow-hidden flex flex-col lg:flex-row bg-black text-white">
      {/* ── LEFT: IMAGE ───────────────────────────────────────── */}
      <div className="relative w-full lg:w-3/5 max-h-screen lg:h-auto overflow-hidden">
        <motion.img
          src={
            imageUrl ||
            "https://res.cloudinary.com/dufo1t5li/image/upload/v1776466072/hero-shi-sham_ixxrrj.png"
          }
          alt={`${salonName || "Salon"} luksuzni tretmani`}
          className="w-full h-full object-contain lg:object-cover"
          initial={{ scale: 1 }}
          animate={{ scale: 1.25 }}
          transition={{ duration: 3, ease: "easeOut", delay: 1.25 }}
        />

        {/* Overlay gradient (luxury feel) */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
      </div>

      {/* ── RIGHT: CONTENT ───────────────────────────────────── */}
      <div className="w-full lg:w-2/5 flex items-center justify-center px-6 py-12 lg:py-0 lg:mt-40">
        <div className="max-w-xl w-full">
          <p className="text-yellow-400 text-xs font-bold tracking-[0.3em] uppercase mb-6">
            Premium Beauty Salon
          </p>
          {/* H1 — SEO critical */}
          <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-none">
            {headline || salonName || "Ekskluzivni tretmani za savršen izgled"}
          </h1>

          {/* H2 (subheadline) */}
          <p className="text-gray-300 text-base lg:text-lg mb-8">
            {subheadline ||
              salonDescription ||
              "Personalizovana nega i profesionalni rezultati koji traju."}
          </p>

          {/* CTA */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 justify-start">
              <AnchorLink
                href={cta?.primary?.href || "/termini"}
                className="px-10 py-4 bg-yellow-500 text-gray-950 font-black text-sm tracking-wider rounded hover:bg-yellow-400 transition shadow-2xl shadow-yellow-500/20"
              >
                {cta?.primary?.text || "ZAKAŽI TERMIN"}
              </AnchorLink>
              <AnchorLink
                href={cta?.secondary?.href || "/usluge"}
                className="px-10 py-4 border border-yellow-500/40 text-yellow-400 font-semibold text-sm tracking-wider rounded hover:border-yellow-400 hover:text-white transition"
              >
                {cta?.secondary?.text || "CENOVNIK"}
              </AnchorLink>
            </div>
            {(salonPhone || salonCity) && (
              <div className="mt-16 flex flex-wrap items-center justify-start gap-8 text-gray-600 text-sm border-t border-gray-800 pt-8">
                {salonPhone && (
                  <Link
                    href={`tel:${salonPhone}`}
                    className="relative flex items-center text-center lg:text-left group"
                  >
                    <PhoneArrowUpRightIcon className="size-5 text-white group-hover:text-(--primary-color) transition-colors" />
                    <span className="text-white group-hover:text-(--primary-color)">
                      {salonPhone}
                    </span>
                  </Link>
                )}
                {salonCity && (
                  <span>
                    📍 {[salonStreet, salonCity].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
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
