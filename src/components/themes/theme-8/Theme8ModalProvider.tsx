"use client";

/**
 * Theme8ModalProvider — centered pop-in modals for the Y2K theme.
 *
 * Holds which modal is open ("book" = appointment widget, "bilten" = newsletter)
 * and exposes open()/close() via context so the Hero CTA and Footer buttons can
 * trigger them. Modals are portaled to <body> at z-40 so they sit above all page
 * content but BELOW the inner BookingModal confirm dialog (Headless UI, z-50),
 * which the appointment widget opens on top when a slot is picked.
 *
 * Enter/exit animation mirrors the design prototype's `lrpop`
 * (opacity 0 + translateY(24px) scale(.96) → settle, .42s) plus a backdrop fade.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
// createPortal is guarded by a typeof-document check below (no SSR call).
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { IService, SalonProfileData } from "@/types";
import { PENDING_STORAGE_KEY } from "@/components/shared/BookingModal";
import { Theme8ModalContext, type ModalName } from "./theme8ModalContext";
import { Y2KBookingCard } from "../shared/Y2KBookingCard";
import { Y2KNewsletterWidget } from "../shared/Y2KNewsletterWidget";
import { SprayReveal } from "./motion/SprayReveal";
import { Theme8CelebrationOverlay } from "./Theme8CelebrationOverlay";

// Sprite sheet "Hvala" lika — grid 6×2 (12 frejmova), red-major.
// PNG: public/images/theme-8/celebration-sheet.png (1080×700, frame 180×350).
// 1-3 @240ms, NAMIG (4. frejm) @650ms, 5-12 @90ms; jednom pa drži poslednji.
// Test prekidač: kad je true, zahvalnica se prikaže odmah na load (bez bukiranja).
// U produkciji vrati na false — triggeruje se samo na uspešno zakazivanje.
const TEST_ALWAYS_SHOW_CELEBRATION = false;

const CELEBRATION_SPRITE = {
  src: "/images/theme-8/celebration-sheet.png",
  frameWidth: 180,
  frameHeight: 350,
  columns: 6,
  rows: 2,
  frames: 12,
  loop: false,
  frameDurations: [150, 150, 150, 800, 150, 150, 150, 150, 150, 150, 150, 150],
};

interface BookingData {
  tenantSlug?: string;
  clientSlug?: string;
  salon: SalonProfileData;
  services: IService[];
}

interface Props {
  children: ReactNode;
  booking: BookingData;
}

export function Theme8ModalProvider({ children, booking }: Props) {
  const [active, setActive] = useState<ModalName | null>(null);
  const [celebrating, setCelebrating] = useState(TEST_ALWAYS_SHOW_CELEBRATION);

  const open = useCallback((name: ModalName) => setActive(name), []);
  const close = useCallback(() => setActive(null), []);
  // Zatvori booking modal, pa pusti zahvalnicu preko cele strane.
  const celebrate = useCallback(() => {
    setActive(null);
    setCelebrating(true);
  }, []);

  // After a guest logs in and returns home, auto-open the booking modal so the
  // widget mounts and its own pending-restore effect re-opens the confirm dialog.
  // (async wrapper defers the setState off the effect body.)
  useEffect(() => {
    async function maybeOpenPending() {
      try {
        if (sessionStorage.getItem(PENDING_STORAGE_KEY)) setActive("book");
      } catch {
        /* ignore */
      }
    }
    maybeOpenPending();
  }, []);

  // Lock body scroll while a modal is open.
  useEffect(() => {
    if (!active) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [active]);

  // Close on Escape.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  const maxWidth = active === "book" ? "max-w-[640px]" : "max-w-[460px]";

  return (
    <Theme8ModalContext.Provider value={{ open, close, celebrate }}>
      {children}
      <Theme8CelebrationOverlay
        open={celebrating}
        onClose={() => setCelebrating(false)}
        sprite={CELEBRATION_SPRITE}
        autoDismissMs={TEST_ALWAYS_SHOW_CELEBRATION ? 0 : undefined}
      />
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {active && (
              <motion.div
                key={active}
                className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:p-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                role="dialog"
                aria-modal="true"
              >
                {/* backdrop */}
                <div
                  className="fixed inset-0 bg-y2k-plum/60 backdrop-blur-md"
                  onClick={close}
                />
                {/* animated card */}
                <motion.div
                  className={`relative z-[1] w-full my-auto ${maxWidth}`}
                  initial={{ opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 24, scale: 0.96 }}
                  transition={{ duration: 0.42, ease: [0.2, 0.85, 0.25, 1] }}
                >
                  {/* graffiti spray that sprays in behind the card on open:
                      heart for booking, flower for the newsletter */}
                  <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 z-0">
                    <SprayReveal
                      src={
                        active === "book"
                          ? "/images/theme-8/spray/heart-spray-1.svg"
                          : "/images/theme-8/spray/flower-spray.svg"
                      }
                      color={active === "book" ? "pink" : "hot"}
                      size={190}
                      opacity={0.85}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Zatvori"
                    className="absolute -top-3 -right-3 z-20 grid place-items-center w-10 h-10 rounded-full border-[3px] border-y2k-ink bg-white text-y2k-ink text-xl font-extrabold leading-none shadow-[3px_3px_0_#0b0b0f] hover:rotate-90 transition-transform duration-300"
                  >
                    ×
                  </button>
                  <div className="relative z-10">
                    {active === "book" ? (
                      <Y2KBookingCard
                        tenantSlug={booking.tenantSlug}
                        clientSlug={booking.clientSlug}
                        salon={booking.salon}
                        services={booking.services}
                      />
                    ) : (
                      <Y2KNewsletterWidget />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </Theme8ModalContext.Provider>
  );
}
