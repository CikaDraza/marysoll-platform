import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PLAN_FEATURES,
  resolveActiveFeatureOverrides,
} from "@/lib/plans/planFeatures";
import {
  TENANT_CAPABILITY_REGISTRY,
  createInitialTenantCapabilityConfiguration,
  resolveCapability,
  resolveEffectiveVerticals,
  resolveKnownCapability,
  resolveTenantEnabled,
} from "./capabilities";
import {
  TENANT_CAPABILITIES,
  tenantCapabilityStateWriteSchema,
} from "@/types/tenant-capabilities";

const MARIA = PLAN_FEATURES.maria;
const CLAUDIA = PLAN_FEATURES.claudia;

describe("T2B pure capability resolver", () => {
  it("tretira missing verticals kao legacy beauty bez persistence default-a", () => {
    expect(resolveEffectiveVerticals({})).toEqual(["beauty"]);
  });

  it("čuva eksplicitni education i hybrid identitet", () => {
    expect(resolveEffectiveVerticals({ verticals: ["education"] })).toEqual([
      "education",
    ]);
    expect(
      resolveEffectiveVerticals({ verticals: ["beauty", "education"] }),
    ).toEqual(["beauty", "education"]);
  });

  it("odbija prazan, nepoznat i dupliran vertical write", () => {
    expect(tenantCapabilityStateWriteSchema.safeParse({ verticals: [] }).success).toBe(
      false,
    );
    expect(
      tenantCapabilityStateWriteSchema.safeParse({ verticals: ["medical"] })
        .success,
    ).toBe(false);
    expect(
      tenantCapabilityStateWriteSchema.safeParse({
        verticals: ["beauty", "beauty"],
      }).success,
    ).toBe(false);
  });

  it("eksplicitni true i false override imaju prioritet", () => {
    expect(
      resolveTenantEnabled(
        {
          verticals: ["education"],
          capabilityConfiguration: {
            overrides: [{ capability: "education.catalog", enabled: true }],
          },
        },
        "education.catalog",
      ),
    ).toBe(true);

    expect(
      resolveTenantEnabled(
        {
          capabilityConfiguration: {
            overrides: [{ capability: "services.catalog", enabled: false }],
          },
        },
        "services.catalog",
      ),
    ).toBe(false);
  });

  it("platform=false i plan=false imaju poslednju reč nad explicit true", () => {
    const tenant = {
      verticals: ["education"] as const,
      capabilityConfiguration: {
        overrides: [
          { capability: "education.catalog" as const, enabled: true },
          { capability: "loyalty.rewards" as const, enabled: true },
        ],
      },
    };

    expect(
      resolveCapability({
        tenant,
        capability: "education.catalog",
        planFeatures: CLAUDIA,
      }),
    ).toMatchObject({
      enabled: false,
      platformAvailable: false,
      tenantEnabled: true,
    });

    expect(
      resolveCapability({
        tenant,
        capability: "loyalty.rewards",
        planFeatures: MARIA,
      }),
    ).toMatchObject({
      enabled: false,
      planEntitled: false,
      tenantEnabled: true,
    });
  });

  it("legacy beauty dobija samo dokumentovane legacy default-e", () => {
    const enabled = TENANT_CAPABILITIES.filter((capability) =>
      resolveTenantEnabled({}, capability),
    );
    expect(enabled).toEqual([
      "services.catalog",
      "booking.services",
      "audience.contacts",
      "loyalty.rewards",
    ]);
  });

  it("education-first bez override-a ne dobija capability iz vertikale", () => {
    expect(
      resolveTenantEnabled(
        { verticals: ["education"] },
        "education.catalog",
      ),
    ).toBe(false);
  });

  it("nepoznati capability i nekonzistentni podaci fail-closed", () => {
    expect(resolveTenantEnabled({}, "unknown.capability")).toBe(false);
    expect(
      resolveKnownCapability({
        tenant: {},
        capability: "unknown.capability",
        planFeatures: MARIA,
      }),
    ).toBeNull();
    expect(
      resolveTenantEnabled(
        {
          verticals: ["beauty", "beauty"],
          capabilityConfiguration: {
            overrides: [{ capability: "services.catalog", enabled: true }],
          },
        },
        "services.catalog",
      ),
    ).toBe(false);
    expect(
      resolveTenantEnabled(
        {
          verticals: ["beauty"],
          capabilityConfiguration: {
            overrides: [
              { capability: "services.catalog", enabled: true },
              { capability: "services.catalog", enabled: false },
            ],
          },
        },
        "services.catalog",
      ),
    ).toBe(false);
  });
});

describe("T2B registry i provisioning", () => {
  it("drži future domene platform-unavailable", () => {
    for (const capability of [
      "consultations.catalog",
      "booking.consultations",
      "questionnaires.forms",
      "education.catalog",
      "education.inquiries",
      "booking.education",
      "distribution.campaigns",
    ] as const) {
      expect(TENANT_CAPABILITY_REGISTRY[capability].platformAvailable).toBe(
        false,
      );
      expect(TENANT_CAPABILITY_REGISTRY[capability].plan.kind).toBe("unmapped");
    }
  });

  it("koristi postojeće plan izvore za booking i loyalty", () => {
    expect(TENANT_CAPABILITY_REGISTRY["booking.services"].plan).toEqual({
      kind: "plan-feature",
      feature: "appointments",
    });
    expect(TENANT_CAPABILITY_REGISTRY["loyalty.rewards"].plan).toEqual({
      kind: "plan-feature",
      feature: "loyaltyCore",
    });
  });

  it("plan adapter prihvata samo aktivan, vremenski validan override", () => {
    const overrides = { loyaltyCore: true };
    const now = new Date("2026-08-21T10:00:00.000Z");
    expect(
      resolveActiveFeatureOverrides(
        {
          featureOverrides: overrides,
          overrideExpiresAt: "2026-08-21T11:00:00.000Z",
        },
        now,
      ),
    ).toEqual(overrides);
    expect(
      resolveActiveFeatureOverrides(
        { featureOverrides: overrides, overrideExpiresAt: "invalid" },
        now,
      ),
    ).toBeNull();
  });

  it("tretira osnovni audience contact domen kao core, odvojeno od AI kampanja", () => {
    expect(TENANT_CAPABILITY_REGISTRY["audience.contacts"].plan).toEqual({
      kind: "core",
    });
  });

  it("provisionuje novog beauty tenanta eksplicitno i iz registry-ja", () => {
    const initial = createInitialTenantCapabilityConfiguration();
    expect(initial.verticals).toEqual(["beauty"]);
    expect(initial.capabilityConfiguration.overrides).toEqual([
      { capability: "services.catalog", enabled: true },
      { capability: "booking.services", enabled: true },
      { capability: "audience.contacts", enabled: true },
      { capability: "loyalty.rewards", enabled: true },
    ]);
  });

  it("ne sadrži zasebnu plan matricu ni Theme Engine zavisnost", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/platform/capabilities.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/\bmaria\b|\bclaudia\b|\bkiki\b|\benterprise\b/);
    expect(source).not.toMatch(/@panta\/theme-engine|theme-access/);
    expect(source).not.toMatch(/mongoose|next\/server|server-only/);
  });

  it("Theme Engine ne importuje application capability registry", () => {
    const root = path.join(process.cwd(), "packages/theme-engine");
    const files: string[] = [];
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory)) {
        const absolute = path.join(directory, entry);
        if (statSync(absolute).isDirectory()) visit(absolute);
        else if (/\.(ts|tsx)$/.test(entry)) files.push(absolute);
      }
    };
    visit(root);
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
    expect(source).not.toMatch(/lib\/platform\/capabilities|tenant-capabilities/);
  });
});
