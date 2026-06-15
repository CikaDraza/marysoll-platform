"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { MarketingBookingSection } from "@/types/marketing-landing";

/**
 * Marysoll Booking — promo sekcija (booking.marysoll.com)
 * Renderuje se na marketing homepage-u, odmah ispod galerije.
 * Dva dela: (1) promo + video, (2) "Kako vas novi klijenti pronalaze" flow.
 */
export function BookingDiscoverySection({
  booking,
}: {
  booking: MarketingBookingSection;
}) {
  if (!booking?.enabled) return null;

  return (
    <>
      {/* Sekcija 1 — promo + video */}
      <section id="booking-promo" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Tekst */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span className="inline-block bg-purple-50 text-purple-600 px-3 py-1.5 rounded-md text-sm font-medium mb-4">
                Marysoll Booking
              </span>
              <h2 className="text-4xl! font-bold text-gray-800 mb-6">
                {booking.headline}
              </h2>
              {booking.intro && (
                <p className="text-gray-600 text-lg mb-5">{booking.intro}</p>
              )}
              {booking.searchExamples.length > 0 && (
                <ul className="flex flex-wrap gap-2 mb-6">
                  {booking.searchExamples.map((example, i) => (
                    <li
                      key={i}
                      className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium"
                    >
                      {example}
                    </li>
                  ))}
                </ul>
              )}
              {booking.closing && (
                <p className="text-gray-700 leading-relaxed mb-8">
                  {booking.closing}
                </p>
              )}
              <Link
                href={booking.ctaHref}
                className="inline-flex items-center bg-purple-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition shadow-xl shadow-purple-200"
              >
                {booking.ctaText} →
              </Link>
            </motion.div>

            {/* Video */}
            {booking.videoUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <video
                  src={booking.videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Sekcija 2 — discovery flow */}
      <section id="booking-discovery" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl! font-bold text-center text-gray-800 mb-12">
            {booking.discoveryHeadline}
          </h2>

          <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-2">
            {booking.discoveryCards.map((card, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                  className="w-full md:w-56 bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
                >
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <p className="text-gray-900 font-semibold mb-1">
                    {card.title}
                  </p>
                  <p className="text-gray-500 text-sm">{card.description}</p>
                </motion.div>
                {i < booking.discoveryCards.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="text-2xl text-purple-400 my-2 md:my-0 md:mx-1"
                  >
                    <span className="md:hidden">↓</span>
                    <span className="hidden md:inline">→</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href={booking.discoveryCtaHref}
              className="inline-flex items-center bg-purple-600 text-white px-10 py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition shadow-xl shadow-purple-200"
            >
              {booking.discoveryCtaText} →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
