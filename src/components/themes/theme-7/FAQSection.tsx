"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FadeUp } from "./FadeUp";

interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  items?: FaqItem[];
  headline?: string;
  supportText?: string;
}

const DEFAULT_FAQS: FaqItem[] = [
  {
    question: "How long does a full set take?",
    answer:
      "A new set takes 1.5–2.5 hours depending on the style. You are welcome to relax, nap, or simply switch off.",
  },
  {
    question: "How often do I need refills?",
    answer:
      "Every 2–3 weeks to keep your set looking full. Most clients book a standing appointment.",
  },
  {
    question: "How should I prepare?",
    answer:
      "Arrive with clean, makeup-free lashes and avoid caffeine if you can — it helps you stay relaxed and still.",
  },
  {
    question: "Are the lashes safe for my natural lashes?",
    answer:
      "Yes. Every set is mapped to your natural lash health and applied with medical-grade adhesive.",
  },
  {
    question: "What is your cancellation policy?",
    answer:
      "Please give at least 24 hours notice. Late cancellations may be subject to a fee.",
  },
];

export function Theme7FAQSection({ items, headline, supportText }: Props) {
  const faqs = items && items.length > 0 ? items : DEFAULT_FAQS;
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-cream/60">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-28 lg:py-36">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          <FadeUp className="lg:col-span-4">
            <p className="flex items-center gap-3 text-[12px] uppercase tracking-[0.3em] text-neon mb-5">
              <span className="h-px w-10 bg-neon" /> Q&amp;A
            </p>
            <h2 className="font-cormorant text-5xl lg:text-6xl leading-[0.98] tracking-[-0.01em]">
              {headline || "Good to know."}
            </h2>
            <p className="mt-6 text-ink/55">
              {supportText ||
                "Still unsure? Send a DM on Instagram and Anja will help you choose."}
            </p>
          </FadeUp>

          <FadeUp className="lg:col-span-8" delay={0.1}>
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className="border-b border-ink/10">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-6 py-6 text-left group"
                  >
                    <span className="font-cormorant text-xl lg:text-2xl group-hover:text-neon transition-colors">
                      {f.question}
                    </span>
                    <span
                      className={`shrink-0 grid place-items-center h-9 w-9 rounded-full border text-xl transition-transform duration-300 ${
                        isOpen
                          ? "rotate-45 bg-neon border-neon text-white"
                          : "border-ink/15 text-ink/50"
                      }`}
                    >
                      +
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="text-ink/60 leading-relaxed pr-8 pb-6">
                          {f.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
