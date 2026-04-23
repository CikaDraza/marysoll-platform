import { LandingStructure } from "@/types";

export function mapCTA(ls: LandingStructure | undefined) {
  const cta = ls?.landing?.hero?.ctas;

  return {
    headline: "Professional makeup for every occasion",

    subheadline: "Book your appointment today",

    image:
      "https://res.cloudinary.com/dufo1t5li/image/upload/v1764565548/samples/ecommerce/analog-classic.jpg",

    cta: {
      label: cta?.primary?.text ?? "Book Now",
      href: cta?.primary?.href ?? "#booking",
    },
  };
}
