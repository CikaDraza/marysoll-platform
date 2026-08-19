/**
 * Deljeni props za per-theme shell komponente (ThemeNShell) — Header/Footer
 * omotač tenant podstranica.
 *
 * NEUTRALIZOVAN KONTRAKT. Ranije je ovde stajalo `salon: SalonProfileData` i
 * `services: IService[]`: ceo domenski objekat i booking katalog, svakoj temi,
 * bez obzira na to šta joj treba. To je bio isti dug koji je `ThemeLandingProps`
 * skinuo u T2A (korak 6), samo na omotaču podstranica — a education-first tema
 * ga je prva razotkrila: theme-9 nema nijednu `Service` ako tenant prodaje samo
 * edukacije, pa je primala prazan niz koji ničemu ne služi.
 *
 * Sada kontrakt ne zna nijedan poslovni pojam:
 *
 *   shellNative          → view modeli shell delova, po temi
 *   header/footer        → deljeni shell propovi
 *   routing              → tenantSlug / clientSlug / base
 *   branding             → brandingVars / fontHref / boje
 *
 * Nova vertikala dodaje svoj unos u `ThemeShellNativeByTheme` — ovaj fajl
 * ostaje netaknut.
 */
import type { CSSProperties, ReactNode } from "react";
import type { ThemeShellNativeData } from "@/lib/platform/theme-shell-native";

export interface ShellHeaderProps {
  tenantSlug?: string;
  clientSlug?: string;
  salonName: string;
  salonLogo: string | null;
  instagramUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface ShellFooterProps {
  tenantSlug?: string;
  salonName: string;
  salonDescription?: string;
  salonCity?: string;
  logo?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface ThemeShellProps {
  /** View modeli shell delova ove teme; `{}` za teme kojima ništa ne treba. */
  shellNative: ThemeShellNativeData;
  tenantSlug?: string;
  clientSlug?: string;
  children: ReactNode;
  /** Prefiks u nav linkovima: "" na subdomenu, "/{slug}" path-based. */
  base: string;
  brandingVars: CSSProperties;
  headerProps: ShellHeaderProps;
  footerProps: ShellFooterProps;
  primaryColor: string;
  secondaryColor: string;
  /** Google Fonts href tenant fonta (teme 1–6; teme 7–9 imaju fiksne fontove). */
  fontHref: string;
}
