/**
 * lib/platform/theme-shell-native.ts — view modeli SHELL-a, po temi.
 *
 * Isto što je `theme-native.ts` uradio landing stranama, samo za Header/Footer
 * omotač podstranica (`/usluge`, `/termini`, `/blogs`, auth strane…).
 *
 * ZAŠTO: `ThemeShellProps` je do sada nosio `salon: SalonProfileData` i
 * `services: IService[]` — dakle ceo domenski objekat i booking katalog, svakoj
 * temi, bez obzira na to šta joj treba. `ThemeLandingProps` je tu granicu prešao
 * u T2A (korak 6); shell je ostao zatečen dug i education-first tema ga je prva
 * razotkrila: theme-9 nema `Service` ako tenant prodaje samo edukacije, a i
 * dalje je morala da prima `services`.
 *
 * PRAVILO JE ISTO KAO GORE: zajednički ugovor je neutralan, a per-theme view
 * model nosi tačno ono što ta tema koristi. Gde komponenta teme i dalje traži
 * ceo `salon` (theme-4 Header/Footer), model ga i dalje nosi — to je vlasništvo
 * te teme, ne zajedničkog ugovora. Isti kompromis već stoji u
 * `Theme4NativeData` i `Theme5NativeData` na landing strani.
 */
import type { IService, SalonProfileData } from "@/types";
import { instagramOf, type NativeInstagram } from "./theme-native";
import { shouldShowWorkingHours } from "@/helpers/workingHoursDisplay";

/** Footer sa radnim vremenom i Instagramom — dele ga theme-7, -8 i -9. */
export interface ShellFooterNative {
  salonName: string;
  logo?: string;
  email: string;
  workingHours?: SalonProfileData["workingHours"];
  instagram: NativeInstagram;
}

export interface ThemeShellNativeByTheme {
  /** theme-4 Header/Footer i dalje primaju ceo profil (vlasništvo te teme). */
  "theme-4": { salon: SalonProfileData; salonPhone: string | null };
  "theme-5": {
    salonName: string;
    /** Samo apsolutni URL — theme-5 header pada na ime kad logo nije URL. */
    logoUrl?: string;
    social: { instagram?: string; facebook?: string; tiktok?: string };
  };
  "theme-6": {
    salonName: string;
    logo?: string;
    email?: string;
    phone?: string;
    social: { instagram?: string; facebook?: string };
  };
  "theme-7": { footer: ShellFooterNative };
  "theme-8": {
    footer: ShellFooterNative;
    /**
     * Booking modal — podaci widgeta, ne shell-a. Ostaje ovde dok T3 Booking
     * Engine i `availability-core` ne daju widget-u sopstveni izvor; isti
     * privremeni kompromis već stoji u `Theme8NativeData.bookingModal`.
     */
    booking: {
      tenantSlug?: string;
      clientSlug?: string;
      salon: SalonProfileData;
      services: IService[];
    };
  };
  "theme-9": {
    header: { salonName: string; logo?: string; kicker?: string };
    footer: { salonName: string; tagline?: string; email: string; instagramUrl?: string };
  };
}

export type ThemeShellNativeData = Partial<ThemeShellNativeByTheme>;

export interface ThemeShellNativeInput {
  salon: SalonProfileData;
  services: IService[];
  tenantSlug?: string;
  clientSlug?: string;
}

/**
 * Da li shell ove teme uopšte traži katalog usluga. Jedino theme-8 (footer
 * booking modal) — ostale ne, pa server ne treba da ih dovlači.
 */
export function shellNeedsServices(theme: string): boolean {
  return theme === "theme-8";
}

function footerNativeOf(salon: SalonProfileData): ShellFooterNative {
  return {
    salonName: salon.name,
    logo: salon.logo ?? undefined,
    email: salon.contactEmail || salon.email,
    workingHours: shouldShowWorkingHours(salon) ? salon.workingHours : undefined,
    instagram: instagramOf(salon),
  };
}

export function buildThemeShellNative(
  theme: string,
  input: ThemeShellNativeInput,
): ThemeShellNativeData {
  const { salon, tenantSlug, clientSlug } = input;

  switch (theme) {
    case "theme-4":
      return {
        "theme-4": { salon, salonPhone: salon.phone ?? null },
      };

    case "theme-5":
      return {
        "theme-5": {
          salonName: salon.name,
          logoUrl: salon.logo?.startsWith("http") ? salon.logo : undefined,
          social: {
            instagram: salon.social?.instagram,
            facebook: salon.social?.facebook,
            tiktok: salon.social?.tiktok,
          },
        },
      };

    case "theme-6":
      return {
        "theme-6": {
          salonName: salon.name,
          logo: salon.logo ?? undefined,
          email: salon.email,
          phone: salon.phone,
          social: {
            instagram: salon.social?.instagram,
            facebook: salon.social?.facebook,
          },
        },
      };

    case "theme-7":
      return { "theme-7": { footer: footerNativeOf(salon) } };

    case "theme-8":
      return {
        "theme-8": {
          footer: footerNativeOf(salon),
          booking: {
            tenantSlug,
            clientSlug: clientSlug ?? tenantSlug,
            salon,
            services: input.services,
          },
        },
      };

    case "theme-9":
      return {
        "theme-9": {
          header: {
            salonName: salon.name,
            logo: salon.logo ?? undefined,
            kicker: salon.description || undefined,
          },
          footer: {
            salonName: salon.name,
            tagline: salon.description || undefined,
            email: salon.contactEmail || salon.email,
            instagramUrl: instagramOf(salon).url || undefined,
          },
        },
      };

    // theme-1, theme-2, theme-3 — shell im ne treba ništa osim brandinga.
    default:
      return {};
  }
}
