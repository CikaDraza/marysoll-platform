import type { PublicTestimonial } from "@/types/public-testimonials";

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

/** Nikada ne prikazuj test utiske na pravim produkcionim tenant domenima. */
export function shouldUseTheme8TestTestimonials(hostname: string): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const host = hostname.split(":")[0].toLowerCase();
  const stagingHosts = new Set(
    (process.env.STAGING_PATH_HOSTS ?? "staging.marysoll.com,qa.marysoll.com")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  return stagingHosts.has(host) || host.endsWith(".vercel.app");
}
