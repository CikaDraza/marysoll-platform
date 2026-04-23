// /lib/CMSMapper/ui-mapper.ts
import { LandingStructure } from "@/types";
export function rowMapper(
  sectionKey: keyof LandingStructure["landing"],
  cms: LandingStructure,
) {
  return cms?.landing?.[sectionKey] ?? {};
}
