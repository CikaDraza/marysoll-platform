"use client";

import { motion } from "framer-motion";
import type { AboutTextLink } from "@/types";
import { renderLinkedText } from "@/helpers/renderLinkedText";

interface Stat {
  value: string;
  label: string;
}

interface Props {
  title?: string;
  text?: string[] | string;
  links?: AboutTextLink[];
  imageUrl?: string;
  stats?: Stat[];
}

export function Theme2AboutSplit({ title, text, links = [], imageUrl, stats }: Props) {
  const paragraphs = Array.isArray(text) ? text : [text];
  return (
    <section className="w-full min-h-screen flex flex-col lg:flex-row bg-black text-white">
      {/* IMAGE */}
      <div className="relative lg:order-2 w-full lg:w-2/5 flex items-center justify-center px-6 py-12 lg:py-0">
        <div className="lg:pr-6">
          <div className="absolute w-64 h-64 bg-yellow-500 rounded-full -z-10 top-10 left-10 blur-2xl opacity-20" />

          <motion.img
            src={imageUrl || "/image_missing.png"}
            alt="About us image"
            className="w-full h-[500px] object-cover rounded-xl"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
          />
        </div>
      </div>

      {/* TEXT */}
      <div className="lg:order-1 relative w-full lg:w-3/5 min-h-[60vh] lg:h-auto overflow-hidden flex items-center justify-center px-6 py-12 lg:py-0">
        <div className="px-6 py-8 max-w-4xl">
          {/* Zaključana žuta — theme-2 je tamna tema i brend boje se na njoj ne
              mogu pouzdano uskladiti (primary sme biti i crn). Ista žuta kao
              eyebrow u WhatOffer i akcenti u Footer-u. */}
          <p className="text-yellow-400 uppercase tracking-[0.3em] text-xs mb-4">
            O meni
          </p>

          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            {title || "Gde sve počinje"}
          </h2>

          <p className="text-gray-300 leading-relaxed">
            {renderLinkedText(
              paragraphs[0] ||
                "Naš salon kombinuje iskustvo, estetiku i preciznost kako bismo pružili vrhunske rezultate svakom klijentu.",
              links,
            )}
          </p>
          <p className="text-gray-300 leading-relaxed pt-4">
            {renderLinkedText(paragraphs[1] || "", links)}
          </p>
          {stats && stats.length > 0 && (
            <div className="flex gap-10 mt-8">
              {stats.map((s, i) => (
                <div key={i}>
                  {/* Zaključana žuta, isto kao eyebrow: brend primary sme biti
                      crn (#000000), pa je broj na bg-black bio nevidljiv. */}
                  <div className="text-2xl font-bold text-yellow-400">{s.value}</div>
                  <div className="text-sm text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
