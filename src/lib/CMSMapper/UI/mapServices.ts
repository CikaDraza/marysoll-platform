import { IService, LandingStructure } from "@/types";

export function mapServices(ls: LandingStructure | undefined, services: IService[]) {
  return {
    label: "Our Services",
    headline: ls?.landing?.servicesPreview?.headline ?? "Makeup Packages",
    subheadline: ls?.landing?.servicesPreview?.subheadline ?? "",
    showIcons: ls?.landing?.servicesPreview?.showIcons ?? true,
    services,
  };
}
