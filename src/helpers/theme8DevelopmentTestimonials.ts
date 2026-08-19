import type { PublicTestimonial } from "@/types/public-testimonials";
import { isPathBasedHost } from "@/lib/platform/host-context";

/** Privremena druga strana za proveru Theme-8 swipe animacije. */
export const THEME8_DEVELOPMENT_TESTIMONIALS: PublicTestimonial[] = [
  {
    _id: "development-testimonial-4",
    clientName: "Nina P.",
    rating: 5,
    comment: "Trepavice su savršene i drže mi bez problema. Vraćam se sigurno!",
    adminReply: "Hvala ti, Nina! Jedva čekam sledeći termin. ♡",
  },
  {
    _id: "development-testimonial-5",
    clientName: "Teodora M.",
    rating: 5,
    comment: "Predivna atmosfera, precizan rad i rezultat koji sam želela.",
  },
  {
    _id: "development-testimonial-6",
    clientName: "Jovana R.",
    rating: 5,
    comment: "Najlepši set do sada — dobila sam mnogo komplimenata!",
  },
];

/**
 * Nikada ne prikazuj test utiske na pravim produkcionim tenant domenima —
 * samo u dev-u i na path-based okruženjima (preview, staging/qa).
 */
export function shouldUseTheme8TestTestimonials(hostname: string): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return isPathBasedHost(hostname);
}
