"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PlatformNewsletterForm from "./PlatformNewsletterForm";

const SESSION_KEY = "marysoll_exit_newsletter_shown"; // jednom po sesiji
const DISMISS_KEY = "marysoll_exit_newsletter_done"; // trajno (pretplata)

const BENEFITS = [
  "Ekskluzivne promocije i popusti na planove",
  "Najave novih funkcija i unapređenja platforme",
  "Konkretni saveti za organizovaniji i profitabilniji salon",
];

/**
 * Exit-intent modal sa newsletter prijavom za platformu.
 * Okida se kada korisnik krene da napusti stranicu (kursor izađe na vrhu),
 * najviše jednom po sesiji; trajno se gasi nakon uspešne pretplate.
 */
export function ExitIntentNewsletterModal() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const markDoneForever = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* ignore */
    }

    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setOpen(true);
    };

    // Desktop: kursor napušta viewport na vrhu
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) trigger();
    };

    // Mobilni fallback: nakon dužeg boravka, na brzi scroll ka vrhu
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < lastY - 60 && y < 200) trigger();
      lastY = y;
    };

    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Pretplata na Marysoll bilten"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-(--color-brand-900) shadow-2xl ring-1 ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              aria-label="Zatvori"
              className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 p-8 sm:p-12">
              {/* Leva strana — newsletter prijava */}
              <div>
                <span className="inline-block bg-violet-500/15 text-violet-300 px-3 py-1.5 rounded-md text-xs font-semibold mb-4">
                  Marysoll bilten
                </span>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                  Stani 👋 Pretplati se na naš bilten
                </h2>
                <p className="mt-4 text-sm text-gray-300">
                  Pre nego što odeš — ostavi email i budi prvi koji saznaje šta je
                  novo na platformi.
                </p>
                <PlatformNewsletterForm onSuccess={markDoneForever} />
                <p className="mt-4 text-xs text-gray-400">
                  Šaljemo verifikacioni email — potvrdi pretplatu jednim klikom.
                  Odjava u svakom trenutku.
                </p>
              </div>

              {/* Desna strana — šta se dobija */}
              <div className="md:border-l md:border-white/10 md:pl-10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-violet-300">
                  Šta dobijaš
                </h3>
                <ul className="mt-5 space-y-4">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-violet-500/20 text-violet-300 text-xs">
                        ✓
                      </span>
                      <span className="text-sm text-gray-200 leading-relaxed">
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
