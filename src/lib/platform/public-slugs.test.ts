import { beforeEach, describe, expect, it, vi } from "vitest";

const { tenantExists, platformLean } = vi.hoisted(() => ({
  tenantExists: vi.fn(),
  platformLean: vi.fn(),
}));

vi.mock("@/models/Tenant", () => ({
  Tenant: { exists: tenantExists },
}));

vi.mock("@/models/ProfilPlatforme", () => ({
  ProfilPlatforme: {
    findOne: vi.fn(() => ({
      select: vi.fn(() => ({ lean: platformLean })),
    })),
  },
}));

import {
  findAvailableTenantSlug,
  getPublicSlugAvailability,
} from "./public-slugs";

beforeEach(() => {
  tenantExists.mockResolvedValue(null);
  platformLean.mockResolvedValue({ cmsPages: {} });
});

describe("public slug availability", () => {
  it.each(["login", "dashboard"])("system slug %s nije dostupan", async (slug) => {
    await expect(getPublicSlugAvailability(slug)).resolves.toMatchObject({
      available: false,
      conflict: "system",
    });
  });

  it("CMS slug nije dostupan tenant-u", async () => {
    platformLean.mockResolvedValue({ cmsPages: { "edu-centar": {} } });
    await expect(getPublicSlugAvailability("edu-centar")).resolves.toMatchObject({
      available: false,
      conflict: "cms",
    });
  });

  it("tenant slug nije dostupan CMS-u", async () => {
    tenantExists.mockResolvedValue({ _id: "tenant-1" });
    await expect(getPublicSlugAvailability("kiki-kiss-beauty")).resolves.toMatchObject({
      available: false,
      conflict: "tenant",
    });
  });

  it("novi slug je dostupan", async () => {
    await expect(getPublicSlugAvailability("nova-marketing-stranica")).resolves.toEqual({
      available: true,
      slug: "nova-marketing-stranica",
    });
  });

  it("CMS stranica može da zadrži sopstveni slug", async () => {
    platformLean.mockResolvedValue({ cmsPages: { "edu-centar": {} } });
    await expect(
      getPublicSlugAvailability("edu-centar", { excludeCmsSlug: "edu-centar" }),
    ).resolves.toEqual({ available: true, slug: "edu-centar" });
  });

  it("suffix generation preskače CMS i tenant kolizije", async () => {
    platformLean.mockImplementation(async () => ({
      cmsPages: { "beauty-salon": {} },
    }));
    tenantExists.mockImplementation(async ({ slug }: { slug: string }) =>
      slug === "beauty-salon-1" ? { _id: "tenant-1" } : null,
    );

    await expect(findAvailableTenantSlug("Beauty salon")).resolves.toBe(
      "beauty-salon-2",
    );
  });
});
