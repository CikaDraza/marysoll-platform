/**
 * lib/platform/theme-native.ts — presentation view modeli theme-native delova.
 *
 * Native elementi (pricing, social proof, promo trake…) nisu Feature Block-ovi i
 * ostaju vlasništvo teme (spec 6.1). Ali ne smeju ni da vuku domenske tipove
 * kroz zajednički `ThemeLandingProps` — zato aplikacijski sloj svakoj temi
 * izračuna SAMO ono što njeni native delovi prikazuju.
 *
 * Ključ mape je tema: svaka tema čita svoj ulaz, nijedna ne vidi tuđi.
 */

import type { SalonProfileData } from "@/types";
import {
  buildTheme6Native,
  type Theme6NativeData,
} from "@/components/themes/theme-6/nativeData";

export interface ThemeNativeByTheme {
  "theme-6": Theme6NativeData;
}

/** Prazno za teme koje još nemaju izdvojen native view model. */
export type ThemeNativeData = Partial<ThemeNativeByTheme>;

export function buildThemeNative(
  theme: string,
  salon: SalonProfileData,
): ThemeNativeData {
  if (theme === "theme-6") {
    return {
      "theme-6": buildTheme6Native({
        landingStructure: salon.landingStructure,
        salonInstagram: salon.social?.instagram || "",
      }),
    };
  }
  return {};
}
