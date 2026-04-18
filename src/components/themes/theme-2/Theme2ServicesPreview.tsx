"use client";

import { IService } from "@/types";
import { motion } from "framer-motion";
import Link from "next/link";

interface Theme2ServicesPreviewProps {
  services: IService[];
  headline?: string;
  subheadline?: string;
}

export function Theme2ServicesPreview({
  services,
  headline,
  subheadline,
}: Theme2ServicesPreviewProps) {
  const topServices = services.slice(0, 3);

  return (
    <section className="w-full bg-black text-white py-20 px-6">
      <div className="max-w-6xl mx-auto text-center">
        {/* ── Section Header ───────────────────────── */}
        <h2 className="text-3xl lg:text-4xl font-serif mb-4">
          {headline || "Naše najtraženije usluge"}
        </h2>

        <p className="text-gray-400 max-w-2xl mx-auto mb-14">
          {subheadline ||
            "Odabrani tretmani koji donose vidljive rezultate i vrhunski kvalitet usluge."}
        </p>

        {/* ── Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {topServices.map((service, index) => (
            <motion.div
              key={service._id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              viewport={{ once: true }}
              className="group relative border border-gray-800 rounded-xl p-6 bg-gradient-to-b from-gray-900 to-black hover:border-[var(--secondary-color)] transition duration-300"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_center,var(--secondary-color),transparent_70%)] blur-2xl" />

              {/* Content */}
              <div className="relative z-10">
                {/* Title */}
                <h3 className="text-xl font-semibold mb-3 group-hover:text-[var(--secondary-color)] transition">
                  {service.name}
                </h3>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-6 line-clamp-3">
                  {service.description ||
                    "Profesionalan tretman prilagođen vašim potrebama i željenim rezultatima."}
                </p>

                {/* Price (optional premium display) */}
                {service.price && (
                  <p className="text-lg font-medium text-[var(--secondary-color)]">
                    od {service.price} RSD
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── CTA ─────────────────────────────────── */}
        <div className="mt-14">
          <Link
            href="/usluge"
            className="inline-block px-8 py-3 border border-gray-600 rounded-md hover:border-[var(--secondary-color)] hover:text-[var(--secondary-color)] transition"
          >
            Pogledaj sve usluge
          </Link>
        </div>
      </div>
    </section>
  );
}
