"use client";

/**
 * Theme-8 "force reduced motion" prekidač.
 *
 * ZAŠTO postoji: framer-motion v12 javni `useReducedMotion()` čita ISKLJUČIVO
 * uređajevu prefers-reduced-motion postavku (server → null) i NAMERNO ignoriše
 * `MotionConfig reducedMotion`. Zato nam treba sopstveni kanal da na iOS-u
 * (gde hydration ume da padne) nateramo statičan, SSR-vidljiv render — bez
 * ulaznih opacity animacija koje bi ostavile sadržaj na `opacity:0` ako se
 * klijentski JS nikad ne izvrši.
 *
 * Provider postavlja Theme8Landing (value = reduceMotion iz UA-ja). Sve motion
 * komponente teme čitaju `useThemeReduce()` umesto golog `useReducedMotion()`.
 */
import { createContext, useContext } from "react";
import { useReducedMotion } from "framer-motion";

const ForceReduceContext = createContext(false);

export const ForceReduceMotionProvider = ForceReduceContext.Provider;

/** true ako uređaj traži reduced-motion ILI tema forsira (iOS safe render). */
export function useThemeReduce(): boolean {
  const deviceReduce = useReducedMotion();
  const forced = useContext(ForceReduceContext);
  return Boolean(deviceReduce) || forced;
}
