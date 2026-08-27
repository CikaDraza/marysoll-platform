import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));

const state = vi.hoisted(() => ({
  tenant: {} as Record<string, unknown> | null,
  update: vi.fn(async () => ({ matchedCount: 1 })),
}));

vi.mock("@/models/Tenant", () => ({
  Tenant: {
    findById: () => ({
      select: () => ({ lean: async () => state.tenant }),
    }),
    updateOne: state.update,
  },
}));

describe("provisionEducationWorkspace", () => {
  beforeEach(() => {
    state.tenant = {};
    state.update.mockClear();
  });

  it("menja samo capability state postojećeg tenanta", async () => {
    const { provisionEducationWorkspace } = await import(
      "./education-provisioning"
    );
    expect(await provisionEducationWorkspace("507f1f77bcf86cd799439011")).toBe(
      true,
    );
    expect(state.update).toHaveBeenCalledWith(
      { _id: "507f1f77bcf86cd799439011" },
      {
        $set: {
          verticals: ["beauty", "education"],
          capabilityConfiguration: expect.objectContaining({
            overrides: expect.arrayContaining([
              { capability: "education.catalog", enabled: true },
              { capability: "education.inquiries", enabled: true },
              { capability: "booking.education", enabled: true },
            ]),
          }),
        },
      },
    );
    const serialized = JSON.stringify(state.update.mock.calls[0]);
    expect(serialized).not.toMatch(
      /subscription|salonProfile|branding|tenantUser/i,
    );
  });

  it("ne kreira ništa kada tenant ne postoji", async () => {
    state.tenant = null;
    const { provisionEducationWorkspace } = await import(
      "./education-provisioning"
    );
    expect(await provisionEducationWorkspace("507f1f77bcf86cd799439011")).toBe(
      false,
    );
    expect(state.update).not.toHaveBeenCalled();
  });

  it("provisioning postoji bez javnog activation CTA/API call-site-a", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/platform/education-provisioning.ts"),
      "utf8",
    );
    expect(source).toContain("UI aktivacija ostaje");
    const workspace = readFileSync(
      path.join(process.cwd(), "src/app/education/page.tsx"),
      "utf8",
    );
    expect(workspace).not.toContain("provisionEducationWorkspace");
    expect(workspace).not.toContain("Aktiviraj Edu Centar");
  });
});
