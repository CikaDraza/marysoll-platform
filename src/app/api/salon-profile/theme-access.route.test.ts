import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: vi.fn() }));
vi.mock("@/models/SalonProfile", () => ({
  SalonProfile: {
    create: vi.fn(),
    exists: vi.fn(),
    findOne: vi.fn(),
  },
}));
vi.mock("@/models/Tenant", () => ({
  Tenant: {
    findById: vi.fn(),
    updateOne: vi.fn(),
  },
}));
vi.mock("@/lib/cloudinary", () => ({
  deleteFromCloudinary: vi.fn(async () => {}),
  getTenantFolder: vi.fn(async () => "salons/tenant-1"),
  uploadToCloudinary: vi.fn(async () => "https://example.test/logo.png"),
}));
vi.mock("@/lib/marketplace/revalidateMarketplace", () => ({
  revalidateMarketplaceCaches: vi.fn(async () => {}),
}));
vi.mock("@/helpers/manualSlots", () => ({
  pruneAndValidateManualSlots: vi.fn((value) => value),
}));
vi.mock("@/helpers/vacations", () => ({
  normalizeVacations: vi.fn((value) => value ?? []),
}));

import { requireTenantAdmin } from "@/lib/auth/auth-server";
import { SalonProfile } from "@/models/SalonProfile";
import { Tenant } from "@/models/Tenant";
import { POST } from "./create/route";
import { PUT } from "./update/route";

const TENANT_ID = "tenant-1";
const LASH_ROOM = "the-lash-room-by-anja";
const MARINA = "marina-stanisavljevic-skincare-edukacija";

function request(
  method: "POST" | "PUT",
  entries: Record<string, string> = {},
) {
  const body = new FormData();
  for (const [key, value] of Object.entries(entries)) body.set(key, value);

  return new NextRequest(`https://marysoll.com/api/salon-profile/${method}`, {
    method,
    body,
  });
}

function tenantSlugQuery(slug: string | null) {
  return { select: () => ({ lean: async () => (slug ? { slug } : null) }) };
}

function profile(landingTheme = "theme-1") {
  return {
    tenantId: TENANT_ID,
    landingTheme,
    markModified: vi.fn(),
    save: vi.fn(async () => {}),
    toObject: vi.fn(() => ({ landingStructure: undefined })),
  };
}

function useTenantSlug(slug: string) {
  vi.mocked(Tenant.findById).mockReturnValue(tenantSlugQuery(slug) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireTenantAdmin).mockReturnValue({
    success: true,
    tenantId: TENANT_ID,
  } as never);
  vi.mocked(SalonProfile.exists).mockResolvedValue(null as never);
  vi.mocked(Tenant.updateOne).mockResolvedValue({} as never);
});

describe("private theme server enforcement", () => {
  it("returns the admin guard response before loading a profile", async () => {
    vi.mocked(requireTenantAdmin).mockReturnValue({
      success: false,
      response: NextResponse.json({ error: "Neautorizovan pristup" }, { status: 401 }),
    } as never);

    const response = await PUT(request("PUT", { landingTheme: "theme-9" }));

    expect(response.status).toBe(401);
    expect(SalonProfile.findOne).not.toHaveBeenCalled();
  });

  it.each(["theme-8", "theme-9"] as const)(
    "rejects manual %s assignment in PUT for an ordinary tenant",
    async (theme) => {
      const existing = profile();
      useTenantSlug("ordinary-beauty-studio");
      vi.mocked(SalonProfile.findOne).mockResolvedValue(existing as never);

      const response = await PUT(request("PUT", { landingTheme: theme }));

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        code: "THEME_NOT_AVAILABLE",
      });
      expect(existing.save).not.toHaveBeenCalled();
    },
  );

  it.each(["theme-8", "theme-9"] as const)(
    "rejects manual %s assignment in POST for an ordinary tenant",
    async (theme) => {
      useTenantSlug("ordinary-beauty-studio");

      const response = await POST(request("POST", { landingTheme: theme }));

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        code: "THEME_NOT_AVAILABLE",
      });
      expect(SalonProfile.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    { tenantSlug: LASH_ROOM, theme: "theme-8" },
    { tenantSlug: MARINA, theme: "theme-9" },
  ] as const)(
    "allows the approved tenant to select $theme through PUT",
    async ({ tenantSlug, theme }) => {
      const existing = profile();
      useTenantSlug(tenantSlug);
      vi.mocked(SalonProfile.findOne).mockResolvedValue(existing as never);

      const response = await PUT(request("PUT", { landingTheme: theme }));

      expect(response.status).toBe(200);
      expect(existing.landingTheme).toBe(theme);
      expect(existing.save).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    { tenantSlug: LASH_ROOM, theme: "theme-8" },
    { tenantSlug: MARINA, theme: "theme-9" },
  ] as const)(
    "keeps $theme during an ordinary save for its approved tenant",
    async ({ tenantSlug, theme }) => {
      const existing = profile(theme);
      useTenantSlug(tenantSlug);
      vi.mocked(SalonProfile.findOne).mockResolvedValue(existing as never);

      const response = await PUT(
        request("PUT", { landingTheme: theme, name: "Ažuriran naziv" }),
      );

      expect(response.status).toBe(200);
      expect(existing.landingTheme).toBe(theme);
      expect(existing.save).toHaveBeenCalledTimes(1);
    },
  );

  it("allows the approved tenant to create a profile with its private theme", async () => {
    useTenantSlug(MARINA);
    vi.mocked(SalonProfile.create).mockResolvedValue({ id: "profile-1" } as never);

    const response = await POST(request("POST", { landingTheme: "theme-9" }));

    expect(response.status).toBe(201);
    expect(SalonProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ landingTheme: "theme-9", tenantId: TENANT_ID }),
    );
  });

  it("keeps an approved private theme when a partial PUT omits landingTheme", async () => {
    const existing = profile("theme-9");
    vi.mocked(SalonProfile.findOne).mockResolvedValue(existing as never);

    const response = await PUT(request("PUT", { name: "Marina" }));

    expect(response.status).toBe(200);
    expect(existing.landingTheme).toBe("theme-9");
    expect(existing.save).toHaveBeenCalledTimes(1);
    expect(Tenant.findById).not.toHaveBeenCalled();
  });
});
