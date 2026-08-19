"use client";
/**
 * theme-8/fixturesContext.tsx — privremeni preview flag za utiske.
 *
 * `showTheme8TestimonialFixtures` je dozvoljen samo na staging/preview hostu i
 * NIJE podatak bloka (nije CMS sadržaj niti domen) — to je okruženje. Zato ide
 * kroz mali theme-8 kontekst, a ne kroz `ContentTestimonialsData`.
 */

import { createContext, useContext, type ReactNode } from "react";

const Theme8FixturesContext = createContext(false);

export function Theme8FixturesProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return (
    <Theme8FixturesContext.Provider value={value}>
      {children}
    </Theme8FixturesContext.Provider>
  );
}

export function useTheme8Fixtures(): boolean {
  return useContext(Theme8FixturesContext);
}
