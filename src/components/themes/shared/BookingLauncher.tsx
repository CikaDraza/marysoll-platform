"use client";

/**
 * BookingLauncher — Hero CTA („Zakaži odmah") otvara BookingWidget bez
 * napuštanja početne strane.
 *
 * Problem koji rešava: dugme je u Hero sekciji, a widget sa modalom je niže na
 * strani. Teme renderuju blokove generički, pa nema propa kojim bi se to
 * povezalo. Umesto toga widget REGISTRUJE svoj otvarač ovde, a CTA ga zove.
 *
 * Ako widget nije na strani (tema ga nema, ili salon nema usluge), `available`
 * je false i CTA se ponaša kao običan link — vodi na /termini. Zato dugme nikad
 * ne postane mrtvo.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Opener = () => void;

interface BookingLauncherCtx {
  /** Otvori booking. Bez efekta kada widget nije registrovan. */
  open: Opener;
  /** true kada je widget na strani i može da primi otvaranje. */
  available: boolean;
  /** Widget se prijavljuje; vraća funkciju za odjavu (unmount). */
  register: (opener: Opener) => () => void;
}

const BookingLauncherContext = createContext<BookingLauncherCtx>({
  open: () => {},
  available: false,
  register: () => () => {},
});

export function useBookingLauncher(): BookingLauncherCtx {
  return useContext(BookingLauncherContext);
}

export function BookingLauncherProvider({ children }: { children: ReactNode }) {
  const openerRef = useRef<Opener | null>(null);
  const [available, setAvailable] = useState(false);

  const register = useCallback((opener: Opener) => {
    openerRef.current = opener;
    setAvailable(true);
    return () => {
      // Odjavi SAMO ako je i dalje registrovan ovaj otvarač — inače bi widget
      // koji se demontira posle novog obrisao tuđu registraciju.
      if (openerRef.current === opener) {
        openerRef.current = null;
        setAvailable(false);
      }
    };
  }, []);

  const open = useCallback(() => openerRef.current?.(), []);

  const value = useMemo(
    () => ({ open, available, register }),
    [open, available, register],
  );

  return (
    <BookingLauncherContext.Provider value={value}>
      {children}
    </BookingLauncherContext.Provider>
  );
}
