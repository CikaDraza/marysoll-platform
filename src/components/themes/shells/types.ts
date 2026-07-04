/**
 * Deljeni props za per-theme shell komponente (ThemeNShell) — Header/Footer
 * omotač tenant podstranica. TenantShellClient izračuna izvedene vrednosti
 * jednom i prosledi ih izabranoj temi kroz next/dynamic.
 */
import type { CSSProperties, ReactNode } from "react";
import type { IService, SalonProfileData } from "@/types";

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
  salon: SalonProfileData;
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
  salon: SalonProfileData;
  tenantSlug?: string;
  /** Samo theme-8 (booking modal); prazno za ostale teme. */
  services: IService[];
  children: ReactNode;
  base: string;
  brandingVars: CSSProperties;
  headerProps: ShellHeaderProps;
  footerProps: ShellFooterProps;
  primaryColor: string;
  secondaryColor: string;
  /** Google Fonts href tenant fonta (teme 1–6; teme 7/8 imaju fiksne fontove). */
  fontHref: string;
}
