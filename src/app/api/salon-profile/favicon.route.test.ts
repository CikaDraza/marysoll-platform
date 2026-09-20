import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn(async () => {}) }));
vi.mock("@/lib/auth/auth-server", () => ({ requireTenantAdmin: vi.fn(() => ({ success: true, tenantId: "tenant-1" })) }));
vi.mock("@/models/SalonProfile", () => ({ SalonProfile: { findOne: vi.fn() } }));
vi.mock("@/models/Tenant", () => ({ Tenant: { findById: vi.fn(() => ({ select: () => ({ lean: async () => ({ slug: "ash-studio" }) }) })), updateOne: vi.fn(async () => ({})) } }));
vi.mock("@/lib/cloudinary", () => ({
  uploadToCloudinary: vi.fn(async () => "https://res.cloudinary.com/demo/image/upload/v2/icon.png"),
  uploadToCloudinaryWithMetadata: vi.fn(async () => ({ secure_url: "https://res.cloudinary.com/demo/image/upload/v2/logo.png", width: 900, height: 300 })),
  deleteFromCloudinary: vi.fn(async () => {}),
  getTenantFolder: vi.fn(async () => "salons/tenant-1"),
}));
vi.mock("@/lib/marketplace/revalidateMarketplace", () => ({ revalidateMarketplaceCaches: vi.fn(async () => {}) }));
vi.mock("@/helpers/manualSlots", () => ({ pruneAndValidateManualSlots: vi.fn((value) => value) }));
vi.mock("@/helpers/vacations", () => ({ normalizeVacations: vi.fn((value) => value ?? []) }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { SalonProfile } from "@/models/SalonProfile";
import { uploadToCloudinaryWithMetadata } from "@/lib/cloudinary";
import { revalidateTag } from "next/cache";
import { PUT } from "./update/route";

const logo = "https://res.cloudinary.com/demo/image/upload/v1/logo.png";
const custom = "https://res.cloudinary.com/demo/image/upload/v1/icon.png";
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fixture(favicon: Record<string, unknown> = { mode: "auto", version: 1 }) {
  return { tenantId: "tenant-1", name: "ASH Studio", logo, branding: { primaryColor: "#a855f7" }, favicon, phone: "111", markModified: vi.fn(), save: vi.fn(async () => {}), toObject: () => ({ landingStructure: undefined }) };
}

async function submit(profile: ReturnType<typeof fixture>, fields: Record<string, string> = {}, file?: File) {
  vi.mocked(SalonProfile.findOne).mockResolvedValue(profile as never);
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  if (file) body.set("faviconFile", file);
  return PUT(new NextRequest("https://marysoll.com/api/salon-profile/update", { method: "PUT", body }));
}

beforeEach(() => vi.clearAllMocks());

describe("favicon update contract", () => {
  it("persists monogram without a custom file", async () => {
    const p = fixture();
    const res = await submit(p, { favicon: JSON.stringify({ mode: "monogram" }) });
    expect(res.status).toBe(200);
    expect(p.favicon).toMatchObject({ mode: "monogram", version: 2 });
    expect(revalidateTag).toHaveBeenCalledWith("tenant-profile-ash-studio", { expire: 0 });
  });
  it("persists auto without a custom file", async () => {
    const p = fixture({ mode: "monogram", version: 3 });
    expect((await submit(p, { favicon: JSON.stringify({ mode: "auto" }) })).status).toBe(200);
    expect(p.favicon).toMatchObject({ mode: "auto", version: 4 });
  });
  it("uploads a custom icon and increments once", async () => {
    const p = fixture();
    const res = await submit(p, { favicon: JSON.stringify({ mode: "custom" }) }, new File([png], "icon.png", { type: "image/png" }));
    expect(res.status).toBe(200);
    expect(p.favicon).toMatchObject({ mode: "custom", version: 2, customUrl: expect.stringContaining("/v2/icon.png") });
  });
  it.each(["auto", "monogram"] as const)("removes custom and retains selected %s", async (mode) => {
    const p = fixture({ mode: "custom", customUrl: custom, version: 4 });
    const res = await submit(p, { favicon: JSON.stringify({ mode }), removeCustomFavicon: "true" });
    expect(res.status).toBe(200);
    expect(p.favicon).toMatchObject({ mode, customUrl: null, version: 5 });
  });
  it("normalizes custom with removed asset to auto", async () => {
    const p = fixture({ mode: "custom", customUrl: custom, version: 1 });
    await submit(p, { favicon: JSON.stringify({ mode: "custom" }), removeCustomFavicon: "true" });
    expect(p.favicon).toMatchObject({ mode: "auto", customUrl: null });
  });
  it.each([
    { favicon: JSON.stringify({ mode: "wrong" }) },
    { favicon: JSON.stringify({ mode: "monogram", backgroundColor: "red;url(javascript:1)" }) },
    { favicon: JSON.stringify({ mode: "auto", customUrl: "https://evil.test/x.png" }) },
  ])("rejects invalid favicon settings before saving", async (fields) => {
    const p = fixture();
    expect((await submit(p, fields)).status).toBe(400);
    expect(p.save).not.toHaveBeenCalled();
  });
  it("rejects spoofed image content", async () => {
    const p = fixture();
    expect((await submit(p, {}, new File(["bad"], "icon.png", { type: "image/png" }))).status).toBe(400);
    expect(p.save).not.toHaveBeenCalled();
  });
  it("does not version or invalidate for phone and unrelated fields", async () => {
    const p = fixture();
    expect((await submit(p, { phone: "222", description: "Updated" })).status).toBe(200);
    expect(p.favicon.version).toBe(1);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
  it("versions logo replacement once and stores authoritative dimensions", async () => {
    const p = fixture();
    vi.mocked(SalonProfile.findOne).mockResolvedValue(p as never);
    const body = new FormData();
    body.set("logo", new File([png], "logo.png", { type: "image/png" }));
    const res = await PUT(new NextRequest("https://marysoll.com/api/salon-profile/update", { method: "PUT", body }));
    expect(res.status).toBe(200);
    expect(uploadToCloudinaryWithMetadata).toHaveBeenCalled();
    expect(p.favicon).toMatchObject({ sourceWidth: 900, sourceHeight: 300, sourceRatio: 3, version: 2 });
  });
  it("versions a color change once", async () => {
    const p = fixture({ mode: "monogram", version: 1 });
    await submit(p, { favicon: JSON.stringify({ mode: "monogram", backgroundColor: "#111111" }) });
    expect(p.favicon.version).toBe(2);
  });
  it("keeps version when editing invisible colors or removing an unselected asset", async () => {
    const p = fixture({ mode: "auto", customUrl: custom, version: 8 });
    await submit(p, { favicon: JSON.stringify({ mode: "auto", backgroundColor: "#111111" }), removeCustomFavicon: "true" });
    expect(p.favicon).toMatchObject({ mode: "auto", customUrl: null, version: 8 });
    expect(revalidateTag).not.toHaveBeenCalled();
  });
  it("keeps version when replacing the main logo while custom favicon is selected", async () => {
    const p = fixture({ mode: "custom", customUrl: custom, version: 8 });
    vi.mocked(SalonProfile.findOne).mockResolvedValue(p as never);
    const body = new FormData();
    body.set("logo", new File([png], "logo.png", { type: "image/png" }));
    const res = await PUT(new NextRequest("https://marysoll.com/api/salon-profile/update", { method: "PUT", body }));
    expect(res.status).toBe(200);
    expect(p.favicon.version).toBe(8);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
  it("removes the main logo and resets source metadata once", async () => {
    const p = fixture({ mode: "auto", sourceRatio: 3, sourceWidth: 900, sourceHeight: 300, version: 2 });
    await submit(p, { removeLogo: "true" });
    expect(p.logo).toBeNull();
    expect(p.favicon).toMatchObject({ sourceRatio: null, sourceWidth: null, sourceHeight: null, version: 3 });
  });
});
