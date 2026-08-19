"use client";
/**
 * Launcher zakazivanja — kontekst koji dele svi CTA-ovi teme.
 *
 * Po spec 6.11 launcher NIJE sekcija: ne zavisi od `appointmentSection.enabled`
 * i ne pripada nijednom bloku. Zato je kontekst, a ne prop kroz kompoziciju —
 * header, hero i finalni CTA ga traže nezavisno.
 *
 * `available: false` znači da tenant nema podatke za prikaz toka; dugmad tada
 * ostaju vidljiva ali inertna.
 */
import { createContext, useContext } from "react";

export interface BookingLauncher {
  available: boolean;
  open: () => void;
}

const NOOP: BookingLauncher = { available: false, open: () => {} };

export const BookingLauncherContext = createContext<BookingLauncher>(NOOP);

export function useBookingLauncher(): BookingLauncher {
  return useContext(BookingLauncherContext);
}
