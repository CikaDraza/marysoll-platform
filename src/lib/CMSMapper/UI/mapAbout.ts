import { HeroImage, LandingStructure } from "@/types";

export function mapAbout(ls: LandingStructure | undefined) {
  const about = ls?.landing?.about;

  return {
    headline: about?.headline ?? "Passion for perfection",
    paragraphs:
      about?.paragraphs && about.paragraphs.length > 0
        ? about.paragraphs
        : ["Default salon description"],

    stats: [
      { label: "Clients", value: "120+" },
      { label: "Treatments", value: "800+" },
    ],
    image: about?.image ?? ({ src: "", alt: "Salon interior with stylist and client" } as HeroImage),
    alt: about?.image?.alt ?? "Salon interior with stylist and client",
    enabled: about !== undefined ? about.enabled : true,
  };
}
