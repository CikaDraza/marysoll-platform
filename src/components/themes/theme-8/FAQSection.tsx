"use client";

import { useState } from "react";
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
      "A new set takes 1.5–2.5 hours depending on the style. Relax, nap, or fully switch off — the seat is yours.",
  },
  {
    question: "How often do I need refills?",
    answer:
      "Every 2–3 weeks to keep your set full. Most clients book a standing appointment so their slot is always saved.",
  },
  {
    question: "How should I prepare?",
    answer:
      "Arrive with clean, makeup-free lashes and skip the caffeine if you can — it helps you stay relaxed and still.",
  },
  {
    question: "Are extensions safe for my natural lashes?",
    answer:
      "Yes. Every set is mapped to your natural lash health and applied with medical-grade adhesive.",
  },
];

export function Theme8FAQSection({ items, headline, supportText }: Props) {
  const faqs = items && items.length > 0 ? items : DEFAULT_FAQS;
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="relative max-w-[980px] mx-auto my-28 px-5">
      <FadeUp>
        <div className="relative w-full rotate-[-1deg]">
          <div className="absolute -inset-2.5 bg-y2k-paper [filter:url(#y2k-torn2)] shadow-[0_24px_56px_rgba(20,0,30,0.4)]" />
          <div className="relative w-full px-6 sm:px-10 py-9">
            <div className="text-center mb-6">
              <span className="inline-block font-extrabold text-[12px] tracking-[0.24em] uppercase text-y2k-pink">
                Q&amp;A
              </span>
              <h2 className="mt-1.5 font-bagel text-[clamp(36px,5.5vw,64px)] leading-[0.92] text-y2k-ink">
                {headline || "GOOD TO KNOW"}
              </h2>
              {supportText && (
                <p className="mt-3 text-[15px] text-[#42303a] font-medium max-w-lg mx-auto">
                  {supportText}
                </p>
              )}
            </div>

            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div
                  key={i}
                  className="w-full border-t-2 border-y2k-ink/15 last:border-b-2"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-3.5 py-[18px] text-left group"
                  >
                    <span className="font-extrabold text-[19px] text-y2k-ink group-hover:text-y2k-pink transition-colors">
                      {f.question}
                    </span>
                    <span
                      className={`shrink-0 grid place-items-center w-8 h-8 border-[3px] border-y2k-ink rounded-full text-[18px] transition-all duration-300 ${
                        isOpen
                          ? "rotate-[135deg] bg-y2k-pink text-white"
                          : "text-y2k-ink"
                      }`}
                    >
                      +
                    </span>
                  </button>
                  {/* Real accordion: full-width grid row animates 0fr → 1fr.
                      Width never changes; the panel stays mounted (no display:none). */}
                  <div
                    className={`grid w-full transition-all duration-[450ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="text-[16px] leading-[1.6] text-[#42303a] font-medium pb-[18px]">
                        {f.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
