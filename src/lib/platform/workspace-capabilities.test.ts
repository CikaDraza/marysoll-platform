import { describe, expect, it } from "vitest";
import {
  TENANT_CAPABILITIES,
  type TenantCapabilitySnapshot,
  type TenantVertical,
} from "@/types/tenant-capabilities";
import {
  initialAdminWorkspacePath,
  isAdminWorkspaceTabAvailable,
  isClientWorkspaceTabAvailable,
  resolveAdminWorkspaceNavigation,
} from "./workspace-capabilities";

function snapshot(
  enabled: Partial<Record<(typeof TENANT_CAPABILITIES)[number], boolean>> = {},
  verticals: TenantVertical[] = ["beauty"],
): TenantCapabilitySnapshot {
  return {
    verticals,
    capabilities: Object.fromEntries(
      TENANT_CAPABILITIES.map((capability) => [
        capability,
        {
          capability,
          enabled: enabled[capability] ?? false,
          platformAvailable: true,
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

  it("projektuje beauty, education i hybrid workspace bez capability nagađanja", () => {
    const beauty = snapshot({}, ["beauty"]);
    const education = snapshot(
      { "education.catalog": true },
      ["education"],
    );
    const hybrid = snapshot(
      { "education.catalog": true },
      ["beauty", "education"],
    );

    expect(resolveAdminWorkspaceNavigation(beauty)).toEqual({
      salon: true,
      education: false,
      initialWorkspace: "salon",
    });
    expect(resolveAdminWorkspaceNavigation(education)).toEqual({
      salon: false,
      education: true,
      initialWorkspace: "education",
    });
    expect(resolveAdminWorkspaceNavigation(hybrid)).toEqual({
      salon: true,
      education: true,
      initialWorkspace: "salon",
    });
    expect(initialAdminWorkspacePath(education)).toBe("/education");
    expect(initialAdminWorkspacePath(hybrid)).toBe("/dashboard");
  });

  it("ne prikazuje Education link tokom loading-a niti samo na osnovu vertikale", () => {
    expect(resolveAdminWorkspaceNavigation(undefined)).toEqual({
      salon: true,
      education: false,
      initialWorkspace: "salon",
    });
    expect(
      resolveAdminWorkspaceNavigation(snapshot({}, ["education"])),
    ).toEqual({ salon: false, education: false, initialWorkspace: null });
  });
});
