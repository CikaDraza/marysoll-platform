"use client";
/**
 * Launcher theme-10 booking modala (spec 6.11: CTA launcher ≠ widget ≠ blok).
 *
 * Svaki CTA na strani otvara isti modal. `openForMaster` je prezentaciona
 * varijanta istog launchera: booking domen (Appointment.staffProfileId)
 * postoji u modelu ali se nigde ne upisuje, pa ne postoji stvarno mapiranje
 * usluga ↔ zaposleni za salonov pravi katalog. Zato "zaključavanje" ne filtrira
 * termine/usluge — samo najavi izabranog majstora u zaglavlju modala i upiše
 * ga u napomenu termina, da vlasnica vidi želju klijentkinje. Vidi
 * `Theme10BookingProvider`.
 *
 * Izvan providera (`available: false`, npr. na podstranicama) CTA ostaje
 * običan link na `/termini`.
 */
import { createContext, useContext } from "react";

export interface Theme10Master {
  name: string;
  spec?: string;
}

export interface Theme10BookingCtx {
  open: () => void;
  openForMaster: (master: Theme10Master) => void;
  available: boolean;
}

export const Theme10BookingContext = createContext<Theme10BookingCtx>({
  open: () => {},
  openForMaster: () => {},
  available: false,
});

export function useTheme10Booking(): Theme10BookingCtx {
  return useContext(Theme10BookingContext);
}
