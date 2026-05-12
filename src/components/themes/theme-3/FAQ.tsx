"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

interface Props {
  items?: FAQItem[];
  headline?: string;
}

export function Theme3FAQSoft({ items = [], headline }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!items.length) return null;

  return (
    <section className="py-24 bg-[#FAF8F5]">
      <div className="max-w-3xl mx-auto px-6">
        {/* Title */}
        <h2 className="text-4xl font-semibold text-center text-[#2d2d2d] mb-12">
          {headline || "Često postavljena pitanja"}
        </h2>

        <div className="space-y-4">
          {items.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="border border-[#e5e2dc] rounded-2xl bg-white"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full text-left px-6 py-5 flex justify-between items-center"
                >
                  <span className="text-lg font-medium text-[#2d2d2d]">
                    {item.question}
                  </span>

                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="text-xl text-[#bfa37a] shrink-0 ml-4 origin-center"
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="px-6 pb-5 text-[#6b6b6b]">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
