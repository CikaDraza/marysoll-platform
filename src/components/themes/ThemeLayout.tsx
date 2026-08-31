"use client";
/**
 * ThemeLayout — dispečer landing tema.
 *
 * Svaka tema živi u `layouts/ThemeNLanding.tsx` i učitava se kroz next/dynamic,
 * pa tenant dobija samo chunk svoje teme (SSR ostaje uključen).
 *
 * T2A, korak 6: ovde se VIŠE NE računa ništa poslovno. Ranije su se ovde izvodili
 * svih deset CMS flagova, varijanta galerije, merge social linkova i hero CTA —
 * i sve to prosleđivalo svakoj temi. Sada to radi server (`ClientHomePage`), kroz
 * `document`/`blockData` i per-theme view modele.
 *
 * Jedino što ostaje ovde je `resolveHref`: funkcija se ne može serijalizovati iz
 * server komponente, pa se pravi na klijentu — istim helperom koji server koristi
 * pri gradnji native view modela.
 */

import dynamic from "next/dynamic";
import { useMemo, type ComponentType } from "react";
import type { ThemeDocument } from "@panta/theme-engine";
import type { ResolvedBlockMap } from "@/lib/platform/blocks/render-types";
import type { ThemeNativeData } from "@/lib/platform/theme-native";
import { makeResolveHref } from "@/helpers/tenantHref";
import type { LandingTheme } from "@/types";
import { BookingLauncherProvider } from "./shared/BookingLauncher";
import type {
  ThemeFooterShared,
  ThemeHeaderShared,
  ThemeLandingProps,
} from "./layouts/types";

const THEME_LANDINGS: Record<LandingTheme, ComponentType<ThemeLandingProps>> = {
  "theme-1": dynamic(() => import("./layouts/Theme1Landing").then((m) => m.Theme1Landing)),
  "theme-2": dynamic(() => import("./layouts/Theme2Landing").then((m) => m.Theme2Landing)),
  "theme-3": dynamic(() => import("./layouts/Theme3Landing").then((m) => m.Theme3Landing)),
  "theme-4": dynamic(() => import("./layouts/Theme4Landing").then((m) => m.Theme4Landing)),
  "theme-5": dynamic(() => import("./layouts/Theme5Landing").then((m) => m.Theme5Landing)),
  "theme-6": dynamic(() => import("./layouts/Theme6Landing").then((m) => m.Theme6Landing)),
  "theme-7": dynamic(() => import("./layouts/Theme7Landing").then((m) => m.Theme7Landing)),
  "theme-8": dynamic(() => import("./layouts/Theme8Landing").then((m) => m.Theme8Landing)),
  "theme-9": dynamic(() => import("./layouts/Theme9Landing").then((m) => m.Theme9Landing)),
};

interface ThemeLayoutProps {
  theme: LandingTheme;
  document: ThemeDocument;
  blockData: ResolvedBlockMap;
  themeNative: ThemeNativeData;
  brandingVars: React.CSSProperties;
  googleFontHref: string;
  headerProps: ThemeHeaderShared;
  footerProps: ThemeFooterShared;
  tenantSlug?: string;
  clientSlug?: string;
  reduceMotion?: boolean;
}

export function ThemeLayout({
  theme,
  document,
  blockData,
  themeNative,
  brandingVars,
  googleFontHref,
  headerProps,
  footerProps,
  tenantSlug,
  clientSlug,
  reduceMotion,
}: ThemeLayoutProps) {
  // useMemo: identitet ulazi u ThemeBlockScope routing, pa bi nova funkcija po
  // renderu nepotrebno osvežavala kontekst.
  const resolveHref = useMemo(() => makeResolveHref(tenantSlug), [tenantSlug]);

  const landingProps: ThemeLandingProps = {
    document,
    blockData,
    themeNative,
    tenantSlug,
    clientSlug,
    resolveHref,
    brandingVars,
    googleFontHref,
    headerProps,
    footerProps,
    reduceMotion,
  };

  const Landing = THEME_LANDINGS[theme];
  // Hero CTA i widget su u različitim blokovima; launcher ih spaja bez propa.
  return (
    <BookingLauncherProvider>
      <Landing {...landingProps} />
    </BookingLauncherProvider>
  );
}
