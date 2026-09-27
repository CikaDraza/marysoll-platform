import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireOwner = vi.fn();
const getTeamOverview = vi.fn();

vi.mock("@/lib/auth/auth-server", () => ({
  requireOwner: (...args: unknown[]) => requireOwner(...args),
}));
vi.mock("@/lib/team/overview", () => ({
  getTeamOverview: (...args: unknown[]) => getTeamOverview(...args),
}));

import { GET } from "./route";

const request = new NextRequest("https://example.test/api/team");

describe("GET /api/team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireOwner.mockResolvedValue({
      success: true,
      membership: { id: "owner-a", tenantId: "tenant-a", role: "OWNER" },
    });
    getTeamOverview.mockResolvedValue({
      plan: "kiki",
      seats: {
        used: 2,
        limit: 10,
        remaining: 8,
        unlimited: false,
        canAdd: true,
      },
      members: [],
    });
  });

  it("OWNER dobija read-model samo za tenant iz DB membership-a", async () => {
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(getTeamOverview).toHaveBeenCalledWith("tenant-a");
    await expect(response.json()).resolves.toMatchObject({
      plan: "kiki",
      seats: { used: 2, limit: 10, remaining: 8 },
    });
  });

  it("ne-owner se odbija pre čitanja članova", async () => {
    requireOwner.mockResolvedValue({
      success: false,
      response: NextResponse.json({ code: "OWNER_REQUIRED" }, { status: 403 }),
    });
    const response = await GET(request);
    expect(response.status).toBe(403);
    expect(getTeamOverview).not.toHaveBeenCalled();
  });

  it("fail-closed odbija uspešan auth bez membership-a", async () => {
    requireOwner.mockResolvedValue({ success: true, membership: null });
    const response = await GET(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "OWNER_REQUIRED",
    });
    expect(getTeamOverview).not.toHaveBeenCalled();
  });
});
