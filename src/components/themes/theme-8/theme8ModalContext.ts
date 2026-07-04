"use client";

/**
 * Theme8 modal context — izdvojen iz Theme8ModalProvider da potrošači hooka
 * (Y2KHomepageAppointmentWidget, Hero, Footer…) ne importuju sam Provider.
 * Provider renderuje Y2KBookingCard, pa bi import Providera iz widgeta pravio
 * kružnu zavisnost: Y2KBookingCard → Widget → Provider → Y2KBookingCard.
 */
import { createContext, useContext } from "react";

export type ModalName = "book" | "bilten";

export interface Theme8ModalCtx {
  open: (name: ModalName) => void;
  close: () => void;
  /** Zatvori modal i prikaži "Moment" zahvalnicu (npr. nakon zakazivanja). */
  celebrate: () => void;
}

export const Theme8ModalContext = createContext<Theme8ModalCtx>({
  open: () => {},
  close: () => {},
  celebrate: () => {},
});

export function useTheme8Modal() {
  return useContext(Theme8ModalContext);
}
