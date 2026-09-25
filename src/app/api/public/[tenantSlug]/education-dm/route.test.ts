import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Types } from "mongoose";

vi.mock("@/lib/db/mongodb", () => ({ connectToDB: vi.fn() }));
vi.mock("@/models/Tenant", () => ({ Tenant: { findOne: vi.fn() } }));
vi.mock("@/models/SalonProfile", () => ({ SalonProfile: { findOne: vi.fn() } }));
vi.mock("@/models/Theme8LandingEvent", () => ({ Theme8LandingEvent: { create: vi.fn() } }));

import { Tenant } from "@/models/Tenant";
import { SalonProfile } from "@/models/SalonProfile";
import { Theme8LandingEvent } from "@/models/Theme8LandingEvent";
import { POST } from "./route";

const tenantId = new Types.ObjectId("507f1f77bcf86cd799439011");
const params = { params: Promise.resolve({ tenantSlug: "the-lash-room-by-anja" }) };

describe("education DM click redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Tenant.findOne).mockReturnValue({ select: () => ({ lean: async () => ({ _id: tenantId }) }) } as never);
    vi.mocked(SalonProfile.findOne).mockReturnValue({ select: () => ({ lean: async () => ({
      landingStructure: { marketingBanners: [{
        id: "education", enabled: true,
        cta: { enabled: true, destination: { type: "custom", url: "https://ig.me/m/lashroom_byanja" } },
      }] },
    }) }) } as never);
    vi.mocked(Theme8LandingEvent.create).mockResolvedValue({} as never);
  });

  it("saves education_dm_clicked before redirecting to the configured DM", async () => {
    const response = await POST(new NextRequest("http://localhost/api/public/the-lash-room-by-anja/education-dm", { method: "POST" }), params);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://ig.me/m/lashroom_byanja");
    expect(Theme8LandingEvent.create).toHaveBeenCalledWith({
      tenantId, eventName: "education_dm_clicked", bannerId: "education",
    });
  });

  it("does not redirect if the click cannot be saved", async () => {
    vi.mocked(Theme8LandingEvent.create).mockRejectedValue(new Error("database unavailable"));
    const response = await POST(new NextRequest("http://localhost/api/public/the-lash-room-by-anja/education-dm", { method: "POST" }), params);
    expect(response.status).toBe(503);
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not record clicks if the CMS education CTA is disabled", async () => {
    vi.mocked(SalonProfile.findOne).mockReturnValue({ select: () => ({ lean: async () => ({
      landingStructure: { marketingBanners: [{ id: "education", enabled: false }] },
    }) }) } as never);
    const response = await POST(new NextRequest("http://localhost/api/public/the-lash-room-by-anja/education-dm", { method: "POST" }), params);
    expect(response.status).toBe(404);
    expect(Theme8LandingEvent.create).not.toHaveBeenCalled();
  });
});
