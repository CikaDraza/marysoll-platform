import { describe, expect, it } from "vitest";
import { createAdminWorkspaceSelectorModel } from "./admin-workspace-selector-model";

describe("Admin workspace selector model", () => {
  it("beauty-only prikazuje Salon i zaseban activation CTA", () => {
    const model = createAdminWorkspaceSelectorModel({
      activeWorkspace: "salon",
      availableWorkspaces: ["salon"],
      snapshotResolved: true,
      canActivateEducation: true,
    });

    expect(model.buttonLabel).toBe("Salon");
    expect(model.options).toEqual([
      expect.objectContaining({ workspace: "salon", active: true }),
    ]);
    expect(model.options).not.toContainEqual(
      expect.objectContaining({ workspace: "education" }),
    );
    expect(model.showEducationActivation).toBe(true);
  });

  it("education-only prikazuje samo aktivni Edu Centar", () => {
    const model = createAdminWorkspaceSelectorModel({
      activeWorkspace: "education",
      availableWorkspaces: ["education"],
      snapshotResolved: true,
      canActivateEducation: false,
    });

    expect(model.buttonLabel).toBe("Edu Centar");
    expect(model.options).toEqual([
      expect.objectContaining({ workspace: "education", active: true }),
    ]);
    expect(model.options).not.toContainEqual(
      expect.objectContaining({ workspace: "salon" }),
    );
    expect(model.showEducationActivation).toBe(false);
  });

  it.each([
    { activeWorkspace: "salon" as const, activeLabel: "Salon" },
    { activeWorkspace: "education" as const, activeLabel: "Edu Centar" },
  ])("hybrid označava $activeLabel prema URL workspace-u", (scenario) => {
    const model = createAdminWorkspaceSelectorModel({
      activeWorkspace: scenario.activeWorkspace,
      availableWorkspaces: ["salon", "education"],
      snapshotResolved: true,
      canActivateEducation: false,
    });

    expect(model.buttonLabel).toBe(scenario.activeLabel);
    expect(model.options).toHaveLength(2);
    expect(model.options.find((option) => option.active)?.label).toBe(
      scenario.activeLabel,
    );
    expect(model.showEducationActivation).toBe(false);
  });

  it("tokom loading-a ne izmišlja activation CTA", () => {
    const model = createAdminWorkspaceSelectorModel({
      activeWorkspace: "salon",
      availableWorkspaces: ["salon"],
      snapshotResolved: false,
      canActivateEducation: false,
    });

    expect(model.showEducationActivation).toBe(false);
  });
});
