"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { FadeUp } from "../FadeUp";
import { useTheme8TestimonialsPager } from "@/hooks/useTheme8TestimonialsPager";
import type { PublicTestimonial } from "@/types/public-testimonials";

interface Card {
  quote: string;
  name: string;
  meta: string;
  initial: string;
  rating: number;
  reply?: string;
}

interface Theme8TestimonialCarouselProps {
  tenantSlug?: string;
  initialTestimonials: PublicTestimonial[];
  initialHasMore: boolean;
}

const DEFAULT_CARDS: Card[] = [
  {
    quote: "Zaustavljaju me na ulici. Anja je bukvalno umetnica.",
    name: "Mila K.",
    meta: "Volume Set",
    initial: "M",
    rating: 5,
  },
  {
    quote:
      "Malo ružičasto utočište. Svaki put odlazim izgledajući neverovatno.",
    name: "Sara D.",
    meta: "Hybrid Set",
    initial: "S",
    rating: 5,
  },
  {
    quote: "Šest meseci sam klijent & nikada više nigde. Savršeno.",
    name: "Lena P.",
    meta: "Lash Lift",
    initial: "L",
    rating: 5,
  },
];

const CARD_STYLES = [
  "rounded-[8px_22px_8px_22px] shadow-[6px_8px_0_#ff2e97] rotate-[-2deg]",
  "rounded-[22px_8px_22px_8px] shadow-[6px_8px_0_#8B16C9] rotate-[1.5deg]",
  "rounded-[8px_22px_8px_22px] shadow-[6px_8px_0_#ff2e97] rotate-[-1.5deg]",
];
const AVATAR_BG = ["bg-y2k-hot", "bg-[#c9a8ff]", "bg-[#ffb3df]"];

function toCard(testimonial: PublicTestimonial): Card {
  const name = testimonial.clientName.trim() || "Klijent";
  return {
    quote: testimonial.comment,
    name,
    meta: "Klijent",
    initial: name.charAt(0).toUpperCase(),
    rating: testimonial.rating,
    reply: testimonial.adminReply?.trim() || undefined,
  };
}

export function Theme8TestimonialCarousel({
  tenantSlug,
  initialTestimonials,
  initialHasMore,
}: Theme8TestimonialCarouselProps) {
  const { firstPage, getCachedPage, loadPage } =
    useTheme8TestimonialsPager({
      tenantSlug,
      initialTestimonials,
      initialHasMore,
    });
  const [page, setPage] = useState(0);
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);

  const currentData =
    (page === 0 ? firstPage : getCachedPage(page)) ?? firstPage;
  const hasRealInitialTestimonials = initialTestimonials.length > 0;
  const usesFallbackCards = page === 0 && !hasRealInitialTestimonials;
  const cards = usesFallbackCards
    ? DEFAULT_CARDS
    : currentData.testimonials.map(toCard);
  const canUseCarousel = hasRealInitialTestimonials || initialHasMore;
  const canGoNext =
    canUseCarousel && page === 0 && currentData.hasMore;
  const canGoPrevious = canUseCarousel && page === 1;
  const canSwipe = canGoNext || canGoPrevious;

  const moveToPage = useCallback(
    async (nextPage: 0 | 1) => {
      if (loadingPage !== null || nextPage === page) return;
      if ((nextPage === 1 && !canGoNext) || (nextPage === 0 && !canGoPrevious)) {
        return;
      }

      setDirection(nextPage > page ? 1 : -1);
      if (getCachedPage(nextPage)) {
        setPage(nextPage);
        return;
      }

      setLoadingPage(nextPage);
      try {
        const loadedPage = await loadPage(nextPage);
        if (loadedPage.testimonials.length === 0) {
          toast("Nema više novijih utisaka.");
          return;
        }
        setPage(nextPage);
      } catch {
        toast.error("Utisci trenutno ne mogu da se učitaju. Pokušajte ponovo.");
      } finally {
        setLoadingPage(null);
      }
    },
    [
      canGoNext,
      canGoPrevious,
      getCachedPage,
      loadPage,
      loadingPage,
      page,
    ],
  );

  const onDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
      const movedFarEnough = Math.abs(info.offset.x) > 70 || Math.abs(info.velocity.x) > 450;
      if (!movedFarEnough) return;
      if (info.offset.x < 0) {
        void moveToPage(1);
      } else {
        void moveToPage(0);
      }
    },
    [moveToPage],
  );

  return (
    <div className="relative" aria-live="polite">
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        {loadingPage !== null ? (
          <motion.div
            key={`loading-${loadingPage}`}
            initial={{ opacity: 0, scale: 0.82, y: 10 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.82, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="grid min-h-[260px] place-items-center"
            aria-label="Učitavanje novih utisaka"
          >
            <motion.svg
              viewBox="0 0 24 24"
              animate={{ scale: [0.9, 1.045, 0.94, 1] }}
              transition={{
                duration: 1.45,
                repeat: Infinity,
                ease: [0.42, 0, 0.58, 1],
              }}
              className="h-44 w-44 transform-gpu will-change-transform drop-shadow-[8px_9px_0_#8B16C9]"
              aria-hidden="true"
            >
              <path
                d="M12 21.35 10.55 20C5.4 15.36 2 12.19 2 8.3 2 5.12 4.42 2.7 7.6 2.7c1.8 0 3.53.84 4.4 2.17A5.31 5.31 0 0 1 16.4 2.7C19.58 2.7 22 5.12 22 8.3c0 3.89-3.4 7.06-8.55 11.71L12 21.35Z"
                fill="#ff2e97"
                stroke="#0b0b0f"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <path
                d="M7.1 6.35c.8-.86 2.18-1.02 3.16-.39"
                fill="none"
                stroke="#fff"
                strokeLinecap="round"
                strokeWidth="1.05"
                opacity=".82"
              />
            </motion.svg>
          </motion.div>
        ) : (
          <motion.div
            key={`testimonials-${page}`}
            custom={direction}
            initial="enter"
            animate="center"
            exit="exit"
            variants={{
              enter: (slideDirection: number) => ({
                opacity: 0,
                x: slideDirection > 0 ? 90 : -90,
                scale: 0.96,
              }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (slideDirection: number) => ({
                opacity: 0,
                x: slideDirection > 0 ? -90 : 90,
                scale: 0.96,
              }),
            }}
            transition={{ type: "spring", stiffness: 290, damping: 28 }}
            drag={canSwipe ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            className={
              canSwipe
                ? "grid md:grid-cols-3 gap-[22px] cursor-grab active:cursor-grabbing touch-pan-y"
                : "grid md:grid-cols-3 gap-[22px]"
            }
          >
            {cards.map((card, index) => (
              <FadeUp key={`${page}-${card.name}-${index}`} delay={index * 0.08}>
                <figure
                  className={`h-full bg-white border-[3px] border-y2k-ink p-6 ${
                    CARD_STYLES[index % CARD_STYLES.length]
                  }`}
                >
                  <div className="text-y2k-pink text-[18px] tracking-[2px]">
                    {"★".repeat(Math.max(0, Math.min(5, card.rating)))}
                    <span className="text-y2k-ink/15">
                      {"★".repeat(5 - Math.max(0, Math.min(5, card.rating)))}
                    </span>
                  </div>
                  <blockquote className="font-caveat font-bold text-[26px] leading-[1.2] my-2.5 mb-4 text-y2k-ink">
                    &ldquo;{card.quote}&rdquo;
                  </blockquote>
                  {card.reply && (
                    <div className="mb-4 border-2 border-dashed border-y2k-pink bg-y2k-pink/10 px-3 py-2.5 text-y2k-ink">
                      <span className="block text-[10px] font-extrabold tracking-[0.16em] text-y2k-pink">
                        ODGOVOR SALONA
                      </span>
                      <p className="mt-1 font-caveat text-[20px] font-bold leading-[1.05]">
                        &ldquo;{card.reply}&rdquo;
                      </p>
                    </div>
                  )}
                  <figcaption className="flex items-center gap-2.5">
                    <span
                      className={`grid place-items-center w-10 h-10 rounded-full border-2 border-y2k-ink font-extrabold text-y2k-ink ${
                        AVATAR_BG[index % AVATAR_BG.length]
                      }`}
                    >
                      {card.initial}
                    </span>
                    <span className="font-extrabold text-[14px] text-y2k-ink">
                      {card.name}
                      <span className="block font-medium text-[#7a5a6c]">
                        {card.meta}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </FadeUp>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
