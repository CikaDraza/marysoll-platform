/**
 * Deljeni props za per-theme landing komponente (ThemeNLanding).
 *
 * T2A, korak 6 — NEUTRALIZOVAN KONTRAKT. Ranije je ovde stajalo:
 * `salon: SalonProfileData`, `services: IService[]`, `testimonials`,
 * `tenantStats`, `landingStructure`, `salonWithMergedSocial` i deset
 * `*Enabled` flagova. Zbog toga je svaka nova vertikala morala da dira ovaj
 * fajl, `ThemeLayout` i svih osam tema.
 *
 * Sada kontrakt ne zna nijedan poslovni pojam:
 *
 *   document + blockData → ŠTA se prikazuje i sa kojim podacima (registry)
 *   themeNative          → view modeli native delova, po temi
 *   header/footer        → shell
 *   brandingVars/font    → dizajn tokeni
 *   routing              → tenantSlug / clientSlug / resolveHref
 *
 * Nova tema (npr. edukacija) dodaje svoj blok u registry i svoj native view
 * model — a ovaj fajl ostaje netaknut.
 */
import type { CSSProperties } from "react";
import type { ThemeDocument } from "@panta/theme-engine";
import type { PublicTestimonial } from "@/types/public-testimonials";
import type { ResolvedBlockMap } from "@/lib/platform/blocks/render-types";
import type { ThemeNativeData } from "@/lib/platform/theme-native";
import type { ResolvedHeroCta } from "@/helpers/heroCta";

export type Testimonial = PublicTestimonial;

/** Jedna definicija, deljena sa `helpers/heroCta` (vidi tamo zašto). */
export type { ResolvedHeroCta };

export interface ThemeFooterShared {
  tenantSlug?: string;
  salonName: string;
  description?: string;
  logo?: string;
  city?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface ThemeHeaderShared {
  tenantSlug?: string;
  clientSlug?: string;
  salonName: string;
  salonLogo: string | null;
  instagramUrl?: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface ThemeLandingProps {
  /** Raspored CMS blokova — vidljivost sekcije je postojanje bloka. */
  document: ThemeDocument;
  /** Podaci blokova iz jednog server prolaza (`resolveBlockData`). */
  blockData: ResolvedBlockMap;
  /** View modeli theme-native delova, po temi. */
  themeNative: ThemeNativeData;

  // ── Rutiranje ──────────────────────────────────────────────────────────
  /** Prefiks u nav linkovima; `undefined` na custom domenu (linkovi su root-relative). */
  tenantSlug?: string;
  /** Stvarni DB slug — `LoggedButton` gradi `/{slug}/panel` i na custom domenu. */
  clientSlug?: string;
  /** Isti resolver koji koristi i server pri gradnji native view modela. */
  resolveHref: (href: string) => string;

  // ── Dizajn i shell ─────────────────────────────────────────────────────
  brandingVars: CSSProperties;
  googleFontHref: string;
  headerProps: ThemeHeaderShared;
  footerProps: ThemeFooterShared;

  /**
   * "Safe" render bez ulazne animacije/preloadera — postavlja se za iOS (UA)
   * jer tamo hydration ume da padne, pa strana mora da bude vidljiva iz SSR-a.
   */
  reduceMotion?: boolean;
}
