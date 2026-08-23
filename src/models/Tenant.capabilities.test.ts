import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { Tenant } from "./Tenant";

function requiredTenantFields() {
  return {
    name: "Test tenant",
    slug: `test-${new Types.ObjectId().toString()}`,
    subdomain: `test-${new Types.ObjectId().toString()}`,
    ownerId: new Types.ObjectId(),
    cloudinaryFolder: "salons/test",
  };
}

describe("Tenant T2B persistence contract", () => {
  it("legacy dokument ne materijalizuje verticals niti konfiguraciju", () => {
    const tenant = new Tenant(requiredTenantFields());
    const object = tenant.toObject();

    expect(tenant.verticals).toBeUndefined();
    expect(tenant.capabilityConfiguration).toBeUndefined();
    expect(object).not.toHaveProperty("verticals");
    expect(object).not.toHaveProperty("capabilityConfiguration");
  });

  it("hydrate legacy dokumenta čuva undefined semantiku", () => {
    const tenant = Tenant.hydrate({
      _id: new Types.ObjectId(),
      ...requiredTenantFields(),
    });

    expect(tenant.verticals).toBeUndefined();
    expect(tenant.capabilityConfiguration).toBeUndefined();
    expect(tenant.toObject()).not.toHaveProperty("verticals");
  });

  it("novi Tenant ne može slučajno biti sačuvan kao legacy", async () => {
    const tenant = new Tenant(requiredTenantFields());
    await expect(tenant.validate()).rejects.toMatchObject({
      errors: {
        verticals: expect.anything(),
        capabilityConfiguration: expect.anything(),
      },
    });
  });

  it("razlikuje missing konfiguraciju od eksplicitno prazne konfiguracije", () => {
    const tenant = new Tenant({
      ...requiredTenantFields(),
      verticals: ["beauty"],
      capabilityConfiguration: {},
    });

    expect(tenant.capabilityConfiguration).toBeDefined();
    expect(tenant.capabilityConfiguration?.overrides).toEqual([]);
    expect(tenant.toObject()).toHaveProperty(
      "capabilityConfiguration.overrides",
      [],
    );
  });

  it("odbija prazan, nepoznat i dupliran vertical array", () => {
    const empty = new Tenant({ ...requiredTenantFields(), verticals: [] });
    expect(empty.validateSync()?.errors.verticals).toBeDefined();

    const unknown = new Tenant({
      ...requiredTenantFields(),
      verticals: ["medical"],
    });
    expect(unknown.validateSync()?.errors["verticals.0"]).toBeDefined();

    const duplicate = new Tenant({
      ...requiredTenantFields(),
      verticals: ["beauty", "beauty"],
    });
    expect(duplicate.validateSync()?.errors.verticals).toBeDefined();
  });

  it("odbija nepoznat i dupliran capability override", () => {
    const unknown = new Tenant({
      ...requiredTenantFields(),
      verticals: ["beauty"],
      capabilityConfiguration: {
        overrides: [{ capability: "unknown.capability", enabled: true }],
      },
    });
    expect(
      unknown.validateSync()?.errors[
        "capabilityConfiguration.overrides.0.capability"
      ],
    ).toBeDefined();

    const duplicate = new Tenant({
      ...requiredTenantFields(),
      verticals: ["beauty"],
      capabilityConfiguration: {
        overrides: [
          { capability: "services.catalog", enabled: true },
          { capability: "services.catalog", enabled: false },
        ],
      },
    });
    expect(
      duplicate.validateSync()?.errors["capabilityConfiguration.overrides"],
    ).toBeDefined();
  });

  it("čuva enabled:false kroz object/hydrate round-trip", () => {
    const original = new Tenant({
      ...requiredTenantFields(),
      verticals: ["beauty"],
      capabilityConfiguration: {
        overrides: [{ capability: "services.catalog", enabled: false }],
      },
    });
    expect(original.validateSync()).toBeUndefined();

    const hydrated = Tenant.hydrate(original.toObject());
    const [override] = hydrated.capabilityConfiguration?.overrides ?? [];
    expect(override?.capability).toBe("services.catalog");
    expect(override?.enabled).toBe(false);
  });
});
