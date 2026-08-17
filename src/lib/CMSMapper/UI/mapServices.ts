import { IService, LandingStructure } from "@/types";

/** Ulaz na nivou sekcije (vidi `mapHeroSection`). */
export function mapServicesSection(
  section: LandingStructure["landing"]["servicesPreview"] | undefined,
  services: IService[],
) {
  return {
    label: "Our Services",
    headline: section?.headline ?? "Makeup Packages",
    subheadline: section?.subheadline ?? "",
    showIcons: section?.showIcons ?? true,
    services,
  };
}

export function mapServices(ls: LandingStructure | undefined, services: IService[]) {
  return mapServicesSection(ls?.landing?.servicesPreview, services);
}
