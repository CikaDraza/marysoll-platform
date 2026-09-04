"use client";

/**
 * BookingLauncher — Hero CTA („Zakaži odmah") otvara BookingWidget u modalu.
 *
 * Isti obrazac koji theme-8 ima kroz `Theme8ModalProvider`, samo generički za
 * ostale teme: klik na CTA podiže kalendar u pop-up-u, klijentkinja bira
 * slobodan termin, i tek taj klik otvara unutrašnji modal za zakazivanje
 * (Headless UI, z-50) — koji zato mora da stoji IZNAD ovog (z-40).
 *
 * Widget se ne zna unapred (standardni vs. Y2K), pa sekcija sa kalendarom
 * registruje funkciju koja ga renderuje. Ako ništa nije registrovano,
 * `available` je false i CTA ostaje običan link na /termini.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type WidgetRenderer = () => ReactNode;

interface BookingLauncherCtx {
  open: () => void;
  close: () => void;
  available: boolean;
  register: (render: WidgetRenderer) => () => void;
}

const BookingLauncherContext = createContext<BookingLauncherCtx>({
  open: () => {},
  close: () => {},
  available: false,
  register: () => () => {},
});

export function useBookingLauncher(): BookingLauncherCtx {
  return useContext(BookingLauncherContext);
}

export function BookingLauncherProvider({ children }: { children: ReactNode }) {
  // Renderer stoji u state-u, ne u ref-u: modal ga čita TOKOM rendera, pa bi
  // ref bio i nevidljiv za React i prijavljen kao greška.
  const [renderer, setRenderer] = useState<WidgetRenderer | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const register = useCallback((render: WidgetRenderer) => {
    setRenderer(() => render);
    return () => {
      // Odjavi SAMO svoju registraciju — instanca koja se demontira ne sme da
      // obriše tuđu.
      setRenderer((current) => (current === render ? null : current));
    };
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Nestao widget → nema šta da se prikaže. Izvedeno, ne kroz efekat, da
  // zatvaranje ne bi kasnilo jedan render.
  const showModal = isOpen && renderer !== null;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Strana ispod ne sme da se skroluje dok je kalendar podignut.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const value = useMemo(
    () => ({ open, close, available: renderer !== null, register }),
    [open, close, renderer, register],
  );

  return (
    <BookingLauncherContext.Provider value={value}>
      {children}
      {showModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Zakazivanje termina"
            className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={close}
            />
            <div className="relative z-[1] w-full max-w-2xl my-auto">
              <button
                type="button"
                onClick={close}
                aria-label="Zatvori"
                className="absolute -top-3 -right-3 z-20 grid place-items-center w-10 h-10 rounded-full bg-white text-gray-700 text-xl font-bold leading-none shadow-lg border border-gray-200 hover:bg-gray-100 transition"
              >
                ×
              </button>
              {renderer?.()}
            </div>
          </div>,
          document.body,
        )}
    </BookingLauncherContext.Provider>
  );
}
