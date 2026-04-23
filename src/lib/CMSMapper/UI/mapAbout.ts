import { LandingStructure } from "@/types";

export function mapAbout(ls: LandingStructure | undefined) {
  const about = ls?.landing?.about;

  return {
    headline: about?.headline ?? "Passion for perfection",
    paragraphs:
      about?.paragraphs && about.paragraphs.length > 0
        ? about.paragraphs
        : ["Default salon description"],

    items: [
      { label: "Clients", value: "120+" },
      { label: "Treatments", value: "800+" },
    ],
  };
}
