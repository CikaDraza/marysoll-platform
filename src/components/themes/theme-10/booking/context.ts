"use client";
/**
 * Launcher theme-10 booking modala (spec 6.11: CTA launcher ≠ widget ≠ blok).
 *
 * Svaki CTA na strani otvara isti modal. Izvan providera (`available: false`,
 * npr. na podstranicama) CTA ostaje običan link na `/termini`.
 */
import { createContext, useContext } from "react";

export interface Theme10BookingCtx {
  open: () => void;
  available: boolean;
}

export const Theme10BookingContext = createContext<Theme10BookingCtx>({
  open: () => {},
  available: false,
});

export function useTheme10Booking(): Theme10BookingCtx {
  return useContext(Theme10BookingContext);
}
