import { describe, expect, it } from "vitest";
import { TENANT_CAPABILITIES, type TenantCapabilitySnapshot } from "@/types/tenant-capabilities";
import {
  isAdminWorkspaceTabAvailable,
  isClientWorkspaceTabAvailable,
} from "./workspace-capabilities";

function snapshot(
  enabled: Partial<Record<(typeof TENANT_CAPABILITIES)[number], boolean>> = {},
): TenantCapabilitySnapshot {
  return {
    capabilities: Object.fromEntries(
      TENANT_CAPABILITIES.map((capability) => [
        capability,
        {
          capability,
          enabled: enabled[capability] ?? false,
          platformAvailable: capability !== "education.catalog",
          planEntitled: true,
          tenantEnabled: enabled[capability] ?? false,
        },
      ]),
    ) as TenantCapabilitySnapshot["capabilities"],
  };
}

describe("workspace capability projection", () => {
  it("legacy i novi explicit beauty tenant zadržavaju postojeće beauty površine", () => {
    const beauty = snapshot({
      "services.catalog": true,
      "booking.services": true,
      "audience.contacts": true,
      "loyalty.rewards": true,
    });

    expect(isAdminWorkspaceTabAvailable(beauty, "usluge")).toBe(true);
    expect(isAdminWorkspaceTabAvailable(beauty, "termini")).toBe(true);
    expect(isClientWorkspaceTabAvailable(beauty, "Moji Termini")).toBe(true);
    expect(isClientWorkspaceTabAvailable(beauty, "Nagrade")).toBe(true);
  });

  it("education-first tenant ne dobija postojeće beauty radne površine", () => {
    const educationFirst = snapshot({ "education.catalog": false });
    expect(isAdminWorkspaceTabAvailable(educationFirst, "usluge")).toBe(false);
    expect(isAdminWorkspaceTabAvailable(educationFirst, "termini")).toBe(false);
    expect(isClientWorkspaceTabAvailable(educationFirst, "Zakazivanja")).toBe(false);
  });

  it("core tabovi ostaju dostupni, a nepoznati/budući tabovi se ne izmišljaju", () => {
    const educationFirst = snapshot();
    expect(isAdminWorkspaceTabAvailable(educationFirst, "profil")).toBe(true);
    expect(isClientWorkspaceTabAvailable(educationFirst, "Moj Profil")).toBe(true);
    expect(isAdminWorkspaceTabAvailable(educationFirst, "education")).toBe(true);
  });
});
