"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import type { MarketingSecondaryContent } from "@/types/marketing-landing";
import { FAQ_FALLBACK } from "@/lib/marketing-landing-defaults";

// ============================================
// ANIMATION VARIANTS
// ============================================
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const bubblePop: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 20 },
  },
};

// Badge stil kao u Hero/About sekciji (DEO 1)
const badgeClass =
  "w-auto items-center rounded-md bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-600 inset-ring inset-ring-purple-700/10";

const sectionHeadingClass =
  "text-3xl lg:text-4xl font-bold text-gray-900 text-center";

/**
 * DEO 2 — Secondary Content (SEO funnel + edukacija + uklanjanje straha).
 * Klijentska komponenta: sve animirane sekcije ispod postojećeg Second hero-a.
 */
export function SecondaryContent({
  secondary,
}: {
  secondary: MarketingSecondaryContent;
}) {
  if (!secondary.enabled) return null;

  const { hero, chips, objections, notebook, app, cancellations, automation, faq } =
    secondary;

  return (
    <>
      {/* ============================================ HERO 2 ============================================ */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-12 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {hero.eyebrow && (
            <motion.span
              variants={fadeInUp}
              className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium"
            >
              <span className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              {hero.eyebrow}
            </motion.span>
          )}

          <motion.h2
            variants={fadeInUp}
            className="mt-6 text-4xl lg:text-7xl font-bold text-gray-900 leading-tight heading-font"
          >
            {hero.headline}
          </motion.h2>

          {hero.paragraph && (
            <motion.p
              variants={fadeInUp}
              className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto"
            >
              {hero.paragraph}
            </motion.p>
          )}

          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            {hero.ctaPrimaryText && (
              <Link
                href={hero.ctaPrimaryHref || "/register"}
                className="bg-violet-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-violet-700 transition shadow-lg shadow-violet-200"
              >
                {hero.ctaPrimaryText}
              </Link>
            )}
            {hero.ctaSecondaryText && (
              <Link
                href={hero.ctaSecondaryHref || "/pricing"}
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
              >
                {hero.ctaSecondaryText}
              </Link>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================ CHIPS NAVIGACIJA ============================================ */}
      {chips.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="flex flex-wrap justify-center gap-2"
          >
            {chips.map((chip) => (
              <motion.li key={chip.text} variants={fadeInUp}>
                <a
                  href={chip.href || "#"}
                  className={`${badgeClass} flex items-center gap-2 transition hover:bg-violet-100`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                  {chip.text}
                </a>
              </motion.li>
            ))}
          </motion.ul>
        </section>
      )}

      {/* ============================================ SEKCIJA 1 — OBJECTIONS ============================================ */}
      <section
        id="online-zakazivanje"
        className="scroll-mt-24 py-20 bg-gray-50"
      >
        <div className="max-w-5xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${sectionHeadingClass} mb-8`}
          >
            {objections.headline}
          </motion.h2>

          {objections.lead && (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center text-gray-500 mb-6"
            >
              {objections.lead}
            </motion.p>
          )}

          {objections.bubbles.length > 0 && (
            <motion.ul
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="flex flex-col items-center gap-3 mb-10"
            >
              {objections.bubbles.map((bubble) => (
                <motion.li
                  key={bubble}
                  variants={bubblePop}
                  className={`${badgeClass} text-base`}
                >
                  {bubble}
                </motion.li>
              ))}
            </motion.ul>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto space-y-4 text-lg text-gray-600 leading-relaxed text-center"
          >
            {objections.paragraphs.map((paragraph, i) => (
              <p key={`${i}-${paragraph.slice(0, 12)}`}>{paragraph}</p>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================ SEKCIJA 2 — NOTEBOOK ============================================ */}
      <section id="sveska-ili-kalendar" className="scroll-mt-24 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={sectionHeadingClass}
          >
            {notebook.headline}
          </motion.h2>

          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mt-8 space-y-3"
          >
            {notebook.items.map((item) => (
              <motion.li
                key={item}
                variants={fadeInUp}
                className="flex items-start gap-3 text-lg text-gray-600 leading-relaxed"
              >
                <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ============================================ SEKCIJA 3 — APP ============================================ */}
      <section id="gledam-aplikaciju" className="scroll-mt-24 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={sectionHeadingClass}
          >
            {app.headline}
          </motion.h2>

          <div className="mt-10 space-y-6">
            {app.topics.map((topic, i) => (
              <motion.div
                key={topic.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <h3 className="text-lg font-bold text-gray-900">
                  {topic.title}
                </h3>
                <p className="mt-1 text-gray-600 leading-relaxed">
                  {topic.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ SEKCIJA 4 — CANCELLATIONS ============================================ */}
      <section id="otkazivanja" className="scroll-mt-24 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={sectionHeadingClass}
          >
            {cancellations.headline}
          </motion.h2>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mt-8 space-y-4 text-lg leading-relaxed text-center"
          >
            {cancellations.paragraphs.map((paragraph, i) => (
              <motion.p
                key={`${i}-${paragraph.slice(0, 12)}`}
                variants={fadeInUp}
                className={
                  i % 2 === 0
                    ? "text-violet-600 font-semibold"
                    : "text-gray-500"
                }
              >
                {paragraph}
              </motion.p>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================ SEKCIJA 5 — AUTOMATION ============================================ */}
      <section id="automatizacija" className="scroll-mt-24 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          {automation.headline && (
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={sectionHeadingClass}
            >
              {automation.headline}
            </motion.h2>
          )}

          <div className="mt-10 grid md:grid-cols-2 gap-6">
            {automation.items.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>

          {automation.assistantExample.lines.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 max-w-md mx-auto bg-gray-900 rounded-2xl p-6 shadow-lg"
            >
              {automation.assistantExample.question && (
                <p className="text-gray-300 text-sm mb-4">
                  🎙️ {automation.assistantExample.question}
                </p>
              )}
              <div className="bg-gray-800 rounded-xl p-4">
                {automation.assistantExample.replyTitle && (
                  <p className="text-violet-300 font-semibold mb-2">
                    {automation.assistantExample.replyTitle}
                  </p>
                )}
                <ul className="space-y-1">
                  {automation.assistantExample.lines.map((line, i) => (
                    <li
                      key={`${i}-${line}`}
                      className="text-gray-100 text-sm flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ============================================ FAQ ============================================ */}
      <section id="faq" className="scroll-mt-24 py-24">
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={sectionHeadingClass}
          >
            {faq.headline}
          </motion.h2>

          {faq.paragraph && (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-3 text-center text-gray-500"
            >
              {faq.paragraph}
            </motion.p>
          )}

          <div className="mt-10 space-y-6">
            {faq.items.map((item, i) => (
              <motion.div
                key={item.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <h3 className="text-lg font-bold text-gray-900">
                  {item.question}
                </h3>
                {(item.answer.trim() || FAQ_FALLBACK)
                  .split("\n")
                  .map((line, j) => (
                    <p
                      key={`${i}-${j}`}
                      className="mt-1 text-gray-600 leading-relaxed"
                    >
                      {line}
                    </p>
                  ))}
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
